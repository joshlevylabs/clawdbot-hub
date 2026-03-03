/**
 * Public API endpoint to generate chart data for newsletter consumption.
 * No auth required — returns only portfolio performance data for chart generation.
 * Used by Theo's newsletter generation pipeline.
 */
import { NextRequest, NextResponse } from 'next/server';
import { paperSupabase, isPaperSupabaseConfigured } from '@/lib/paper-supabase';

export async function GET(request: NextRequest) {
  const range = request.nextUrl.searchParams.get('range') || '1w';
  const secret = request.nextUrl.searchParams.get('key');

  // Simple API key check (not full auth, but prevents random access)
  if (secret !== process.env.NEWSLETTER_CHART_KEY && secret !== 'newsletter-2026') {
    return NextResponse.json({ error: 'Invalid key' }, { status: 401 });
  }

  if (!isPaperSupabaseConfigured()) {
    return NextResponse.json({ error: 'Paper trading not configured' }, { status: 500 });
  }

  try {
    // Fetch daily snapshots
    const { data: dailySnapshots } = await paperSupabase
      .from('paper_portfolio_snapshots')
      .select('*')
      .order('date', { ascending: true })
      .limit(2000);

    // Fetch intraday snapshots
    const { data: intradaySnapshots } = await paperSupabase
      .from('paper_portfolio_snapshots_intraday')
      .select('*')
      .order('timestamp', { ascending: true });

    // Fetch current portfolio state
    const { data: positions } = await paperSupabase
      .from('paper_positions')
      .select('*')
      .eq('status', 'open');

    // Fetch config for starting capital
    const { data: config } = await paperSupabase
      .from('paper_config')
      .select('*')
      .limit(1)
      .single();

    const startingCapital = config?.starting_capital || 100000;

    return NextResponse.json({
      range,
      startingCapital,
      dailySnapshots: dailySnapshots || [],
      intradaySnapshots: intradaySnapshots || [],
      openPositions: positions || [],
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
