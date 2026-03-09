import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secretKey = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'clawdbot-hub-secret-key-change-me'
);

const AUTH_COOKIE = 'clawdbot-auth';

// Routes that don't require authentication
const publicPaths = ['/login', '/forgot-password', '/reset-password', '/api/auth/', '/api/markets', '/api/price-history', '/api/faith/', '/api/agents', '/api/trading/signals', '/legal'];

// Static assets that should always be accessible
const staticPaths = ['/_next', '/favicon.ico', '/data/', '/audio/'];

// TV routes — accessible with tv or admin scope
const tvPaths = ['/tv', '/trading'];

// TV-accessible API routes
const tvApiPaths = ['/api/trading/', '/api/paper-trading', '/api/real-time-trading', '/api/alpaca-validation'];

async function getTokenScope(token: string): Promise<{ scope: string; userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return {
      scope: (payload.scope as string) || 'admin',
      userId: (payload.userId as string) || '',
    };
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

  // Get auth token
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const auth = await getTokenScope(token);

  if (!auth) {
    // Invalid token — clear it and redirect to login
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.json({ error: 'Unauthorized — invalid token' }, { status: 401 });
      response.cookies.delete(AUTH_COOKIE);
      return response;
    }
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete(AUTH_COOKIE);
    return response;
  }

  const { scope } = auth;

  // Admin scope — full access to everything
  if (scope === 'admin') {
    return NextResponse.next();
  }

  // TV scope — only /tv routes and tv API paths
  if (scope === 'tv') {
    const isTvRoute = tvPaths.some(path => pathname === path || pathname.startsWith(path + '/'));
    const isTvApi = tvApiPaths.some(path => pathname.startsWith(path));

    if (isTvRoute || isTvApi) {
      return NextResponse.next();
    }

    // TV user trying to access non-TV route → redirect to /tv
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Access restricted to TV dashboard' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/tv', request.url));
  }

  // Unknown scope — deny
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
