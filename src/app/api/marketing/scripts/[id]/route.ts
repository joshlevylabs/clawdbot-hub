import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// GET /api/marketing/scripts/[id] — fetch script from Supabase
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/podcast_scripts?id=eq.${id}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        cache: 'no-store',
      }
    );
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

// PUT /api/marketing/scripts/[id] — save script to Supabase (upsert)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const body = await request.json();
    const { script, title } = body;

    if (typeof script !== 'string') {
      return NextResponse.json({ error: 'Script content required' }, { status: 400 });
    }

    const episodeNumber = parseInt(id, 10) || 0;

    // Upsert: insert or update on conflict
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/podcast_scripts?on_conflict=id`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify({
          id,
          episode_number: episodeNumber,
          title: title || `Episode ${episodeNumber}`,
          script,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error('Supabase upsert error:', errText);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    const data = await res.json();

    return NextResponse.json({
      success: true,
      id,
      updatedAt: data[0]?.updated_at || new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to save script:', error);
    return NextResponse.json({ error: 'Failed to save script' }, { status: 500 });
  }
}
