import { NextResponse } from 'next/server';
import { faithSupabase, isFaithSupabaseConfigured } from '@/lib/faith-supabase';

const JOSHUA_USER_ID = '2255450f-a3c8-4006-9aef-4bfc4afcda61';

function euclideanDistance(a: Record<string, number>, b: Record<string, number>, keys: string[]): number {
  let sum = 0;
  for (const key of keys) {
    const diff = (a[key] || 5) - (b[key] || 5);
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export async function POST(request: Request) {
  if (!isFaithSupabaseConfigured()) {
    return NextResponse.json({ error: 'Faith Supabase not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { lesson_id, selected_tradition_id, notes } = body;

  if (!lesson_id || !selected_tradition_id) {
    return NextResponse.json({ error: 'lesson_id and selected_tradition_id required' }, { status: 400 });
  }

  // 1. Get the lesson's dimensions
  const { data: lesson, error: lessonErr } = await faithSupabase
    .from('faith_lessons')
    .select('*')
    .eq('id', lesson_id)
    .single();

  if (lessonErr || !lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  }

  // 2. Get the selected tradition's canonical scores
  const { data: tradition, error: tradErr } = await faithSupabase
    .from('faith_traditions')
    .select('*')
    .eq('id', selected_tradition_id)
    .single();

  if (tradErr || !tradition) {
    return NextResponse.json({ error: 'Tradition not found' }, { status: 404 });
  }

  // 3. Write the response (upsert — one per lesson per user)
  const today = new Date().toISOString().split('T')[0];
  const { error: respErr } = await faithSupabase
    .from('faith_responses')
    .upsert({
      user_id: JOSHUA_USER_ID,
      lesson_id,
      selected_tradition_id,
      notes: notes || null,
      date: today,
    }, {
      onConflict: 'user_id,lesson_id',
    });

  if (respErr) {
    return NextResponse.json({ error: respErr.message }, { status: 500 });
  }

  // 4. Fetch current compass state
  const { data: currentCompass } = await faithSupabase
    .from('faith_compass_state')
    .select('*')
    .eq('user_id', JOSHUA_USER_ID)
    .single();

  const currentScores: Record<string, number> = currentCompass?.dimension_scores || {};
  const totalResponses = (currentCompass?.total_responses || 0) + 1;

  // 5. Update dimension scores using running average
  const lessonDimensions: string[] = lesson.dimensions || [];
  const canonicalScores: Record<string, number> = tradition.canonical_scores || {};
  const newScores = { ...currentScores };

  for (const dim of lessonDimensions) {
    const canonicalValue = canonicalScores[dim];
    if (canonicalValue !== undefined) {
      if (newScores[dim] !== undefined) {
        // Running average: new = (old * (n-1) + selection) / n
        newScores[dim] = (newScores[dim] * (totalResponses - 1) + canonicalValue) / totalResponses;
      } else {
        newScores[dim] = canonicalValue;
      }
    }
  }

  // 6. Get all traditions for alignment calculation
  const { data: allTraditions } = await faithSupabase
    .from('faith_traditions')
    .select('name, canonical_scores');

  const dimensionKeys = Object.keys(newScores);
  let primaryAlignment = '';
  let secondaryAlignment = '';
  let primaryDistance = Infinity;
  let secondaryDistance = Infinity;

  if (allTraditions) {
    const distances: { name: string; distance: number }[] = [];
    for (const t of allTraditions) {
      const dist = euclideanDistance(newScores, t.canonical_scores || {}, dimensionKeys);
      distances.push({ name: t.name, distance: dist });
    }
    distances.sort((a, b) => a.distance - b.distance);
    if (distances.length > 0) {
      primaryAlignment = distances[0].name;
      primaryDistance = distances[0].distance;
    }
    if (distances.length > 1) {
      secondaryAlignment = distances[1].name;
      secondaryDistance = distances[1].distance;
    }
  }

  // Convert distance to confidence (0-100, where 0 distance = 100%)
  // Max possible distance for 8 dimensions (range 1-10) ≈ sqrt(8 * 81) ≈ 25.5
  const maxDistance = Math.sqrt(dimensionKeys.length * 81);
  const alignmentConfidence = maxDistance > 0
    ? Math.round(Math.max(0, (1 - primaryDistance / maxDistance)) * 100)
    : 0;

  // 7. Calculate streak
  const lastDate = currentCompass?.last_response_date;
  let streakDays = currentCompass?.streak_days || 0;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (lastDate === today) {
    // Same day, no change
  } else if (lastDate === yesterdayStr) {
    streakDays += 1;
  } else {
    streakDays = 1; // Reset streak
  }

  // 8. Upsert compass state
  const { error: compassErr } = await faithSupabase
    .from('faith_compass_state')
    .upsert({
      user_id: JOSHUA_USER_ID,
      dimension_scores: newScores,
      primary_alignment: primaryAlignment,
      secondary_alignment: secondaryAlignment,
      alignment_confidence: alignmentConfidence,
      total_responses: totalResponses,
      streak_days: streakDays,
      last_response_date: today,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (compassErr) {
    return NextResponse.json({ error: compassErr.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    compass: {
      dimension_scores: newScores,
      primary_alignment: primaryAlignment,
      secondary_alignment: secondaryAlignment,
      alignment_confidence: alignmentConfidence,
      total_responses: totalResponses,
      streak_days: streakDays,
    },
  });
}
