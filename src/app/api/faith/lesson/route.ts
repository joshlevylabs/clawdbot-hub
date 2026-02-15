import { NextResponse } from 'next/server';
import { faithSupabase, isFaithSupabaseConfigured } from '@/lib/faith-supabase';

export async function GET(request: Request) {
  if (!isFaithSupabaseConfigured()) {
    return NextResponse.json({ error: 'Faith Supabase not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  // Fetch today's lesson
  const { data: lesson, error: lessonError } = await faithSupabase
    .from('faith_lessons')
    .select('*')
    .eq('date', date)
    .single();

  if (lessonError || !lesson) {
    // No lesson for today — return null gracefully
    return NextResponse.json({ lesson: null, perspectives: [] });
  }

  // Fetch perspectives for this lesson with tradition data
  const { data: perspectives, error: perspError } = await faithSupabase
    .from('faith_perspectives')
    .select(`
      *,
      tradition:faith_traditions(*)
    `)
    .eq('lesson_id', lesson.id);

  if (perspError) {
    return NextResponse.json({ error: perspError.message }, { status: 500 });
  }

  return NextResponse.json({ lesson, perspectives: perspectives || [] });
}
