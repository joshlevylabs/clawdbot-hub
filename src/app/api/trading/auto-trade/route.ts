import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { paperSupabase, isPaperSupabaseConfigured } from '@/lib/paper-supabase';
import { getSessionAny } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ── Agent Config ──

const AGENTS = [
  { id: 'chris-vermeulen', name: 'Chris Vermeulen', apiRoute: '/api/trading/chris-actions' },
  { id: 'warren-buffett', name: 'Warren Buffett', apiRoute: '/api/trading/buffett-actions' },
  { id: 'peter-schiff', name: 'Peter Schiff', apiRoute: '/api/trading/schiff-actions' },
  { id: 'raoul-pal', name: 'Raoul Pal', apiRoute: '/api/trading/pal-actions' },
  { id: 'peter-lynch', name: 'Peter Lynch', apiRoute: '/api/trading/lynch-actions' },
] as const;

// Scale factor: MRE sizes for ~$100K main portfolio, agent portfolios are also $100K
// but we cap at 15% per position to ensure diversification across agents
const MAX_POSITION_PCT = 0.15; // 15% of portfolio equity
const MAX_POSITIONS = 8; // Max open positions per agent

interface MRESignal {
  symbol: string;
  signal: string;
  signal_strength: number;
  price: number;
  vol_adjusted_size: number;
  fibonacci?: {
    nearest_support: number;
    profit_targets: number[];
    entry_zone: string;
  };
  sector?: string;
  regime?: string;
  expected_accuracy?: number;
  strategies_agreeing?: number;
}

interface TradeExecution {
  agent: string;
  action: 'buy' | 'sell';
  symbol: string;
  qty: number;
  price: number;
  stop_loss: number | null;
  take_profit: number | null;
  rationale: string;
  status: 'executed' | 'skipped' | 'error';
  error?: string;
}

function loadSignals(): MRESignal[] {
  try {
    const signalsPath = join(process.cwd(), 'public', 'data', 'trading', 'mre-signals-universe.json');
    const data = JSON.parse(readFileSync(signalsPath, 'utf-8'));
    return data.signals.by_asset_class || [];
  } catch {
    try {
      const altPath = join(process.cwd(), '.next', 'server', 'app', 'data', 'trading', 'mre-signals-universe.json');
      const data = JSON.parse(readFileSync(altPath, 'utf-8'));
      return data.signals.by_asset_class || [];
    } catch {
      return [];
    }
  }
}

function calculatePositionSize(
  signal: MRESignal,
  cashBalance: number,
  totalEquity: number,
): { qty: number; positionValue: number } {
  // Use MRE's vol_adjusted_size but scale to agent portfolio size
  // MRE sizes assume ~$100K portfolio, so scale proportionally
  const mrePortfolioSize = 100000;
  const scaleFactor = totalEquity / mrePortfolioSize;
  
  let rawQty = Math.floor(signal.vol_adjusted_size * scaleFactor);
  let positionValue = rawQty * signal.price;
  
  // Cap at MAX_POSITION_PCT of equity
  const maxValue = totalEquity * MAX_POSITION_PCT;
  if (positionValue > maxValue) {
    rawQty = Math.floor(maxValue / signal.price);
    positionValue = rawQty * signal.price;
  }
  
  // Don't exceed available cash
  if (positionValue > cashBalance * 0.95) { // Keep 5% cash buffer
    rawQty = Math.floor((cashBalance * 0.95) / signal.price);
    positionValue = rawQty * signal.price;
  }
  
  // Minimum 1 share
  if (rawQty < 1) rawQty = 0;
  
  return { qty: rawQty, positionValue: rawQty * signal.price };
}

async function executeAgentTrade(
  agentId: string,
  action: 'buy' | 'sell',
  symbol: string,
  qty: number,
  price: number,
  stopLoss: number | null,
  takeProfit: number | null,
  rationale: string,
  request: NextRequest,
): Promise<{ success: boolean; error?: string }> {
  const origin = request.headers.get('host');
  const protocol = origin?.includes('localhost') ? 'http' : 'https';
  const cookie = request.headers.get('cookie') || '';
  
  const res = await fetch(`${protocol}://${origin}/api/trading/agent-trade`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
    },
    body: JSON.stringify({
      agent_id: agentId,
      action,
      symbol,
      qty,
      price,
      stop_loss: stopLoss,
      take_profit: takeProfit,
      rationale,
    }),
  });
  
  const data = await res.json();
  if (!res.ok) {
    return { success: false, error: data.error || `HTTP ${res.status}` };
  }
  return { success: true };
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getSessionAny();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isPaperSupabaseConfigured()) {
      return NextResponse.json({ error: 'Paper trading not configured' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const mode = body.mode || 'propose'; // 'propose' = dry run, 'execute' = live
    const agentFilter = body.agent_id; // Optional: only run for one agent

    // Load MRE signals
    const allSignals = loadSignals();
    const buySignals = allSignals.filter(s => s.signal === 'BUY');
    
    if (buySignals.length === 0) {
      return NextResponse.json({ 
        message: 'No BUY signals in MRE universe',
        executions: [],
        summary: { total: 0, executed: 0, skipped: 0, errors: 0 }
      });
    }

    // Build signal lookup
    const signalLookup = new Map<string, MRESignal>();
    for (const sig of buySignals) {
      signalLookup.set(sig.symbol, sig);
    }

    const agentsToRun = agentFilter 
      ? AGENTS.filter(a => a.id === agentFilter)
      : [...AGENTS];

    const allExecutions: TradeExecution[] = [];

    for (const agent of agentsToRun) {
      // Get agent's current state
      const { data: accountData } = await paperSupabase
        .from('paper_accounts')
        .select('cash_balance, starting_capital')
        .eq('account_id', agent.id)
        .single();

      const cashBalance = accountData?.cash_balance || 100000;
      const startingCapital = accountData?.starting_capital || 100000;

      // Get existing positions
      const { data: positions } = await paperSupabase
        .from('paper_positions')
        .select('symbol, qty, entry_price, current_price')
        .eq('account_id', agent.id);

      const existingPositions = positions || [];
      const positionCount = existingPositions.length;
      const positionsValue = existingPositions.reduce(
        (sum, p) => sum + (p.qty * (p.current_price || p.entry_price)), 0
      );
      const totalEquity = cashBalance + positionsValue;
      
      // Get symbols already held
      const heldSymbols = new Set(existingPositions.map(p => p.symbol));

      // Skip if at max positions
      if (positionCount >= MAX_POSITIONS) {
        allExecutions.push({
          agent: agent.name,
          action: 'buy',
          symbol: 'N/A',
          qty: 0,
          price: 0,
          stop_loss: null,
          take_profit: null,
          rationale: `At max positions (${MAX_POSITIONS})`,
          status: 'skipped',
        });
        continue;
      }

      // Call advisor API to get recommendations
      const origin = request.headers.get('host');
      const protocol = origin?.includes('localhost') ? 'http' : 'https';
      const cookie = request.headers.get('cookie') || '';

      let advisorRecs: Array<{
        action: string;
        symbol: string;
        priority: string;
        rationale?: string;
        suggested_qty?: number;
        stop_loss?: number;
        take_profit?: number;
      }> = [];

      try {
        const advisorRes = await fetch(`${protocol}://${origin}${agent.apiRoute}`, {
          headers: { 'Cookie': cookie },
        });
        if (advisorRes.ok) {
          const advisorData = await advisorRes.json();
          advisorRecs = advisorData.trade_recommendations || [];
        }
      } catch (err) {
        console.error(`Failed to get advisor recs for ${agent.name}:`, err);
      }

      // Filter: only BUY recommendations that match MRE BUY signals
      const validBuys = advisorRecs.filter(rec => {
        if (rec.action !== 'buy') return false;
        if (!signalLookup.has(rec.symbol)) return false; // Must have MRE BUY signal
        if (heldSymbols.has(rec.symbol)) return false; // Don't double up
        return true;
      });

      // Also consider: top MRE BUY signals even if advisor didn't explicitly recommend
      // (some advisors may not list every ticker in their response)
      const slotsAvailable = MAX_POSITIONS - positionCount;
      
      // Process advisor-recommended buys first
      for (const rec of validBuys.slice(0, slotsAvailable)) {
        const signal = signalLookup.get(rec.symbol)!;
        const { qty, positionValue } = calculatePositionSize(signal, cashBalance, totalEquity);
        
        if (qty === 0 || positionValue < 100) {
          allExecutions.push({
            agent: agent.name,
            action: 'buy',
            symbol: rec.symbol,
            qty: 0,
            price: signal.price,
            stop_loss: null,
            take_profit: null,
            rationale: 'Insufficient cash for minimum position',
            status: 'skipped',
          });
          continue;
        }

        // Use MRE Fibonacci levels for stop loss and take profit
        const fib = signal.fibonacci;
        const stopLoss = fib?.nearest_support || null;
        const takeProfit = fib?.profit_targets?.[0] || null;

        const execution: TradeExecution = {
          agent: agent.name,
          action: 'buy',
          symbol: rec.symbol,
          qty,
          price: signal.price,
          stop_loss: stopLoss,
          take_profit: takeProfit,
          rationale: rec.rationale || `MRE BUY signal (strength ${signal.signal_strength}%, ${signal.strategies_agreeing || 0} strategies)`,
          status: 'skipped',
        };

        if (mode === 'execute') {
          const result = await executeAgentTrade(
            agent.id, 'buy', rec.symbol, qty, signal.price,
            stopLoss, takeProfit,
            execution.rationale, request
          );
          execution.status = result.success ? 'executed' : 'error';
          execution.error = result.error;
        } else {
          execution.status = 'skipped'; // Propose mode = dry run
        }

        allExecutions.push(execution);
      }

      // Process SELL recommendations for existing positions
      const sellRecs = advisorRecs.filter(rec => {
        if (rec.action !== 'sell') return false;
        if (!heldSymbols.has(rec.symbol)) return false;
        return true;
      });

      for (const rec of sellRecs) {
        const position = existingPositions.find(p => p.symbol === rec.symbol);
        if (!position) continue;

        const execution: TradeExecution = {
          agent: agent.name,
          action: 'sell',
          symbol: rec.symbol,
          qty: rec.suggested_qty || position.qty,
          price: position.current_price || position.entry_price,
          stop_loss: null,
          take_profit: null,
          rationale: rec.rationale || 'Advisor recommends exit',
          status: 'skipped',
        };

        if (mode === 'execute') {
          const result = await executeAgentTrade(
            agent.id, 'sell', rec.symbol,
            execution.qty, execution.price,
            null, null,
            execution.rationale, request
          );
          execution.status = result.success ? 'executed' : 'error';
          execution.error = result.error;
        }

        allExecutions.push(execution);
      }
    }

    const summary = {
      total: allExecutions.length,
      executed: allExecutions.filter(e => e.status === 'executed').length,
      skipped: allExecutions.filter(e => e.status === 'skipped').length,
      errors: allExecutions.filter(e => e.status === 'error').length,
      mode,
      buy_signals_available: buySignals.length,
    };

    return NextResponse.json({
      executions: allExecutions,
      summary,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Auto-trade error:', error);
    return NextResponse.json(
      { error: 'Auto-trade pipeline failed', details: String(error) },
      { status: 500 }
    );
  }
}

// GET: Simple status check
export async function GET(request: NextRequest) {
  const session = await getSessionAny();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    status: 'ready',
    agents: AGENTS.map(a => a.id),
    config: {
      max_position_pct: MAX_POSITION_PCT,
      max_positions: MAX_POSITIONS,
    },
    usage: 'POST with { mode: "propose" | "execute", agent_id?: string }',
  });
}
