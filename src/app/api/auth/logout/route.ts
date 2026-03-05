import { NextResponse } from 'next/server';

export async function GET() {
  const response = NextResponse.redirect(new URL('/login', 'https://joshos-hub.vercel.app'));
  response.cookies.set('clawdbot-auth', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  // Clear legacy TV cookie if it exists
  response.cookies.set('clawdbot-tv-auth', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
