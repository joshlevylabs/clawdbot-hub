import { NextRequest, NextResponse } from 'next/server';
import { faithSupabase, isFaithSupabaseConfigured } from '@/lib/faith-supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// OPTIONS: CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// GET: Fetch all guides, optionally filtered by tradition (public — no auth required)
export async function GET(request: NextRequest) {
  if (!isFaithSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500, headers: corsHeaders });
  }

  try {
    const { searchParams } = new URL(request.url);
    const tradition = searchParams.get('tradition');

    let query = faithSupabase
      .from('faith_guides')
      .select(`
        id,
        tradition_slug,
        name,
        display_name,
        avatar_emoji,
        personality_traits,
        tradition_knowledge,
        created_at
      `)
      .order('tradition_slug');

    // Apply tradition filter if specified
    if (tradition) {
      query = query.eq('tradition_slug', tradition.toLowerCase());
    }

    const { data: guides, error } = await query;

    if (error) {
      console.error('Failed to fetch guides:', error);
      return NextResponse.json({ error: 'Failed to fetch guides' }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({
      guides: guides || []
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Faith guides API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}