import { NextRequest, NextResponse } from 'next/server';
import { faithSupabase, isFaithSupabaseConfigured } from '@/lib/faith-supabase';
import { getSession } from '@/lib/auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// OPTIONS: CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// GET: Fetch user's conversations with guide info
export async function GET(request: NextRequest) {
  if (!isFaithSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500, headers: corsHeaders });
  }

  // Check authentication
  const session = await getSession();
  if (!session.authenticated || !session.userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  try {
    const { searchParams } = new URL(request.url);
    const guideId = searchParams.get('guideId');
    const userId = session.userId;

    let query = faithSupabase
      .from('faith_conversations')
      .select(`
        id,
        guide_id,
        title,
        created_at,
        updated_at,
        guide:faith_guides (
          id,
          name,
          display_name,
          avatar_emoji,
          tradition_slug
        )
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    // Apply guide filter if specified
    if (guideId) {
      query = query.eq('guide_id', guideId);
    }

    const { data: conversations, error } = await query;

    if (error) {
      console.error('Failed to fetch conversations:', error);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({
      conversations: conversations || []
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Faith conversations API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}