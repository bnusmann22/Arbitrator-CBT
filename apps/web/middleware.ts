/**
 * middleware.ts — Edge Middleware (Next.js)
 * ─────────────────────────────────────────────────────────────────
 * Runs at the edge before every matching request.
 * Verifies the JWT in the `auth_token` httpOnly cookie and enforces
 * role-based access to protected routes.
 *
 * Protected routes:
 *   /exam/*            → requires role: candidate
 *   /dashboard/*       → requires role: admin
 *   /questions/*       → requires role: admin
 *   /candidates/*      → requires role: admin
 *   /results/*         → requires role: admin
 *
 * On failure: redirects to the appropriate login page.
 * ─────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, type JWTPayload } from 'jose';

// ── Config ────────────────────────────────────────────────────────────────────

const COOKIE_NAME = 'auth_token';

/** Routes that require a logged-in candidate */
const CANDIDATE_ROUTES = ['/exam'];

/** Routes that require a logged-in admin */
const ADMIN_ROUTES = ['/dashboard', '/questions', '/candidates', '/results', '/admin/dashboard'];

/** Public routes — always accessible */
const PUBLIC_ROUTES = ['/login', '/admin/login', '/', '/api'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set.');
  }
  return new TextEncoder().encode(secret);
}

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

interface TokenPayload extends JWTPayload {
  sub: string;
  email: string;
  name: string;
  role: 'admin' | 'candidate';
}

async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

// ── Middleware ────────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Skip Next.js internals and static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const isAdminRoute = matchesPrefix(pathname, ADMIN_ROUTES);
  const isCandidateRoute = matchesPrefix(pathname, CANDIDATE_ROUTES);

  // Public routes — no auth required
  if (!isAdminRoute && !isCandidateRoute) {
    return NextResponse.next();
  }

  // Extract JWT from cookie
  const tokenCookie = request.cookies.get(COOKIE_NAME);
  const token = tokenCookie?.value;

  if (!token) {
    // No token → redirect to appropriate login
    const loginUrl = isAdminRoute
      ? new URL('/admin/login', request.url)
      : new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify token
  const payload = await verifyToken(token);

  if (!payload) {
    // Invalid / expired token → clear cookie and redirect
    const loginUrl = isAdminRoute
      ? new URL('/admin/login', request.url)
      : new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  // Role enforcement
  if (isAdminRoute && payload.role !== 'admin') {
    // Candidate trying to reach admin routes → send to their login
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  if (isCandidateRoute && payload.role !== 'candidate') {
    // Admin trying to reach candidate exam → send to candidate login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Attach user info to request headers for use in Server Components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.sub);
  requestHeaders.set('x-user-role', payload.role);
  requestHeaders.set('x-user-email', payload.email);
  requestHeaders.set('x-user-name', payload.name);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

// ── Matcher ───────────────────────────────────────────────────────────────────
// Only run middleware on routes that might need auth (skip static files, API)

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - files with extensions (js, css, png, etc.)
     * - /api routes (handled by NestJS, not Next.js)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)',
  ],
};
