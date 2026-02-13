import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { paperSupabase, isPaperSupabaseConfigured } from '@/lib/paper-supabase';

const ALPACA_BASE = 'https://paper-api.alpaca.markets';

interface AlpacaPosition {
  symbol: string;
  qty: string;
  avg_entry_price: string;
  current_price: string;
  market_value: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  side: string;
  asset_class: string;
}

interface AlpacaAccount {
  equity: string;
  cash: string;
  buying_power: string;
  portfolio_value: string;
  status: string;
}

interface AlpacaOrder {
  symbol: string;
  side: string;
  qty: string;
  filled_avg_price: string | null;
  status: string;
  filled_at: string | null;
  created_at: string;
  type: string;
}

async function alpacaFetch<T>(endpoint: string): Promise<T> {
  const apiKey = process.env.ALPACA_PAPER_API_KEY;
  const secretKey = process.env.ALPACA_PAPER_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error('Alpaca credentials not configured');
  }

  const res = await fetch(`${ALPACA_BASE}${endpoint}`, {
    headers: {
      'APCA-API-KEY-ID': apiKey,
      'APCA-API-SECRET-KEY': secretKey,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Alpaca API ${res.status}: ${text}`);
  }

  return res.json();
}

export async function GET() {
  const authenticated = await getSession();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch from both sources in parallel
    const [alpacaPositions, alpacaAccount, alpacaOrders, hubData] = await Promise.all([
      alpacaFetch<AlpacaPosition[]>('/v2/positions'),
      alpacaFetch<AlpacaAccount>('/v2/account'),
      alpacaFetch<AlpacaOrder[]>('/v2/orders?status=all&limit=50'),
      isPaperSupabaseConfigured()
        ? Promise.all([
            paperSupabase.from('paper_positions').select('*').order('opened_at', { ascending: false }),
            paperSupabase.from('paper_trading_config').select('*').limit(1).single(),
          ])
        : Promise.resolve([{ data: [] }, { data: null }]),
    ]);

    const hubPositions = (hubData[0] as any).data || [];
    const hubConfig = (hubData[1] as any).data;

    // Build comparison
    const allSymbols = new Set<string>();
    const alpacaMap = new Map<string, AlpacaPosition>();
    const hubMap = new Map<string, any>();

    for (const pos of alpacaPositions) {
      allSymbols.add(pos.symbol);
      alpacaMap.set(pos.symbol, pos);
    }

    for (const pos of hubPositions) {
      allSymbols.add(pos.symbol);
      hubMap.set(pos.symbol, pos);
    }

    // Compare each symbol
    const comparisons = Array.from(allSymbols).sort().map((symbol) => {
      const alpaca = alpacaMap.get(symbol);
      const hub = hubMap.get(symbol);

      const alpacaQty = alpaca ? parseFloat(alpaca.qty) : 0;
      const hubQty = hub ? hub.qty : 0;
      const alpacaEntry = alpaca ? parseFloat(alpaca.avg_entry_price) : 0;
      const hubEntry = hub ? hub.entry_price : 0;
      const alpacaCurrent = alpaca ? parseFloat(alpaca.current_price) : 0;
      const hubCurrent = hub ? (hub.current_price || hub.entry_price) : 0;
      const alpacaPnl = alpaca ? parseFloat(alpaca.unrealized_pl) : 0;
      const hubPnl = hub ? hubQty * (hubCurrent - hubEntry) : 0;
      const alpacaPnlPct = alpaca ? parseFloat(alpaca.unrealized_plpc) * 100 : 0;
      const hubPnlPct = hubEntry > 0 ? ((hubCurrent - hubEntry) / hubEntry) * 100 : 0;
      const alpacaValue = alpaca ? parseFloat(alpaca.market_value) : 0;
      const hubValue = hubQty * hubCurrent;

      const qtyMatch = alpacaQty === hubQty;
      const entryMatch = Math.abs(alpacaEntry - hubEntry) < 0.5; // Allow $0.50 slippage
      const priceMatch = Math.abs(alpacaCurrent - hubCurrent) < 1.0;
      const inBoth = !!alpaca && !!hub;
      const onlyAlpaca = !!alpaca && !hub;
      const onlyHub = !alpaca && !!hub;

      return {
        symbol,
        inBoth,
        onlyAlpaca,
        onlyHub,
        qtyMatch,
        entryMatch,
        priceMatch,
        alpaca: {
          qty: alpacaQty,
          entry_price: alpacaEntry,
          current_price: alpacaCurrent,
          unrealized_pnl: Math.round(alpacaPnl * 100) / 100,
          unrealized_pnl_pct: Math.round(alpacaPnlPct * 100) / 100,
          market_value: Math.round(alpacaValue * 100) / 100,
          side: alpaca?.side || null,
        },
        hub: {
          qty: hubQty,
          entry_price: hubEntry,
          current_price: Math.round(hubCurrent * 100) / 100,
          unrealized_pnl: Math.round(hubPnl * 100) / 100,
          unrealized_pnl_pct: Math.round(hubPnlPct * 100) / 100,
          market_value: Math.round(hubValue * 100) / 100,
        },
      };
    });

    // Summary
    const totalAlpacaEquity = parseFloat(alpacaAccount.equity);
    const totalAlpacaCash = parseFloat(alpacaAccount.cash);
    const hubCash = hubConfig?.current_cash || hubConfig?.cash || 0;
    const hubEquity = hubCash + hubPositions.reduce((s: number, p: any) => s + p.qty * (p.current_price || p.entry_price), 0);
    const allMatch = comparisons.every((c) => c.inBoth && c.qtyMatch);
    const mismatches = comparisons.filter((c) => !c.inBoth || !c.qtyMatch);

    // Recent orders for audit trail
    const recentOrders = alpacaOrders
      .filter((o) => o.status === 'filled')
      .slice(0, 20)
      .map((o) => ({
        symbol: o.symbol,
        side: o.side,
        qty: parseFloat(o.qty),
        filled_price: o.filled_avg_price ? parseFloat(o.filled_avg_price) : null,
        filled_at: o.filled_at,
        created_at: o.created_at,
      }));

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      sync_status: allMatch ? 'IN_SYNC' : 'MISMATCH',
      summary: {
        total_symbols: allSymbols.size,
        in_both: comparisons.filter((c) => c.inBoth).length,
        only_alpaca: comparisons.filter((c) => c.onlyAlpaca).length,
        only_hub: comparisons.filter((c) => c.onlyHub).length,
        qty_mismatches: comparisons.filter((c) => c.inBoth && !c.qtyMatch).length,
        entry_price_diffs: comparisons.filter((c) => c.inBoth && !c.entryMatch).length,
      },
      accounts: {
        alpaca: {
          equity: Math.round(totalAlpacaEquity * 100) / 100,
          cash: Math.round(totalAlpacaCash * 100) / 100,
          portfolio_value: Math.round(parseFloat(alpacaAccount.portfolio_value) * 100) / 100,
          status: alpacaAccount.status,
        },
        hub: {
          equity: Math.round(hubEquity * 100) / 100,
          cash: Math.round(hubCash * 100) / 100,
          starting_capital: hubConfig?.starting_capital || 100000,
        },
        equity_diff: Math.round((totalAlpacaEquity - hubEquity) * 100) / 100,
        equity_diff_pct: hubEquity > 0 ? Math.round(((totalAlpacaEquity - hubEquity) / hubEquity) * 10000) / 100 : 0,
      },
      comparisons,
      mismatches,
      recent_orders: recentOrders,
    });
  } catch (err: any) {
    console.error('Alpaca validation error:', err);
    return NextResponse.json({ error: err.message || 'Validation failed' }, { status: 500 });
  }
}
