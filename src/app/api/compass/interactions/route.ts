import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Try Supabase first
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('compass_interactions')
        .select('*')
        .in('type', ['positive', 'negative'])
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Transform to match expected format
        const interactions = data.map(row => {
          // Extract advice, tags, and original_text from answers JSONB if present
          const answers = row.answers as { advice?: string; tags?: string[]; original_text?: string } | null;
          return {
            id: row.id,
            timestamp: row.timestamp || row.created_at,
            date: row.date || new Date(row.timestamp || row.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }),
            time: new Date(row.timestamp || row.created_at).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
              timeZone: 'America/Los_Angeles'
            }),
            type: row.type,
            description: row.description || '',
            originalText: answers?.original_text || null,
            compass: {
              power: row.power,
              safety: row.safety
            },
            tags: answers?.tags || [],
            advice: answers?.advice || null
          };
        });

        const response = NextResponse.json({ interactions });
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        return response;
      }
    }

    // Fallback: return empty array if no Supabase
    return NextResponse.json({ interactions: [] });
  } catch (error) {
    console.error('Interactions fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
