import { NextRequest, NextResponse } from "next/server";
import { getSession } from '@/lib/auth';
import { paperSupabase, isPaperSupabaseConfigured, PaperPosition } from '@/lib/paper-supabase';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

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

interface ChrisActionsResponse {
  date: string;
  market_assessment: string;
  pre_market_actions: Array<{
    priority: "high" | "medium" | "low";
    action: string;
    ticker?: string;
    rationale: string;
  }>;
  market_hours_actions: Array<{
    priority: "high" | "medium" | "low";
    action: string;
    ticker?: string;
    price_level?: string;
    rationale: string;
  }>;
  positions_review: Array<{
    ticker: string;
    current_assessment: "hold" | "watch" | "trim" | "exit";
    note: string;
  }>;
  watchlist: string[];
  risk_warnings: string[];
}

const CHRIS_VERMEULEN_PROMPT = `You are Chris Vermeulen, a veteran technical analyst and swing trader known for your disciplined, systematic approach to the markets. You specialize in mean reversion strategies, Fibonacci analysis, and reading market cycles. Your style is confident but measured — you always emphasize risk management and position sizing.

Analyze the following market data and provide specific, actionable trading advice for today. Be direct and specific — use ticker symbols, price levels, and percentages. No generic advice.

Structure your response as JSON with this format:
{
  "date": "YYYY-MM-DD",
  "market_assessment": "1-2 sentence market overview",
  "pre_market_actions": [
    {
      "priority": "high" | "medium" | "low",
      "action": "specific action description",
      "ticker": "SYMBOL" (optional),
      "rationale": "why this matters"
    }
  ],
  "market_hours_actions": [
    {
      "priority": "high" | "medium" | "low",
      "action": "specific action description", 
      "ticker": "SYMBOL" (optional),
      "price_level": "$XXX.XX" (optional),
      "rationale": "why this matters"
    }
  ],
  "positions_review": [
    {
      "ticker": "SYMBOL",
      "current_assessment": "hold" | "watch" | "trim" | "exit",
      "note": "specific observation about this position"
    }
  ],
  "watchlist": ["SYMBOL1", "SYMBOL2"],
  "risk_warnings": ["warning1", "warning2"]
}`;

export async function GET(request: NextRequest) {
  // Check authentication
  const authenticated = await getSession();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const refresh = searchParams.get('refresh') === 'true';
  const today = new Date().toISOString().split('T')[0];

  // Check cache first (unless refresh requested)
  if (!refresh) {
    try {
      const cachedPath = join(process.cwd(), 'public/data/trading/chris-daily-actions.json');
      const cached = await readFile(cachedPath, 'utf-8');
      const cachedData = JSON.parse(cached);
      
      if (cachedData.date === today) {
        return NextResponse.json(cachedData);
      }
    } catch (error) {
      // Cache miss or error, continue to generate new analysis
    }
  }

  try {
    // 1. Read MRE signals data
    const signalsPath = join(process.cwd(), 'public/data/trading/mre-signals-universe.json');
    const signalsData: MRESignalsData = JSON.parse(await readFile(signalsPath, 'utf-8'));

    // 2. Fetch current positions from Supabase
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

    // 3. Extract top BUY signals
    const buySignals = signalsData.signals.by_asset_class
      .filter(signal => signal.signal === 'BUY')
      .sort((a, b) => (b.signal_strength || 0) - (a.signal_strength || 0))
      .slice(0, 10);

    // 4. Build market context prompt
    const marketContext = `
MARKET CONTEXT:
- Fear & Greed Index: ${signalsData.fear_greed.current.toFixed(1)} (${signalsData.fear_greed.rating.toUpperCase()})
- Market Regime: ${signalsData.regime.global.toUpperCase()}
- VIX: ${signalsData.regime.vix || 'N/A'}
- Bear Market %: ${signalsData.regime.bear_pct || 'N/A'}%
- Crash Mode: ${signalsData.regime.crash_mode?.active ? 'ACTIVE' : 'INACTIVE'} (${signalsData.regime.crash_mode?.severity || 'none'})

TODAY'S TOP BUY SIGNALS (${buySignals.length} total):
${buySignals.map(signal => 
  `- ${signal.symbol}: Strength ${signal.signal_strength?.toFixed(1)}%, Accuracy ${signal.expected_accuracy?.toFixed(0)}%, Regime ${signal.regime}, F&G ${signal.current_fg?.toFixed(0)}, Source: ${signal.signal_source}, ${signal.strategies_agreeing}/8 strategies${signal.sector ? `, Sector: ${signal.sector}` : ''}${signal.price ? `, Price: $${signal.price.toFixed(2)}` : ''}`
).join('\n')}

CURRENT POSITIONS (${positions.length} total):
${positions.map(pos => {
  const pnlPct = pos.current_price && pos.entry_price 
    ? ((pos.current_price - pos.entry_price) / pos.entry_price * 100).toFixed(2)
    : 'N/A';
  const daysHeld = Math.floor((Date.now() - new Date(pos.opened_at).getTime()) / (1000 * 60 * 60 * 24));
  const holdTarget = pos.hold_days || 10;
  return `- ${pos.symbol}: ${pos.qty} shares, Entry $${pos.entry_price}, Current $${pos.current_price || 'N/A'}, P&L ${pnlPct}%, ${daysHeld}d held (target ${holdTarget}d), Stop $${pos.stop_loss || 'N/A'}, Target $${pos.take_profit || 'N/A'}, Regime at entry: ${pos.signal_regime || 'N/A'}`;
}).join('\n')}

GLOBAL SIGNAL SUMMARY:
- Total BUY signals: ${signalsData.signals.summary.total_buy}
- Total HOLD signals: ${signalsData.signals.summary.total_hold}
- Total WATCH signals: ${signalsData.signals.summary.total_watch}
${signalsData.sector_fear_greed ? `
SECTOR FEAR & GREED:
${Object.entries(signalsData.sector_fear_greed).map(([sector, fg]) => `- ${sector}: ${typeof fg === 'number' ? fg.toFixed(0) : fg}`).join('\n')}` : ''}

SIGNAL DATA FOR HELD POSITIONS:
${positions.map(pos => {
  const sig = signalsData.signals.by_asset_class.find(s => s.symbol === pos.symbol);
  if (!sig) return `- ${pos.symbol}: NO SIGNAL DATA AVAILABLE`;
  return `- ${pos.symbol}: Current Signal=${sig.signal}, Strength=${sig.signal_strength?.toFixed(1)}%, Regime=${sig.regime}, RSI=${sig.rsi_14?.toFixed(1) || 'N/A'}, Momentum=${sig.momentum_20d?.toFixed(2) || 'N/A'}, ${sig.strategies_agreeing}/8 strategies agreeing`;
}).join('\n')}

Today is ${today}. Provide your Chris Vermeulen analysis — be specific about price levels, position sizes, and timing.`;

    // 5. Call Anthropic API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: CHRIS_VERMEULEN_PROMPT,
        messages: [
          {
            role: "user",
            content: marketContext,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", errText);
      return NextResponse.json(
        { error: "LLM API error", detail: errText },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text || "";

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const analysisResult: ChrisActionsResponse = JSON.parse(jsonStr);

    // 6. Cache the result
    try {
      const cacheDir = join(process.cwd(), 'public/data/trading');
      const cachedPath = join(cacheDir, 'chris-daily-actions.json');
      
      const cacheData = {
        ...analysisResult,
        generated_at: new Date().toISOString(),
        timestamp: signalsData.timestamp,
      };
      
      await writeFile(cachedPath, JSON.stringify(cacheData, null, 2));
    } catch (cacheError) {
      console.error('Failed to cache Chris actions:', cacheError);
      // Don't fail the request if caching fails
    }

    return NextResponse.json(analysisResult);

  } catch (error) {
    console.error("Chris actions API error:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate Chris's analysis", 
        detail: String(error),
        fallback: {
          date: today,
          market_assessment: "Chris's analysis is currently unavailable due to a technical issue.",
          pre_market_actions: [],
          market_hours_actions: [],
          positions_review: [],
          watchlist: [],
          risk_warnings: ["Analysis service temporarily unavailable"]
        }
      },
      { status: 500 }
    );
  }
}