import { NextRequest, NextResponse } from "next/server";
import { getSession } from '@/lib/auth';
import { computeFreshness, detectRegimeChange, applyAutoInvalidation } from '@/lib/trading/signal-freshness';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * GET /api/trading/signal-health
 * 
 * Returns the current health status of signal data:
 * - Freshness tier and age
 * - Regime change detection
 * - Auto-invalidation status
 * - Signal statistics
 */
export async function GET(request: NextRequest) {
  const authenticated = await getSession();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Load signal data
    let signalsData: Record<string, unknown>;
    try {
      const signalsPath = join(process.cwd(), 'public', 'data', 'trading', 'mre-signals-universe.json');
      signalsData = JSON.parse(readFileSync(signalsPath, 'utf-8'));
    } catch {
      try {
        const altPath = join(process.cwd(), '.next', 'server', 'app', 'data', 'trading', 'mre-signals-universe.json');
        signalsData = JSON.parse(readFileSync(altPath, 'utf-8'));
      } catch {
        const origin = request.headers.get('host');
        const protocol = origin?.includes('localhost') ? 'http' : 'https';
        const res = await fetch(`${protocol}://${origin}/data/trading/mre-signals-universe.json`);
        if (!res.ok) throw new Error(`Signal data unavailable (${res.status})`);
        signalsData = await res.json();
      }
    }

    const timestamp = signalsData.timestamp as string;
    const fearGreed = signalsData.fear_greed as { current: number; rating: string };
    const regime = signalsData.regime as { global: string; vix?: number };
    const signals = (signalsData.signals as { summary: { total_buy: number }; by_asset_class: { signal: string }[] });

    // Compute freshness
    const freshness = computeFreshness(timestamp);

    // Check regime change (against signal-time values — real-time comparison requires live data feed)
    const regimeChange = detectRegimeChange(
      regime.vix ?? null,
      null, // TODO: live VIX feed
      fearGreed.current,
      null, // TODO: live F&G feed
    );

    // Check auto-invalidation
    const { invalidatedCount } = applyAutoInvalidation(
      signals.by_asset_class,
      timestamp,
    );

    return NextResponse.json({
      status: 'ok',
      timestamp,
      freshness: {
        tier: freshness.tier,
        ageMinutes: Math.round(freshness.ageMinutes),
        ageLabel: freshness.ageLabel,
        isActionable: freshness.isActionable,
        warningMessage: freshness.warningMessage,
      },
      regimeChange: {
        changed: regimeChange.changed,
        triggers: regimeChange.triggers,
        message: regimeChange.message,
      },
      signals: {
        total: signals.by_asset_class.length,
        buy: signals.summary.total_buy,
        invalidated: invalidatedCount,
      },
      regime: {
        global: regime.global,
        vix: regime.vix,
        fearGreed: fearGreed.current,
        fearGreedRating: fearGreed.rating,
      },
      checkedAt: new Date().toISOString(),
    });

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      status: 'error',
      error: errMsg,
      checkedAt: new Date().toISOString(),
    }, { status: 500 });
  }
}
