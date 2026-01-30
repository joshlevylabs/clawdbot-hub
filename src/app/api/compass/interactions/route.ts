import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function GET() {
  try {
    // Try Supabase first
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('compass_interactions')
        .select('*')
        .in('type', ['positive', 'negative'])
        .order('timestamp', { ascending: false });

      if (!error && data) {
        // Transform to match expected format
        const interactions = data.map(row => {
          // Extract advice and tags from answers JSONB if present
          const answers = row.answers as { advice?: string; tags?: string[] } | null;
          return {
            id: row.id,
            timestamp: row.timestamp || row.created_at,
            date: row.date || new Date(row.timestamp || row.created_at).toISOString().split('T')[0],
            time: new Date(row.timestamp || row.created_at).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
              timeZone: 'America/Los_Angeles'
            }),
            type: row.type,
            description: row.description || '',
            compass: {
              power: row.power,
              safety: row.safety
            },
            tags: answers?.tags || [],
            advice: answers?.advice || null
          };
        });

        return NextResponse.json({ interactions });
      }
    }

    // Fallback: return empty array if no Supabase
    return NextResponse.json({ interactions: [] });
  } catch (error) {
    console.error('Interactions fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
