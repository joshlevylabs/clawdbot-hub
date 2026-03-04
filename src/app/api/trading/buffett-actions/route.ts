import { NextRequest, NextResponse } from "next/server";
import { getSession } from '@/lib/auth';
import { paperSupabase, isPaperSupabaseConfigured, PaperPosition } from '@/lib/paper-supabase';
import { BUFFETT_SYSTEM_PROMPT } from '@/lib/warren-buffett-knowledge';
import { computeFreshness } from '@/lib/trading/signal-freshness';
import { buildLookups, validateAdvisorOutput, buildCitationInstructions, ADVISOR_DISCLAIMER } from '@/lib/trading/advisor-validation';
import { readFileSync } from 'fs';
import { join } from 'path';

// Allow up to 60s for Anthropic API call (requires Vercel Pro; Hobby caps at 10s)
export const maxDuration = 60;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

interface MRESignal {
  symbol: string;
  signal: string;
  signal_strength: number;
  expected_accuracy: number;
  current_fg: number;
  regime: string;
  signal_source: string;
  strategies_agreeing: number;
  strategy_votes: Record<string, boolean>;
  sector?: string;
  price?: number;
  rsi_14?: number;
  momentum_20d?: number;
}

interface MRESignalsData {
  timestamp: string;
  fear_greed: {
    current: number;
    rating: string;
    is_fear?: boolean;
    is_extreme_fear?: boolean;
    is_greed?: boolean;
    is_extreme_greed?: boolean;
  };
  regime: {
    global: string;
    bear_pct?: number;
    vix?: number;
    crash_mode?: {
      active: boolean;
      crash_score?: number;
      severity?: string;
    };
  };
  signals: {
    summary: {
      total_buy: number;
      total_hold: number;
      total_watch: number;
    };
    by_asset_class: MRESignal[];
  };
  sector_fear_greed?: Record<string, number>;
}

async function loadSignalsData(request: NextRequest): Promise<MRESignalsData> {
  try {
    const signalsPath = join(process.cwd(), 'public', 'data', 'trading', 'mre-signals-universe.json');
    return JSON.parse(readFileSync(signalsPath, 'utf-8'));
  } catch {
    try {
      const altPath = join(process.cwd(), '.next', 'server', 'app', 'data', 'trading', 'mre-signals-universe.json');
      return JSON.parse(readFileSync(altPath, 'utf-8'));
    } catch {
      const origin = request.headers.get('host');
      const protocol = origin?.includes('localhost') ? 'http' : 'https';
      const res = await fetch(`${protocol}://${origin}/data/trading/mre-signals-universe.json`, {
        headers: { 'Cookie': request.headers.get('cookie') || '' }
      });
      if (!res.ok) throw new Error(`Signal data unavailable (${res.status})`);
      return await res.json();
    }
  }
}

function buildMarketContext(signalsData: MRESignalsData, positions: PaperPosition[], today: string): string {
  const buySignals = signalsData.signals.by_asset_class
    .filter(signal => signal.signal === 'BUY')
    .sort((a, b) => (b.signal_strength || 0) - (a.signal_strength || 0))
    .slice(0, 10);

  return `
LIVE MARKET DATA (as of ${signalsData.timestamp}):

MARKET SENTIMENT:
- Fear & Greed Index: ${signalsData.fear_greed.current.toFixed(1)} (${signalsData.fear_greed.rating.toUpperCase()})
  ${signalsData.fear_greed.is_extreme_fear ? '→ EXTREME FEAR — This is where YOU get greedy, Warren.' : ''}
  ${signalsData.fear_greed.is_fear ? '→ FEAR territory — Others are fearful. Time to look for opportunity.' : ''}
  ${signalsData.fear_greed.is_greed ? '→ GREED territory — Others are greedy. Time to be cautious.' : ''}
  ${signalsData.fear_greed.is_extreme_greed ? '→ EXTREME GREED — Mr. Market is euphoric. Step back.' : ''}
- Market Regime: ${signalsData.regime.global.toUpperCase()}
- VIX: ${signalsData.regime.vix || 'N/A'} (you don't trade on VIX, but volatility = opportunity for the prepared)
- Bear Market %: ${signalsData.regime.bear_pct || 'N/A'}% of universe in bear territory
- Crash Mode: ${signalsData.regime.crash_mode?.active ? `ACTIVE — "Be greedy when others are fearful"` : 'INACTIVE'}

MRE SIGNAL SUMMARY:
- Total BUY signals: ${signalsData.signals.summary.total_buy}
- Total HOLD signals: ${signalsData.signals.summary.total_hold}
- Total WATCH signals: ${signalsData.signals.summary.total_watch}

TOP BUY SIGNALS FROM MRE SYSTEM (evaluate these as a business owner, not a trader):
${buySignals.map(signal => 
  `- ${signal.symbol}: MRE Strength ${signal.signal_strength?.toFixed(1)}%, Accuracy ${signal.expected_accuracy?.toFixed(0)}%, Regime ${signal.regime}${signal.sector ? `, Sector: ${signal.sector}` : ''}${signal.price ? `, Price: $${signal.price.toFixed(2)}` : ''}`
).join('\n')}

CURRENT PORTFOLIO POSITIONS (${positions.length} total):
${positions.length > 0 ? positions.map(pos => {
  const pnlPct = pos.current_price && pos.entry_price 
    ? ((pos.current_price - pos.entry_price) / pos.entry_price * 100).toFixed(2)
    : 'N/A';
  const daysHeld = Math.floor((Date.now() - new Date(pos.opened_at).getTime()) / (1000 * 60 * 60 * 24));
  return `- ${pos.symbol}: ${pos.qty} shares @ $${pos.entry_price}, Now $${pos.current_price || 'N/A'}, P&L ${pnlPct}%, Held ${daysHeld} days, Stop $${pos.stop_loss || 'N/A'}, Target $${pos.take_profit || 'N/A'}`;
}).join('\n') : 'No open positions.'}

MRE SIGNAL DATA FOR HELD POSITIONS:
${positions.length > 0 ? positions.map(pos => {
  const sig = signalsData.signals.by_asset_class.find(s => s.symbol === pos.symbol);
  if (!sig) return `- ${pos.symbol}: NO SIGNAL DATA`;
  return `- ${pos.symbol}: Signal=${sig.signal}, Strength=${sig.signal_strength?.toFixed(1)}%, Regime=${sig.regime}, Sector: ${sig.sector || 'N/A'}`;
}).join('\n') : 'No positions to analyze.'}

${signalsData.sector_fear_greed ? `SECTOR SENTIMENT (Fear & Greed by sector):
${Object.entries(signalsData.sector_fear_greed).map(([sector, fg]) => `- ${sector}: ${typeof fg === 'number' ? fg.toFixed(0) : fg}`).join('\n')}` : ''}

Today is ${today}. Analyze this portfolio and market from YOUR perspective — as a value investor and business owner. Focus on business quality, moats, and whether each position represents a wonderful business at a fair price. Challenge the short-term signals with your long-term wisdom.`;
}

export async function GET(request: NextRequest) {
  const authenticated = await getSession();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const today = new Date().toISOString().split('T')[0];

  try {
    const signalsData = await loadSignalsData(request);

    // Gate on stale data — don't waste API calls on expired signals
    const freshness = computeFreshness(signalsData.timestamp);
    if (!freshness.isActionable) {
      return NextResponse.json({
        date: today,
        market_assessment: `⚠️ Signal data is ${freshness.ageLabel} and has been auto-invalidated. Warren cannot provide reliable analysis on stale data. Please refresh signals first.`,
        pre_market_actions: [],
        market_hours_actions: [],
        positions_review: [],
        watchlist: [],
        risk_warnings: [
          `Signal data expired (${freshness.ageLabel}). All BUY signals auto-downgraded to WATCH.`,
          'Refresh signal data before requesting analysis.',
        ],
        generated_at: new Date().toISOString(),
        signal_timestamp: signalsData.timestamp,
        signal_freshness: {
          tier: freshness.tier,
          ageLabel: freshness.ageLabel,
          isActionable: false,
        },
        knowledge_version: "warren-buffett-v1-portfolio-letters",
        disclaimer: ADVISOR_DISCLAIMER,
        validation: { warnings: ['Analysis skipped — signal data is stale'], errors: [] },
        _stale_guard: true,
      });
    }

    let positions: PaperPosition[] = [];
    if (isPaperSupabaseConfigured()) {
      const { data: positionsData, error } = await paperSupabase
        .from('paper_positions')
        .select('*')
        .order('opened_at', { ascending: false });
      
      if (error) {
        console.error('Failed to fetch positions:', error);
      } else {
        positions = positionsData || [];
      }
    }

    const marketContext = buildMarketContext(signalsData, positions, today);

    // Build citation rules (freshness already computed above)
    const citationRules = buildCitationInstructions(
      signalsData.timestamp,
      signalsData.regime.global,
      `${freshness.emoji} ${freshness.ageLabel} (${freshness.tier})`
    );

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 2000,
        system: BUFFETT_SYSTEM_PROMPT,
        messages: [{ role: "user", content: marketContext + "\n\n" + citationRules }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", errText);
      return NextResponse.json({ error: "LLM API error", detail: errText }, { status: 502 });
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text || "";

    let jsonStr = text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();
    const braceStart = jsonStr.indexOf('{');
    if (braceStart > 0) jsonStr = jsonStr.slice(braceStart);

    const analysisResult = JSON.parse(jsonStr);

    // Post-generation validation (P0-2)
    const { signalLookup, positionLookup, knownTickers } = buildLookups(
      signalsData.signals.by_asset_class,
      positions.map(p => ({ symbol: p.symbol, current_price: p.current_price, entry_price: p.entry_price })),
    );

    const validation = validateAdvisorOutput(
      analysisResult,
      signalLookup,
      positionLookup,
      knownTickers,
    );

    return NextResponse.json({
      ...validation.cleanedOutput,
      generated_at: new Date().toISOString(),
      signal_timestamp: signalsData.timestamp,
      signal_freshness: {
        tier: freshness.tier,
        ageLabel: freshness.ageLabel,
        isActionable: freshness.isActionable,
      },
      knowledge_version: "warren-buffett-v1-portfolio-letters",
      disclaimer: ADVISOR_DISCLAIMER,
      validation: {
        warnings: validation.warnings,
        errors: validation.errors,
      },
    });

  } catch (error) {
    console.error("Buffett actions API error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      error: "Failed to generate Buffett's analysis",
      detail: errMsg,
      fallback: {
        date: today,
        market_assessment: `Analysis error: ${errMsg}`,
        pre_market_actions: [],
        market_hours_actions: [],
        positions_review: [],
        watchlist: [],
        risk_warnings: [`Error: ${errMsg}`]
      }
    }, { status: 500 });
  }
}
