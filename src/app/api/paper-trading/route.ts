import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { paperSupabase, isPaperSupabaseConfigured } from '@/lib/paper-supabase';

export async function GET(request: NextRequest) {
  // Check Hub auth (JETT2025 password system)
  const authenticated = await getSession();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isPaperSupabaseConfigured()) {
    return NextResponse.json({ error: 'Paper trading Supabase not configured' }, { status: 500 });
  }

  try {
    // Fetch all data in parallel — no user_id filter since this is admin-only Hub
    const [positionsRes, tradesRes, snapshotsRes, signalsRes, configRes] = await Promise.all([
      paperSupabase
        .from('paper_positions')
        .select('*')
        .order('opened_at', { ascending: false }),

      paperSupabase
        .from('paper_trades')
        .select('*')
        .order('closed_at', { ascending: false })
        .limit(100),

      paperSupabase
        .from('paper_portfolio_snapshots')
        .select('*')
        .order('date', { ascending: true })
        .limit(365),

      paperSupabase
        .from('signal_history')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(200),

      paperSupabase
        .from('paper_trading_config')
        .select('*')
        .limit(1)
        .single(),
    ]);

    // Calculate signal accuracy stats
    const signals = signalsRes.data || [];
    const signalStats = calculateSignalStats(signals);

    return NextResponse.json({
      positions: positionsRes.data || [],
      trades: tradesRes.data || [],
      snapshots: snapshotsRes.data || [],
      signals: signals,
      config: configRes.data || null,
      signalStats,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Paper trading API error:', err);
    return NextResponse.json({ error: 'Failed to fetch paper trading data' }, { status: 500 });
  }
}

interface SignalStats {
  overall: {
    total: number;
    correct_5d: number;
    correct_10d: number;
    correct_20d: number;
    accuracy_5d: number;
    accuracy_10d: number;
    accuracy_20d: number;
    avg_outcome_5d: number;
    avg_outcome_10d: number;
    avg_outcome_20d: number;
  };
  bySymbol: Record<string, {
    total: number;
    correct_5d: number;
    accuracy_5d: number;
    avg_outcome_5d: number;
    correct_10d: number;
    accuracy_10d: number;
    correct_20d: number;
    accuracy_20d: number;
  }>;
  bySignalType: Record<string, {
    total: number;
    correct_5d: number;
    accuracy_5d: number;
  }>;
}

function calculateSignalStats(signals: any[]): SignalStats {
  const overall = {
    total: signals.length,
    correct_5d: 0,
    correct_10d: 0,
    correct_20d: 0,
    accuracy_5d: 0,
    accuracy_10d: 0,
    accuracy_20d: 0,
    avg_outcome_5d: 0,
    avg_outcome_10d: 0,
    avg_outcome_20d: 0,
  };

  const bySymbol: Record<string, any> = {};
  const bySignalType: Record<string, any> = {};

  let count5d = 0, count10d = 0, count20d = 0;
  let sum5d = 0, sum10d = 0, sum20d = 0;

  for (const s of signals) {
    // Per-symbol tracking
    if (!bySymbol[s.symbol]) {
      bySymbol[s.symbol] = { total: 0, correct_5d: 0, accuracy_5d: 0, avg_outcome_5d: 0, correct_10d: 0, accuracy_10d: 0, correct_20d: 0, accuracy_20d: 0, _sum5d: 0, _count5d: 0 };
    }
    bySymbol[s.symbol].total++;

    // Per-signal-type tracking
    const sigType = s.signal || 'UNKNOWN';
    if (!bySignalType[sigType]) {
      bySignalType[sigType] = { total: 0, correct_5d: 0, accuracy_5d: 0, _count5d: 0 };
    }
    bySignalType[sigType].total++;

    if (s.was_correct_5d !== null) {
      count5d++;
      if (s.was_correct_5d) { overall.correct_5d++; bySymbol[s.symbol].correct_5d++; bySignalType[sigType].correct_5d++; }
      bySignalType[sigType]._count5d++;
      bySymbol[s.symbol]._count5d++;
    }
    if (s.was_correct_10d !== null) {
      count10d++;
      if (s.was_correct_10d) { overall.correct_10d++; bySymbol[s.symbol].correct_10d++; }
    }
    if (s.was_correct_20d !== null) {
      count20d++;
      if (s.was_correct_20d) { overall.correct_20d++; bySymbol[s.symbol].correct_20d++; }
    }
    if (s.outcome_5d_pct !== null) { sum5d += s.outcome_5d_pct; bySymbol[s.symbol]._sum5d += s.outcome_5d_pct; }
    if (s.outcome_10d_pct !== null) { sum10d += s.outcome_10d_pct; }
    if (s.outcome_20d_pct !== null) { sum20d += s.outcome_20d_pct; }
  }

  overall.accuracy_5d = count5d > 0 ? (overall.correct_5d / count5d) * 100 : 0;
  overall.accuracy_10d = count10d > 0 ? (overall.correct_10d / count10d) * 100 : 0;
  overall.accuracy_20d = count20d > 0 ? (overall.correct_20d / count20d) * 100 : 0;
  overall.avg_outcome_5d = count5d > 0 ? sum5d / count5d : 0;
  overall.avg_outcome_10d = count10d > 0 ? sum10d / count10d : 0;
  overall.avg_outcome_20d = count20d > 0 ? sum20d / count20d : 0;

  // Finalize per-symbol
  for (const sym of Object.keys(bySymbol)) {
    const s = bySymbol[sym];
    s.accuracy_5d = s._count5d > 0 ? (s.correct_5d / s._count5d) * 100 : 0;
    s.accuracy_10d = s.total > 0 && s.correct_10d > 0 ? (s.correct_10d / s.total) * 100 : 0;
    s.accuracy_20d = s.total > 0 && s.correct_20d > 0 ? (s.correct_20d / s.total) * 100 : 0;
    s.avg_outcome_5d = s._count5d > 0 ? s._sum5d / s._count5d : 0;
    delete s._sum5d;
    delete s._count5d;
  }

  // Finalize per-signal-type
  for (const sig of Object.keys(bySignalType)) {
    const s = bySignalType[sig];
    s.accuracy_5d = s._count5d > 0 ? (s.correct_5d / s._count5d) * 100 : 0;
    delete s._count5d;
  }

  return { overall, bySymbol, bySignalType };
}
