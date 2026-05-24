/**
 * /api/proxy/[...path] — General API proxy for Next.js → Railway
 * ───────────────────────────────────────────────────────────────
 * All authenticated API calls from the browser are routed through
 * this proxy so they remain same-origin (Vercel domain).
 *
 * - Reads auth_token from the Vercel-domain cookie set at login.
 * - Forwards it to Railway as a Cookie header (server-to-server).
 * - Forwards request body verbatim (supports JSON + multipart/form-data).
 * - On logout (path === auth/logout), also clears the local cookie.
 */

import { NextRequest, NextResponse } from 'next/server';

const RAILWAY_BASE = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'
).replace(/\/+$/, '');

const COOKIE_NAME = 'auth_token';

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await params;
  const pathStr = path.join('/');

  // Build the target URL
  const { searchParams } = request.nextUrl;
  const queryString = searchParams.toString();
  const targetUrl = `${RAILWAY_BASE}/${pathStr}${queryString ? `?${queryString}` : ''}`;

  // Read the Vercel-domain auth cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;

  // Build forwarded headers
  const headers: Record<string, string> = {};
  const contentType = request.headers.get('content-type');
  if (contentType) headers['Content-Type'] = contentType;
  if (token) headers['Cookie'] = `${COOKIE_NAME}=${token}`;

  // Forward the body as raw bytes to support JSON, multipart, etc.
  let body: ArrayBuffer | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.arrayBuffer();
  }

  // Forward to Railway
  let railwayRes: Response;
  try {
    railwayRes = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    });
  } catch {
    return NextResponse.json(
      { message: 'Unable to reach the API server. Please try again.' },
      { status: 502 },
    );
  }

  // Build the response
  const resContentType = railwayRes.headers.get('content-type') ?? '';
  let response: NextResponse;

  if (resContentType.includes('application/json')) {
    const data: unknown = await railwayRes.json();
    response = NextResponse.json(data, { status: railwayRes.status });
  } else {
    // Binary (PDF, etc.) or plain text
    const blob = await railwayRes.blob();
    response = new NextResponse(blob, {
      status: railwayRes.status,
      headers: { 'Content-Type': resContentType || 'application/octet-stream' },
    });
  }

  // Clear local cookie when logging out
  if (pathStr === 'auth/logout' && railwayRes.ok) {
    response.cookies.delete(COOKIE_NAME);
  }

  return response;
}

// Export one handler per method
export const GET = (
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) => proxyRequest(req, ctx);

export const POST = (
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) => proxyRequest(req, ctx);

export const PUT = (
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) => proxyRequest(req, ctx);

export const PATCH = (
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) => proxyRequest(req, ctx);

export const DELETE = (
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) => proxyRequest(req, ctx);
