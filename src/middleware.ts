import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secretKey = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'clawdbot-hub-secret-key-change-me'
);

const AUTH_COOKIE = 'clawdbot-auth';
const TV_AUTH_COOKIE = 'clawdbot-tv-auth';

// Routes that don't require authentication
const publicPaths = ['/login', '/tv-login', '/auth/recovery', '/api/auth/login', '/api/auth/tv-login', '/api/auth/logout', '/api/markets', '/api/price-history', '/api/faith/'];

// API routes accessible with TV or Hub scope (TV dashboard needs these)
const tvApiPaths = ['/api/trading/'];

// Static assets that should always be accessible
const staticPaths = ['/_next', '/favicon.ico', '/data/', '/audio/'];

// TV routes — accessible with either hub or tv scope
const tvPaths = ['/tv'];

async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return (payload.scope as string) || 'hub';
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets
  if (staticPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow public paths
  if (publicPaths.some(path => pathname === path || pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check if this is a TV route or TV-accessible API
  const isTvApiRoute = tvApiPaths.some(path => pathname.startsWith(path));
  const isTvRoute = tvPaths.some(path => pathname === path || pathname.startsWith(path + '/')) || isTvApiRoute;

  if (isTvRoute) {
    // TV routes accept either TV token or Hub token
    const tvToken = request.cookies.get(TV_AUTH_COOKIE)?.value;
    const hubToken = request.cookies.get(AUTH_COOKIE)?.value;

    // Try TV token first
    if (tvToken) {
      const scope = await verifyToken(tvToken);
      if (scope === 'tv' || scope === 'hub') return NextResponse.next();
    }
    // Fall back to Hub token (hub users can see everything)
    if (hubToken) {
      const scope = await verifyToken(hubToken);
      if (scope === 'hub') return NextResponse.next();
    }

    // No valid token, redirect to TV login
    const loginUrl = new URL('/tv-login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Hub routes — require hub scope
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  const scope = await verifyToken(token);

  if (!scope) {
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(AUTH_COOKIE);
    return response;
  }

  // TV-only tokens can't access the full Hub
  if (scope === 'tv') {
    const tvUrl = new URL('/tv', request.url);
    return NextResponse.redirect(tvUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
