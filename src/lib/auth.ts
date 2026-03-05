import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const secretKey = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'clawdbot-hub-secret-key-change-me'
);

const AUTH_COOKIE = 'clawdbot-auth';

export type AuthScope = 'admin' | 'tv';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  scope: AuthScope;
}

// User registry — credentials from env vars
function getUsers(): { email: string; password: string; user: AuthUser }[] {
  return [
    {
      email: (process.env.ADMIN_EMAIL || 'joshua@joshlevylabs.com').toLowerCase(),
      password: process.env.ADMIN_PASSWORD || '',
      user: {
        id: 'joshua',
        name: 'Joshua',
        email: (process.env.ADMIN_EMAIL || 'joshua@joshlevylabs.com').toLowerCase(),
        scope: 'admin',
      },
    },
    {
      email: (process.env.TV_USER_EMAIL || '').toLowerCase(),
      password: process.env.TV_USER_PASSWORD || '',
      user: {
        id: 'aaron',
        name: 'Aaron',
        email: (process.env.TV_USER_EMAIL || '').toLowerCase(),
        scope: 'tv',
      },
    },
  ];
}

export function authenticateUser(email: string, password: string): AuthUser | null {
  if (!email || !password) return null;
  const normalizedEmail = email.toLowerCase().trim();
  
  const users = getUsers();
  const match = users.find(
    (u) => u.email && u.password && u.email === normalizedEmail && u.password === password
  );
  
  return match?.user || null;
}

export async function createSession(user: AuthUser) {
  const token = await new SignJWT({
    userId: user.id,
    name: user.name,
    email: user.email,
    scope: user.scope,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);

  return token;
}

export async function verifySession(token: string): Promise<{ valid: boolean; scope?: AuthScope; userId?: string }> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return {
      valid: true,
      scope: payload.scope as AuthScope,
      userId: payload.userId as string,
    };
  } catch {
    return { valid: false };
  }
}

export async function getSession(): Promise<{ authenticated: boolean; scope?: AuthScope; userId?: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return { authenticated: false };
  const result = await verifySession(token);
  return { authenticated: result.valid, scope: result.scope, userId: result.userId };
}

export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return false;
  const result = await verifySession(token);
  return result.valid;
}

// Legacy compat — used by some API routes
export async function getSessionAny(): Promise<boolean> {
  const session = await getSession();
  return session.authenticated;
}
