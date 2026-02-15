import { NextResponse } from 'next/server';
import { faithSupabase, isFaithSupabaseConfigured } from '@/lib/faith-supabase';

// Deterministic shuffle using a simple seeded PRNG (date-based)
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const shuffled = [...arr];
  let s = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = ((s >>> 0) % (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function dateSeed(dateStr: string): number {
  // Simple hash from date string "YYYY-MM-DD"
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
  }
  return hash;
}

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

  // Randomize perspective order deterministically per day
  const shuffled = seededShuffle(perspectives || [], dateSeed(date));

  return NextResponse.json({ lesson, perspectives: shuffled });
}
