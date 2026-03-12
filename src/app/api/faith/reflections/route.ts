import { NextRequest, NextResponse } from 'next/server';
import { faithSupabase, isFaithSupabaseConfigured } from '@/lib/faith-supabase';
import { getSession } from '@/lib/auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// OPTIONS: CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// GET: Fetch user's reflections
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
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const userId = session.userId;

    const { data: reflections, error } = await faithSupabase
      .from('faith_reflections')
      .select(`
        id,
        reflection_date,
        content,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .order('reflection_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Failed to fetch reflections:', error);
      return NextResponse.json({ error: 'Failed to fetch reflections' }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({
      reflections: reflections || []
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Faith reflections GET API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}

// POST: Save a reflection
export async function POST(request: NextRequest) {
  if (!isFaithSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500, headers: corsHeaders });
  }

  // Check authentication
  const session = await getSession();
  if (!session.authenticated || !session.userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { date, content } = body;
    const userId = session.userId;

    if (!date || !content) {
      return NextResponse.json({ error: 'date and content are required' }, { status: 400, headers: corsHeaders });
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'date must be in YYYY-MM-DD format' }, { status: 400, headers: corsHeaders });
    }

    if (typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'content must be a non-empty string' }, { status: 400, headers: corsHeaders });
    }

    // Upsert the reflection (insert or update if exists for this date)
    const { data: reflection, error } = await faithSupabase
      .from('faith_reflections')
      .upsert({
        user_id: userId,
        reflection_date: date,
        content: content.trim(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,reflection_date'
      })
      .select('id, reflection_date, content, created_at, updated_at')
      .single();

    if (error) {
      console.error('Failed to save reflection:', error);
      return NextResponse.json({ error: 'Failed to save reflection' }, { status: 500, headers: corsHeaders });
    }

    // Log engagement
    await faithSupabase
      .from('faith_engagement_log')
      .insert({
        user_id: userId,
        event_type: 'reflection_write',
        event_data: {
          reflection_date: date,
          content_length: content.trim().length
        }
      });

    return NextResponse.json({
      reflection
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Faith reflections POST API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}