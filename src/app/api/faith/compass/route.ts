import { NextResponse } from 'next/server';
import { faithSupabase, isFaithSupabaseConfigured } from '@/lib/faith-supabase';

// Hard-coded user_id for Joshua (single-user app, no auth needed)
const JOSHUA_USER_ID = '00000000-0000-0000-0000-000000000001';

export async function GET() {
  if (!isFaithSupabaseConfigured()) {
    return NextResponse.json({ error: 'Faith Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await faithSupabase
    .from('faith_compass_state')
    .select('*')
    .eq('user_id', JOSHUA_USER_ID)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows, which is fine for first-time
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return compass state or a default empty state
  const compassState = data || {
    dimension_scores: {},
    primary_alignment: null,
    secondary_alignment: null,
    alignment_confidence: null,
    total_responses: 0,
    streak_days: 0,
    last_response_date: null,
  };

  return NextResponse.json(compassState);
}
