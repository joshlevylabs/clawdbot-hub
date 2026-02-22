import { NextRequest, NextResponse } from 'next/server';
import { faithSupabase, isFaithSupabaseConfigured } from '@/lib/faith-supabase';

const JOSHUA_USER_ID = '2255450f-a3c8-4006-9aef-4bfc4afcda61';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/faith/guide/conversations
 * Returns list of guide conversations for the user, with lesson topic joined.
 */
export async function GET(request: NextRequest) {
  if (!isFaithSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500, headers: corsHeaders });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const { data, error } = await faithSupabase
    .from('faith_guide_conversations')
    .select('id, lesson_id, messages, selected_perspectives, committed_tradition_id, status, created_at, updated_at, lesson:faith_lessons(topic, date, scripture_ref)')
    .eq('user_id', JOSHUA_USER_ID)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }

  // Get total count
  const { count } = await faithSupabase
    .from('faith_guide_conversations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', JOSHUA_USER_ID);

  const conversations = (data || []).map((c: any) => ({
    id: c.id,
    lesson_id: c.lesson_id,
    lesson_topic: c.lesson?.topic || 'Unknown Topic',
    lesson_date: c.lesson?.date || null,
    scripture_ref: c.lesson?.scripture_ref || null,
    message_count: Array.isArray(c.messages) ? c.messages.length : 0,
    status: c.status,
    created_at: c.created_at,
    updated_at: c.updated_at,
  }));

  return NextResponse.json({
    conversations,
    total: count || 0,
  }, { headers: corsHeaders });
}
