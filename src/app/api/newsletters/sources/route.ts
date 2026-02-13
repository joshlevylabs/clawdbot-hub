import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { CONTENT_SOURCES } from '@/lib/newsletter-sources';

// GET /api/newsletters/sources — List all available content sources
export async function GET(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ sources: CONTENT_SOURCES });
}
