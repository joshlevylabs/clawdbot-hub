import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ checkins: [] });
    }

    // Fetch all daily check-ins
    const { data, error } = await supabase
      .from('compass_interactions')
      .select('id, power, safety, timestamp, created_at')
      .eq('type', 'daily_checkin')
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch check-ins' }, { status: 500 });
    }

    // Transform to include date
    const checkins = (data || []).map(row => ({
      id: row.id,
      date: new Date(row.timestamp || row.created_at).toISOString().split('T')[0],
      power: row.power,
      safety: row.safety,
      timestamp: row.timestamp || row.created_at,
    }));

    return NextResponse.json({ checkins });
  } catch (error) {
    console.error('Check-ins fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
