/**
 * /api/auth/[type] — Login proxy for Next.js → Railway
 * ──────────────────────────────────────────────────────
 * Proxies login requests from the browser to the Railway API, then
 * re-sets the auth_token cookie on the Vercel (same-origin) domain so
 * that the Edge Middleware can read it for route protection.
 *
 * Routes handled:
 *   POST /api/auth/admin      → POST ${RAILWAY}/auth/admin/login
 *   POST /api/auth/candidate  → POST ${RAILWAY}/auth/candidate/login
 */

import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_BASE = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
).replace(/\/+$/, '');

const COOKIE_NAME = 'auth_token';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> },
): Promise<NextResponse> {
  const { type } = await params;

  if (type !== 'admin' && type !== 'candidate') {
    return NextResponse.json({ message: 'Unknown auth type.' }, { status: 404 });
  }

  const endpoint =
    type === 'admin'
      ? `${RAILWAY_BASE}/auth/admin/login`
      : `${RAILWAY_BASE}/auth/candidate/login`;

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 });
  }

  // Forward to Railway (server-to-server, no CORS involved)
  let railwayRes: Response;
  try {
    railwayRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json(
      { message: 'Unable to reach the authentication server. Please try again.' },
      { status: 502 },
    );
  }

  const data: unknown = await railwayRes.json().catch(() => ({}));

  if (!railwayRes.ok) {
    return NextResponse.json(data, { status: railwayRes.status });
  }

  // Extract the JWT from Railway's Set-Cookie header
  const setCookieHeader = railwayRes.headers.get('set-cookie') ?? '';
  const jwtMatch = setCookieHeader.match(/auth_token=([^;]+)/);
  const jwt = jwtMatch?.[1] ?? null;

  // Build the success response
  const response = NextResponse.json(data, { status: 200 });

  if (jwt) {
    // Set the cookie on the Vercel (same-origin) domain.
    // SameSite=Lax is fine here — the browser is sending to its own origin.
    const isProduction = process.env.NODE_ENV === 'production';
    const maxAge = Number(process.env.JWT_EXPIRATION ?? 3600);

    response.cookies.set(COOKIE_NAME, jwt, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge,
      path: '/',
    });
  }

  return response;
}
