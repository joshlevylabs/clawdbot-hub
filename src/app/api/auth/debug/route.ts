import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasAdminEmail: !!process.env.ADMIN_EMAIL,
    adminEmailPrefix: (process.env.ADMIN_EMAIL || '').substring(0, 4),
    hasAdminPassword: !!process.env.ADMIN_PASSWORD,
    adminPasswordLen: (process.env.ADMIN_PASSWORD || '').length,
    hasTvEmail: !!process.env.TV_USER_EMAIL,
    hasTvPassword: !!process.env.TV_USER_PASSWORD,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
