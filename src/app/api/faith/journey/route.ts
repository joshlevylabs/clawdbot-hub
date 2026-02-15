import { NextResponse } from 'next/server';
import { faithSupabase, isFaithSupabaseConfigured } from '@/lib/faith-supabase';

const JOSHUA_USER_ID = '2255450f-a3c8-4006-9aef-4bfc4afcda61';

export async function GET(request: Request) {
  if (!isFaithSupabaseConfigured()) {
    return NextResponse.json({ error: 'Faith Supabase not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const tradition = searchParams.get('tradition');
  const dimension = searchParams.get('dimension');
  const offset = (page - 1) * limit;

  let query = faithSupabase
    .from('faith_responses')
    .select(`
      *,
      lesson:faith_lessons(*),
      tradition:faith_traditions(*)
    `)
    .eq('user_id', JOSHUA_USER_ID)
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (tradition) {
    query = query.eq('selected_tradition_id', tradition);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If filtering by dimension, filter in memory (dimensions is an array on lesson)
  let filtered = data || [];
  if (dimension && filtered.length > 0) {
    filtered = filtered.filter((r: any) =>
      r.lesson?.dimensions?.includes(dimension)
    );
  }

  // Get total count for pagination
  const { count } = await faithSupabase
    .from('faith_responses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', JOSHUA_USER_ID);

  return NextResponse.json({
    responses: filtered,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  });
}
