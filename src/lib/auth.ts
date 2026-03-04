import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const secretKey = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'clawdbot-hub-secret-key-change-me'
);

const AUTH_COOKIE = 'clawdbot-auth';
const TV_AUTH_COOKIE = 'clawdbot-tv-auth';

export type AuthScope = 'hub' | 'tv';

export async function createSession(scope: AuthScope = 'hub') {
  const token = await new SignJWT({ authenticated: true, scope })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);
  
  return token;
}

export async function verifySession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, secretKey);
    return true;
  } catch {
    return false;
  }
}

export async function getSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return false;
  return verifySession(token);
}

/**
 * Check if request has any valid auth (hub OR tv scope).
 * Use this for API routes that should be accessible from the TV dashboard.
 */
export async function getSessionAny(): Promise<boolean> {
  const cookieStore = await cookies();
  // Check hub cookie first
  const hubToken = cookieStore.get(AUTH_COOKIE)?.value;
  if (hubToken && await verifySession(hubToken)) return true;
  // Check TV cookie
  const tvToken = cookieStore.get(TV_AUTH_COOKIE)?.value;
  if (tvToken && await verifySession(tvToken)) return true;
  return false;
}

export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return false;
  return verifySession(token);
}

export function validatePassword(password: string, scope: AuthScope = 'hub'): boolean {
  if (scope === 'tv') {
    const tvPassword = process.env.TV_PASSWORD;
    if (!tvPassword) {
      console.error('TV_PASSWORD environment variable not set!');
      return false;
    }
    return password === tvPassword;
  }
  const correctPassword = process.env.AUTH_PASSWORD;
  if (!correctPassword) {
    console.error('AUTH_PASSWORD environment variable not set!');
    return false;
  }
  return password === correctPassword;
}

export async function getSessionScope(token: string): Promise<AuthScope | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return (payload.scope as AuthScope) || 'hub';
  } catch {
    return null;
  }
}
