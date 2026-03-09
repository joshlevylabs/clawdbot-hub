import { NextRequest, NextResponse } from 'next/server';
import { paperSupabase, isPaperSupabaseConfigured } from '@/lib/paper-supabase';

/**
 * GET /api/trading/signals?type=universe|core
 * 
 * Reads MRE signal data from Supabase instead of static JSON files.
 * Replaces the old static file approach for live signal updates.
 * 
 * Query params:
 *   - type: 'universe' (default) | 'core'
 * 
 * Returns: JSON blob from the Supabase mre_signal_data table
 */
export async function GET(request: NextRequest) {
  try {
    // Check Supabase configuration
    if (!isPaperSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase not configured' }, 
        { status: 500 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'universe';

    // Validate type parameter
    if (!['universe', 'core'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type parameter. Must be "universe" or "core"' },
        { status: 400 }
      );
    }

    // Fetch signal data from Supabase
    const { data, error } = await paperSupabase
      .from('mre_signal_data')
      .select('data, updated_at')
      .eq('id', type)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch signal data' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: `No signal data found for type: ${type}` },
        { status: 404 }
      );
    }

    // Return the JSON blob directly with caching headers
    const response = NextResponse.json(data.data);
    
    // Add caching headers for performance
    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    response.headers.set('X-Source', 'supabase');
    response.headers.set('X-Updated-At', data.updated_at);
    response.headers.set('X-Signal-Type', type);

    return response;

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}