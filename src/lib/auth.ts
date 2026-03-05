import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

const secretKey = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'clawdbot-hub-secret-key-change-me'
);

const AUTH_COOKIE = 'clawdbot-auth';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export type AuthScope = 'admin' | 'tv';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  scope: AuthScope;
}

// --- Password hashing ---
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, s, 100000, 64, 'sha512').toString('hex');
  return { hash: `${s}:${hash}`, salt: s };
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const verify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === verify;
}

// --- Supabase helpers ---
async function supabaseQuery(table: string, params: string): Promise<any> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function supabaseUpdate(table: string, id: string, data: Record<string, any>): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// --- User authentication ---
// Checks Supabase first (for updated passwords), falls back to env vars
export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  if (!email || !password) return null;
  const normalizedEmail = email.toLowerCase().trim();

  // Try Supabase first
  const rows = await supabaseQuery('hub_users', `email=eq.${encodeURIComponent(normalizedEmail)}&select=*`);
  if (rows && rows.length > 0) {
    const dbUser = rows[0];
    
    // If password_hash exists in DB, use it (password was changed via reset)
    if (dbUser.password_hash) {
      if (verifyPassword(password, dbUser.password_hash)) {
        return { id: dbUser.id, name: dbUser.name, email: dbUser.email, scope: dbUser.scope as AuthScope };
      }
      return null; // DB password exists but doesn't match
    }
    
    // No DB password — fall through to env var check
  }

  // Env var fallback
  const envUsers = [
    {
      email: (process.env.ADMIN_EMAIL || '').toLowerCase(),
      password: process.env.ADMIN_PASSWORD || '',
      user: { id: 'joshua', name: 'Joshua', email: (process.env.ADMIN_EMAIL || '').toLowerCase(), scope: 'admin' as AuthScope },
    },
    {
      email: (process.env.TV_USER_EMAIL || '').toLowerCase(),
      password: process.env.TV_USER_PASSWORD || '',
      user: { id: 'aaron', name: 'Aaron', email: (process.env.TV_USER_EMAIL || '').toLowerCase(), scope: 'tv' as AuthScope },
    },
  ];

  const match = envUsers.find(u => u.email && u.password && u.email === normalizedEmail && u.password === password);
  return match?.user || null;
}

// --- Password reset ---
export async function generateResetToken(email: string): Promise<string | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const rows = await supabaseQuery('hub_users', `email=eq.${encodeURIComponent(normalizedEmail)}&select=id,email,name`);
  
  if (!rows || rows.length === 0) return null;

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  const updated = await supabaseUpdate('hub_users', rows[0].id, {
    reset_token: token,
    reset_token_expires: expires,
  });

  return updated ? token : null;
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const rows = await supabaseQuery('hub_users', `reset_token=eq.${token}&select=*`);
  
  if (!rows || rows.length === 0) return false;
  
  const user = rows[0];
  if (new Date(user.reset_token_expires) < new Date()) return false; // Expired

  const { hash } = hashPassword(newPassword);

  return supabaseUpdate('hub_users', user.id, {
    password_hash: hash,
    reset_token: null,
    reset_token_expires: null,
    updated_at: new Date().toISOString(),
  });
}

// --- Session management ---
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

export async function getSessionAny(): Promise<boolean> {
  const session = await getSession();
  return session.authenticated;
}
