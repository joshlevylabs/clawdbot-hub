import { NextResponse } from 'next/server';
import { faithSupabase, isFaithSupabaseConfigured } from '@/lib/faith-supabase';
import { generatePrayer } from '@/lib/prayer-templates';

const JOSHUA_USER_ID = '00000000-0000-0000-0000-000000000001';

function getTodayPT(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

export async function GET(request: Request) {
  if (!isFaithSupabaseConfigured()) {
    return NextResponse.json({ error: 'Faith Supabase not configured' }, { status: 500 });
  }

  const url = new URL(request.url);
  const refresh = url.searchParams.get('refresh') === 'true';
  const today = getTodayPT();

  // Check if prayer exists for today (unless refresh requested)
  if (!refresh) {
    const { data: existing, error: fetchError } = await faithSupabase
      .from('faith_prayers')
      .select('*')
      .eq('user_id', JOSHUA_USER_ID)
      .eq('date', today)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json(existing);
    }
  }

  // Get compass state for alignment
  const { data: compass } = await faithSupabase
    .from('faith_compass_state')
    .select('*')
    .eq('user_id', JOSHUA_USER_ID)
    .maybeSingle();

  const primaryAlignment = compass?.primary_alignment || 'Judaism';
  const secondaryAlignment = compass?.secondary_alignment || null;

  // Get today's lesson topic if available
  let lessonTopic: string | null = null;
  const { data: lesson } = await faithSupabase
    .from('faith_lessons')
    .select('topic')
    .eq('date', today)
    .maybeSingle();

  if (lesson) {
    lessonTopic = lesson.topic;
  }

  // Generate prayer using templates
  // Add a random salt for refresh to get different elements
  const salt = refresh ? Date.now().toString() : today;
  const prayer = generatePrayer(primaryAlignment, secondaryAlignment, salt, lessonTopic);

  // If refresh, delete existing first
  if (refresh) {
    await faithSupabase
      .from('faith_prayers')
      .delete()
      .eq('user_id', JOSHUA_USER_ID)
      .eq('date', today);
  }

  // Store in database
  const { data: saved, error: saveError } = await faithSupabase
    .from('faith_prayers')
    .upsert(
      {
        user_id: JOSHUA_USER_ID,
        date: today,
        ...prayer,
      },
      { onConflict: 'user_id,date' }
    )
    .select()
    .single();

  if (saveError) {
    // Return generated prayer even if save fails
    console.error('Failed to save prayer:', saveError.message);
    return NextResponse.json({
      ...prayer,
      date: today,
      user_id: JOSHUA_USER_ID,
    });
  }

  return NextResponse.json(saved);
}
