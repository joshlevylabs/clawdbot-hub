import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface CheckinData {
  power: number;
  safety: number;
  answers?: Record<string, { label: string; power: number; safety: number }>;
  type?: 'positive' | 'negative' | 'daily_checkin';
  description?: string;
}

function calculateCompassPosition(interactions: Array<{ power: number; safety: number; timestamp: string }>) {
  if (!interactions.length) {
    return { power: 0, safety: 0, quadrant: 'unknown', quadrantName: 'No Data', inIdealZone: false, count: 0 };
  }

  const halfLifeDays = 30;
  let totalWeight = 0;
  let weightedPower = 0;
  let weightedSafety = 0;
  const now = new Date();

  for (const interaction of interactions) {
    const interactionDate = new Date(interaction.timestamp);
    const daysAgo = (now.getTime() - interactionDate.getTime()) / (1000 * 60 * 60 * 24);
    const weight = Math.max(Math.pow(0.5, daysAgo / halfLifeDays), 0.1);

    weightedPower += interaction.power * weight;
    weightedSafety += interaction.safety * weight;
    totalWeight += weight;
  }

  const avgPower = weightedPower / totalWeight;
  const avgSafety = weightedSafety / totalWeight;

  let quadrant: string;
  let quadrantName: string;

  if (avgPower >= 0 && avgSafety >= 0) {
    quadrant = 'topRight';
    quadrantName = 'Secure Leadership Partnership';
  } else if (avgPower < 0 && avgSafety >= 0) {
    quadrant = 'topLeft';
    quadrantName = 'Codependent / Enmeshed';
  } else if (avgPower >= 0 && avgSafety < 0) {
    quadrant = 'bottomRight';
    quadrantName = 'Authoritarian / Abusive';
  } else {
    quadrant = 'bottomLeft';
    quadrantName = 'Detached / Avoidant';
  }

  const inIdealZone = avgPower >= 0 && avgPower <= 2 && avgSafety >= 3 && avgSafety <= 5;

  return {
    power: Math.round(avgPower * 100) / 100,
    safety: Math.round(avgSafety * 100) / 100,
    quadrant,
    quadrantName,
    inIdealZone,
    count: interactions.length,
    calculatedAt: new Date().toISOString()
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body: CheckinData = await request.json();
    
    if (typeof body.power !== 'number' || typeof body.safety !== 'number') {
      return NextResponse.json({ error: 'Invalid data: power and safety must be numbers' }, { status: 400 });
    }

    const power = Math.round(body.power * 10) / 10;
    const safety = Math.round(body.safety * 10) / 10;

    // Insert into Supabase
    const { data, error } = await supabase
      .from('compass_interactions')
      .insert({
        type: body.type || 'daily_checkin',
        description: body.description || 'Daily check-in questionnaire',
        power,
        safety,
        answers: body.answers || null
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to save check-in', details: error.message }, { status: 500 });
    }

    // Get updated compass position
    const { data: allInteractions } = await supabase
      .from('compass_interactions')
      .select('power, safety, timestamp')
      .order('timestamp', { ascending: false })
      .limit(100);

    const compassPosition = calculateCompassPosition(allInteractions || []);

    return NextResponse.json({
      success: true,
      interaction: data,
      compass: compassPosition
    });

  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json({ error: 'Failed to process check-in' }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get all interactions for compass calculation
    const { data: interactions, error } = await supabase
      .from('compass_interactions')
      .select('power, safety, timestamp')
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
    }

    const compassPosition = calculateCompassPosition(interactions || []);

    // Get recent interactions for history
    const { data: recent } = await supabase
      .from('compass_interactions')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(10);

    return NextResponse.json({
      current: compassPosition,
      trend: { power: 0, safety: 0 },
      recentCount: (interactions || []).length,
      totalCount: (interactions || []).length,
      recentInteractions: recent || [],
      idealZone: { power: [0, 2], safety: [3, 5] }
    });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ error: 'Failed to load compass state' }, { status: 500 });
  }
}
