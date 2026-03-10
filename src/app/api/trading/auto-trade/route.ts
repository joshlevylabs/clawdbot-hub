import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { paperSupabase, isPaperSupabaseConfigured } from '@/lib/paper-supabase';
import { getSessionAny } from '@/lib/auth';
import { logTradeProposal, logTradeExecution, logMarketObservation } from '@/lib/agent-memory';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ── Agent Config with Investment Style Filters ──

interface AgentStyle {
  id: string;
  name: string;
  // Each agent has different criteria for which BUY signals to act on
  preferredSectors: string[];     // Sectors this agent focuses on ('*' = all)
  minSignalStrength: number;      // Minimum MRE signal strength (0-100)
  minStrategiesAgreeing: number;  // Minimum strategy confirmations
  preferredRegimes: string[];     // Market regimes they're comfortable in
  maxPositions: number;           // Max open positions
  positionSizePct: number;        // Max % of portfolio per position
}

const AGENT_STYLES: AgentStyle[] = [
  {
    id: 'chris-vermeulen',
    name: 'Chris Vermeulen',
    preferredSectors: ['*'], // Technical trader — sector agnostic
    minSignalStrength: 40,   // Wants strong signals
    minStrategiesAgreeing: 3,
    preferredRegimes: ['bull', 'recovery', 'sideways'],
    maxPositions: 8,
    positionSizePct: 0.12,
  },
  {
    id: 'warren-buffett',
    name: 'Warren Buffett',
    preferredSectors: ['Financials', 'Consumer Staples', 'Consumer Discretionary', 'Energy', 'Industrials', 'Healthcare'],
    minSignalStrength: 35,   // Value investor — lower strength OK for quality names
    minStrategiesAgreeing: 3,
    preferredRegimes: ['bull', 'recovery', 'sideways', 'bear'], // Buys in downturns
    maxPositions: 6,         // Concentrated portfolio
    positionSizePct: 0.15,   // Bigger positions
  },
  {
    id: 'peter-schiff',
    name: 'Peter Schiff',
    preferredSectors: ['Energy', 'Materials', 'Utilities', 'Real Estate'],
    minSignalStrength: 30,   // Gold/commodity focused
    minStrategiesAgreeing: 2,
    preferredRegimes: ['bull', 'recovery', 'sideways', 'bear', 'crisis'], // Always active
    maxPositions: 8,
    positionSizePct: 0.12,
  },
  {
    id: 'raoul-pal',
    name: 'Raoul Pal',
    preferredSectors: ['Technology', 'Communication Services', 'Financials'],
    minSignalStrength: 35,   // Macro momentum
    minStrategiesAgreeing: 3,
    preferredRegimes: ['bull', 'recovery'],  // Only bullish regimes
    maxPositions: 8,
    positionSizePct: 0.12,
  },
  {
    id: 'peter-lynch',
    name: 'Peter Lynch',
    preferredSectors: ['*'], // GARP — any sector with growth at reasonable price
    minSignalStrength: 30,   // Casts wide net
    minStrategiesAgreeing: 2,
    preferredRegimes: ['bull', 'recovery', 'sideways'],
    maxPositions: 10,        // Diversified
    positionSizePct: 0.10,   // Smaller positions, more names
  },
  {
    id: 'ray-dalio',
    name: 'Ray Dalio',
    preferredSectors: ['*'], // All Weather = all sectors, risk parity
    minSignalStrength: 35,
    minStrategiesAgreeing: 3,
    preferredRegimes: ['bull', 'recovery', 'sideways', 'bear'], // All Weather = all regimes
    maxPositions: 8,
    positionSizePct: 0.12,
  },
];

// ── Signal Types ──

interface MRESignal {
  symbol: string;
  signal: string;
  signal_strength: number;
  price: number;
  vol_adjusted_size: number;
  strategies_agreeing: number;
  sector?: string;
  regime?: string;
  expected_accuracy?: number;
  fibonacci?: {
    nearest_support: number;
    nearest_resistance?: number;
    profit_targets: number[];
    entry_zone: string;
    fibonacci_stale?: boolean;
  };
  price_data?: {
    low_20d?: number;
    high_20d?: number;
  };
}

interface TradeProposal {
  agent: string;
  agentId: string;
  action: 'buy' | 'sell';
  symbol: string;
  qty: number;
  price: number;
  stop_loss: number | null;
  take_profit: number | null;
  rationale: string;
  signal_strength: number;
  strategies_agreeing: number;
  status: 'proposed' | 'executed' | 'skipped' | 'error';
  error?: string;
}

// ── Helpers ──

async function loadSignals(request: NextRequest): Promise<{ signals: MRESignal[]; timestamp: string; regime: string }> {
  try {
    const origin = request.headers.get('host');
    const protocol = origin?.includes('localhost') ? 'http' : 'https';
    const res = await fetch(`${protocol}://${origin}/api/trading/signals?type=universe`);
    if (!res.ok) throw new Error(`Signal data unavailable (${res.status})`);
    const data = await res.json();
    return {
      signals: data.signals.by_asset_class || [],
      timestamp: data.timestamp || '',
      regime: data.regime?.global || 'unknown',
    };
  } catch (error) {
    console.error('Failed to fetch signals from API:', error);
    return { signals: [], timestamp: '', regime: 'unknown' };
  }
}

function filterSignalsForAgent(
  buySignals: MRESignal[],
  style: AgentStyle,
  globalRegime: string,
  heldSymbols: Set<string>,
): MRESignal[] {
  return buySignals
    .filter(sig => {
      // Don't double up on existing positions
      if (heldSymbols.has(sig.symbol)) return false;
      
      // Minimum signal strength
      if (sig.signal_strength < style.minSignalStrength) return false;
      
      // Minimum strategies agreeing
      if ((sig.strategies_agreeing || 0) < style.minStrategiesAgreeing) return false;
      
      // Sector filter (skip if agent is sector-agnostic)
      if (!style.preferredSectors.includes('*')) {
        const sigSector = sig.sector || '';
        if (!style.preferredSectors.some(ps => sigSector.includes(ps))) return false;
      }
      
      // Regime filter
      const regime = (sig.regime || globalRegime || '').toLowerCase();
      if (!style.preferredRegimes.some(pr => regime.includes(pr))) return false;
      
      return true;
    })
    // Sort by signal strength (strongest first)
    .sort((a, b) => b.signal_strength - a.signal_strength);
}

function calculateQty(
  signal: MRESignal,
  cashBalance: number,
  totalEquity: number,
  style: AgentStyle,
): number {
  // Use MRE vol_adjusted_size scaled to agent portfolio
  const mrePortfolioSize = 100000;
  const scaleFactor = totalEquity / mrePortfolioSize;
  let rawQty = Math.floor(signal.vol_adjusted_size * scaleFactor);
  let positionValue = rawQty * signal.price;
  
  // Cap at agent's max position size
  const maxValue = totalEquity * style.positionSizePct;
  if (positionValue > maxValue) {
    rawQty = Math.floor(maxValue / signal.price);
    positionValue = rawQty * signal.price;
  }
  
  // Keep 5% cash buffer
  if (positionValue > cashBalance * 0.95) {
    rawQty = Math.floor((cashBalance * 0.95) / signal.price);
  }
  
  return Math.max(rawQty, 0);
}

// ── Route Handler ──

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionAny();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isPaperSupabaseConfigured()) {
      return NextResponse.json({ error: 'Paper trading not configured' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const mode: 'propose' | 'execute' = body.mode || 'propose';
    const agentFilter: string | undefined = body.agent_id;

    // Load MRE signals
    const { signals: allSignals, timestamp, regime: globalRegime } = await loadSignals(request);
    const buySignals = allSignals.filter(s => s.signal === 'BUY');

    if (buySignals.length === 0) {
      return NextResponse.json({
        message: 'No BUY signals in MRE universe',
        proposals: [],
        summary: { total: 0, executed: 0, skipped: 0, errors: 0, mode },
        signal_timestamp: timestamp,
      });
    }

    const agentsToRun = agentFilter
      ? AGENT_STYLES.filter(a => a.id === agentFilter)
      : [...AGENT_STYLES];

    const allProposals: TradeProposal[] = [];

    for (const style of agentsToRun) {
      // Get agent's current state
      const { data: accountData } = await paperSupabase
        .from('paper_accounts')
        .select('cash_balance, starting_capital')
        .eq('account_id', style.id)
        .single();

      const cashBalance = accountData?.cash_balance || 100000;

      // Get existing positions
      const { data: positions } = await paperSupabase
        .from('paper_positions')
        .select('symbol, qty, entry_price, current_price')
        .eq('account_id', style.id);

      const existingPositions = positions || [];
      const positionCount = existingPositions.length;
      const positionsValue = existingPositions.reduce(
        (sum, p) => sum + (p.qty * (p.current_price || p.entry_price)), 0
      );
      const totalEquity = cashBalance + positionsValue;
      const heldSymbols = new Set(existingPositions.map(p => p.symbol));

      // Skip if at max positions
      if (positionCount >= style.maxPositions) {
        allProposals.push({
          agent: style.name,
          agentId: style.id,
          action: 'buy',
          symbol: 'N/A',
          qty: 0,
          price: 0,
          stop_loss: null,
          take_profit: null,
          rationale: `At max positions (${style.maxPositions}/${style.maxPositions})`,
          signal_strength: 0,
          strategies_agreeing: 0,
          status: 'skipped',
        });
        continue;
      }

      // Filter signals matching this agent's style
      const slotsAvailable = style.maxPositions - positionCount;
      const matchingSignals = filterSignalsForAgent(buySignals, style, globalRegime, heldSymbols);

      if (matchingSignals.length === 0) {
        allProposals.push({
          agent: style.name,
          agentId: style.id,
          action: 'buy',
          symbol: 'N/A',
          qty: 0,
          price: 0,
          stop_loss: null,
          take_profit: null,
          rationale: `No signals match ${style.name}'s criteria (min strength ${style.minSignalStrength}%, ${style.minStrategiesAgreeing}+ strategies, preferred sectors)`,
          signal_strength: 0,
          strategies_agreeing: 0,
          status: 'skipped',
        });
        continue;
      }

      // Take top signals up to available slots
      let remainingCash = cashBalance;
      for (const signal of matchingSignals.slice(0, slotsAvailable)) {
        const qty = calculateQty(signal, remainingCash, totalEquity, style);

        if (qty === 0) {
          allProposals.push({
            agent: style.name,
            agentId: style.id,
            action: 'buy',
            symbol: signal.symbol,
            qty: 0,
            price: signal.price,
            stop_loss: null,
            take_profit: null,
            rationale: 'Insufficient cash for minimum position',
            signal_strength: signal.signal_strength,
            strategies_agreeing: signal.strategies_agreeing,
            status: 'skipped',
          });
          continue;
        }

        // Use Fibonacci levels for stop loss and take profit
        // Guard: only use targets that are ABOVE current price (inverted targets = stale swing data)
        // Check if Fibonacci data is stale (60+ days old)
        const fib = signal.fibonacci;
        const isFibStale = fib?.fibonacci_stale === true;
        let stopLoss = null;
        let takeProfit = null;

        // If Fibonacci is not stale, try to use Fibonacci levels
        if (!isFibStale) {
          stopLoss = fib?.nearest_support && fib.nearest_support < signal.price ? fib.nearest_support : null;
          const validTargets = fib?.profit_targets?.filter((t: number) => t > signal.price) || [];
          takeProfit = validTargets[0] || (fib?.nearest_resistance && fib.nearest_resistance > signal.price ? fib.nearest_resistance : null);
        }

        // Enhanced fallback logic: if Fibonacci is missing/stale but we have price data, use 20-day low/high
        if (!stopLoss || !takeProfit) {
          // Try to get price_data from signal for enhanced fallback
          const priceData = signal.price_data;
          let enhancedSL = null;
          let enhancedTP = null;

          if (priceData?.low_20d && priceData?.high_20d) {
            // Use 20-day low as support (SL) and 20-day high as resistance (TP) if reasonable
            if (priceData.low_20d < signal.price && priceData.high_20d > signal.price) {
              enhancedSL = priceData.low_20d;
              enhancedTP = priceData.high_20d;
              console.log(`[auto-trade] ${signal.symbol}: Using 20-day range fallback SL=${enhancedSL} TP=${enhancedTP}`);
            }
          }

          if (!stopLoss) {
            stopLoss = enhancedSL || Math.round(signal.price * 0.95 * 100) / 100; // Enhanced or -5% default
          }
          if (!takeProfit) {
            takeProfit = enhancedTP || Math.round(signal.price * 1.10 * 100) / 100; // Enhanced or +10% default
          }
        }

        // SAFETY: If SL/TP are still inverted after Fibonacci lookup, fall back to percentage-based defaults
        // SL must be BELOW entry, TP must be ABOVE entry for long positions
        if (stopLoss && stopLoss >= signal.price) {
          console.warn(`[auto-trade] ${signal.symbol}: SL ${stopLoss} >= entry ${signal.price}, falling back to -5%`);
          stopLoss = Math.round(signal.price * 0.95 * 100) / 100;
        }
        if (takeProfit && takeProfit <= signal.price) {
          console.warn(`[auto-trade] ${signal.symbol}: TP ${takeProfit} <= entry ${signal.price}, falling back to +10%`);
          takeProfit = Math.round(signal.price * 1.10 * 100) / 100;
        }

        const proposal: TradeProposal = {
          agent: style.name,
          agentId: style.id,
          action: 'buy',
          symbol: signal.symbol,
          qty,
          price: signal.price,
          stop_loss: stopLoss,
          take_profit: takeProfit,
          rationale: `MRE BUY: ${signal.signal_strength.toFixed(1)}% strength, ${signal.strategies_agreeing} strategies, ${signal.sector || 'Unknown'} sector, ${signal.regime || globalRegime} regime`,
          signal_strength: signal.signal_strength,
          strategies_agreeing: signal.strategies_agreeing,
          status: mode === 'execute' ? 'proposed' : 'proposed',
        };

        // Layer 3: Log trade proposal to agent memory
        logTradeProposal({
          agentId: style.id,
          symbol: signal.symbol,
          action: 'BUY',
          reasoning: proposal.rationale,
          confidence: signal.signal_strength / 100,
          price: signal.price,
          strategies: Array.from({ length: signal.strategies_agreeing }, (_, i) => `strategy-${i + 1}`),
        }).catch(() => {}); // fire-and-forget

        if (mode === 'execute') {
          // Execute the trade
          const { data: position, error: posError } = await paperSupabase
            .from('paper_positions')
            .insert({
              account_id: style.id,
              symbol: signal.symbol,
              side: 'long',
              qty,
              entry_price: signal.price,
              current_price: signal.price,
              stop_loss: stopLoss,
              take_profit: takeProfit,
              signal_confidence: signal.signal_strength,
              signal_regime: signal.regime || globalRegime,
              opened_at: new Date().toISOString(),
              hold_days: 20, // MRE default hold target
              notes: proposal.rationale,
            })
            .select()
            .single();

          if (posError) {
            proposal.status = 'error';
            proposal.error = posError.message;
          } else {
            // Update cash balance
            const newCash = remainingCash - (qty * signal.price);
            await paperSupabase
              .from('paper_accounts')
              .update({ cash_balance: newCash, updated_at: new Date().toISOString() })
              .eq('account_id', style.id);
            
            remainingCash = newCash;
            proposal.status = 'executed';

            // Layer 3: Log trade execution to agent memory
            logTradeExecution({
              agentId: style.id,
              symbol: signal.symbol,
              action: 'BUY',
              quantity: qty,
              price: signal.price,
              orderId: position?.id,
            }).catch(() => {}); // fire-and-forget
          }
        }

        allProposals.push(proposal);
      }
    }

    const summary = {
      total: allProposals.length,
      executed: allProposals.filter(p => p.status === 'executed').length,
      proposed: allProposals.filter(p => p.status === 'proposed').length,
      skipped: allProposals.filter(p => p.status === 'skipped').length,
      errors: allProposals.filter(p => p.status === 'error').length,
      mode,
      buy_signals_available: buySignals.length,
      global_regime: globalRegime,
      signal_timestamp: timestamp,
    };

    return NextResponse.json({
      proposals: allProposals,
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

// GET: Status check
export async function GET(request: NextRequest) {
  const session = await getSessionAny();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    status: 'ready',
    agents: AGENT_STYLES.map(a => ({
      id: a.id,
      name: a.name,
      sectors: a.preferredSectors,
      minStrength: a.minSignalStrength,
      maxPositions: a.maxPositions,
    })),
    usage: 'POST with { mode: "propose" | "execute", agent_id?: string }',
  });
}
// build 1773100482
