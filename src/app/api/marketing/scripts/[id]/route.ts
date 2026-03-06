import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function supabaseFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  return res;
}

// GET /api/marketing/scripts/[id] — fetch script
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const res = await supabaseFetch(`podcast_scripts?id=eq.${id}&select=*`);
    const data = await res.json();

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: data[0].id,
      episodeNumber: data[0].episode_number,
      title: data[0].title,
      script: data[0].script,
      updatedAt: data[0].updated_at,
    });
  } catch (error) {
    console.error('Failed to fetch script:', error);
    return NextResponse.json({ error: 'Failed to fetch script' }, { status: 500 });
  }
}

// PUT /api/marketing/scripts/[id] — update script
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const body = await request.json();
    const { script, title } = body;

    if (!script) {
      return NextResponse.json({ error: 'Script content required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      script,
      updated_at: new Date().toISOString(),
    };
    if (title) updateData.title = title;

    const res = await supabaseFetch(`podcast_scripts?id=eq.${id}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify(updateData),
    });

    const data = await res.json();

    if (!data || data.length === 0) {
      // Script doesn't exist yet — create it
      const episodeNumber = parseInt(id, 10) || 0;
      const createRes = await supabaseFetch('podcast_scripts', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify({
          id,
          episode_number: episodeNumber,
          title: title || `Episode ${episodeNumber}`,
          script,
        }),
      });
      const created = await createRes.json();
      return NextResponse.json({
        success: true,
        id,
        updatedAt: created[0]?.updated_at,
      });
    }

    return NextResponse.json({
      success: true,
      id,
      updatedAt: data[0]?.updated_at,
    });
  } catch (error) {
    console.error('Failed to save script:', error);
    return NextResponse.json({ error: 'Failed to save script' }, { status: 500 });
  }
}
