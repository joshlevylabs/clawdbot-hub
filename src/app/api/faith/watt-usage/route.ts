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
 * GET /api/faith/watt-usage
 * Returns recent watt usage history for the user.
 */
export async function GET(request: NextRequest) {
  if (!isFaithSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500, headers: corsHeaders });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);

  const { data, error } = await faithSupabase
    .from('watt_usage')
    .select('id, watts_used, action, feature, input_tokens, output_tokens, model, api_cost_usd, description, created_at')
    .eq('user_id', JOSHUA_USER_ID)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }

  // Get total count for "view all" indicator
  const { count } = await faithSupabase
    .from('watt_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', JOSHUA_USER_ID);

  return NextResponse.json({
    usage: data || [],
    total: count || 0,
    hasMore: (count || 0) > limit,
  }, { headers: corsHeaders });
}
