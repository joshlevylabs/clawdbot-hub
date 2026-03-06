import { NextRequest, NextResponse } from "next/server";
import { getSessionAny } from '@/lib/auth';
import { paperSupabase, isPaperSupabaseConfigured, PaperPosition } from '@/lib/paper-supabase';
import { computeFreshness } from '@/lib/trading/signal-freshness';
import { buildLookups, validateAdvisorOutput, buildCitationInstructions, ADVISOR_DISCLAIMER } from '@/lib/trading/advisor-validation';
import { readFileSync } from 'fs';
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

export async function loadSignalsData(request: NextRequest): Promise<MRESignalsData> {
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

export function buildMarketContext(signalsData: MRESignalsData, positions: PaperPosition[], today: string): string {
  const buySignals = signalsData.signals.by_asset_class
    .filter(signal => signal.signal === 'BUY')
    .sort((a, b) => (b.signal_strength || 0) - (a.signal_strength || 0))
    .slice(0, 10);

  const watchSignals = signalsData.signals.by_asset_class
    .filter(signal => signal.signal === 'WATCH' || signal.signal === 'HOLD')
    .sort((a, b) => (b.signal_strength || 0) - (a.signal_strength || 0))
    .slice(0, 5);

  return `
LIVE MRE SIGNAL DATA (as of ${signalsData.timestamp}):

MARKET CONDITIONS:
- Fear & Greed Index: ${signalsData.fear_greed.current.toFixed(1)} (${signalsData.fear_greed.rating.toUpperCase()})
- Market Regime: ${signalsData.regime.global.toUpperCase()}
- VIX: ${signalsData.regime.vix || 'N/A'}
- Bear Market %: ${signalsData.regime.bear_pct || 'N/A'}%
- Crash Mode: ${signalsData.regime.crash_mode?.active ? `ACTIVE (severity: ${signalsData.regime.crash_mode?.severity || 'unknown'}, score: ${signalsData.regime.crash_mode?.crash_score || 'N/A'})` : 'INACTIVE'}

GLOBAL SIGNAL SUMMARY:
- Total BUY signals: ${signalsData.signals.summary.total_buy}
- Total HOLD signals: ${signalsData.signals.summary.total_hold}
- Total WATCH signals: ${signalsData.signals.summary.total_watch}

TOP BUY SIGNALS (${buySignals.length}):
${buySignals.map(signal =>
  `- ${signal.symbol}: Strength ${signal.signal_strength?.toFixed(1)}%, Accuracy ${signal.expected_accuracy?.toFixed(0)}%, Regime ${signal.regime}, F&G ${signal.current_fg?.toFixed(0)}, Source: ${signal.signal_source}, ${signal.strategies_agreeing}/8 strategies${signal.sector ? `, Sector: ${signal.sector}` : ''}${signal.price ? `, Price: $${signal.price.toFixed(2)}` : ''}${signal.rsi_14 ? `, RSI: ${signal.rsi_14.toFixed(1)}` : ''}${signal.momentum_20d ? `, Mom: ${signal.momentum_20d.toFixed(2)}%` : ''}`
).join('\n')}

WATCH/HOLD SIGNALS (${watchSignals.length}):
${watchSignals.map(signal =>
  `- ${signal.symbol}: ${signal.signal}, Strength ${signal.signal_strength?.toFixed(1)}%, Regime ${signal.regime}${signal.rsi_14 ? `, RSI: ${signal.rsi_14.toFixed(1)}` : ''}`
).join('\n')}

CURRENT PORTFOLIO POSITIONS (${positions.length} total):
${positions.length > 0 ? positions.map(pos => {
  const pnlPct = pos.current_price && pos.entry_price
    ? ((pos.current_price - pos.entry_price) / pos.entry_price * 100).toFixed(2)
    : 'N/A';
  const daysHeld = Math.floor((Date.now() - new Date(pos.opened_at).getTime()) / (1000 * 60 * 60 * 24));
  const holdTarget = pos.hold_days || 10;
  return `- ${pos.symbol}: ${pos.qty} shares, Entry $${pos.entry_price}, Current $${pos.current_price || 'N/A'}, P&L ${pnlPct}%, ${daysHeld}d held (target ${holdTarget}d), Stop $${pos.stop_loss || 'N/A'}, Target $${pos.take_profit || 'N/A'}, Regime at entry: ${pos.signal_regime || 'N/A'}`;
}).join('\n') : 'No open positions.'}

SIGNAL DATA FOR HELD POSITIONS:
${positions.length > 0 ? positions.map(pos => {
  const sig = signalsData.signals.by_asset_class.find(s => s.symbol === pos.symbol);
  if (!sig) return `- ${pos.symbol}: NO SIGNAL DATA AVAILABLE`;
  return `- ${pos.symbol}: Current Signal=${sig.signal}, Strength=${sig.signal_strength?.toFixed(1)}%, Regime=${sig.regime}, RSI=${sig.rsi_14?.toFixed(1) || 'N/A'}, Momentum=${sig.momentum_20d?.toFixed(2) || 'N/A'}%, ${sig.strategies_agreeing}/8 strategies agreeing`;
}).join('\n') : 'No positions to analyze.'}

${signalsData.sector_fear_greed ? `SECTOR FEAR & GREED:
${Object.entries(signalsData.sector_fear_greed).map(([sector, fg]) => `- ${sector}: ${typeof fg === 'number' ? fg.toFixed(0) : fg}`).join('\n')}` : ''}

Today is ${today}. Provide your analysis now — be specific about price levels, position sizes, and timing.

RESPOND IN THIS EXACT JSON FORMAT (no markdown, no explanation outside JSON):
{
  "market_assessment": "Your overall market view as a concise paragraph",
  "pre_market_actions": [{"title": "Action title", "priority": "high|medium|low", "detail": "Specific details with price levels"}],
  "market_hours_actions": [{"title": "Action title", "priority": "high|medium|low", "detail": "Specific details"}],
  "positions_review": [{"ticker": "SYM", "assessment": "bullish|bearish|neutral", "note": "Specific analysis with data references"}],
  "watchlist": [{"ticker": "SYM", "note": "Why watching, specific trigger levels"}],
  "risk_warnings": ["Specific risk warning with data"]
}`;
}

export interface AdvisorConfig {
  name: string;
  supabaseId: string; // matches agent_configs.id in Supabase
  systemPrompt: string;
  knowledgeVersion: string;
}

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

async function getAdvisorModel(supabaseId: string): Promise<string> {
  try {
    if (!isPaperSupabaseConfigured()) return DEFAULT_MODEL;
    const { data, error } = await paperSupabase
      .from('agent_configs')
      .select('model')
      .eq('id', supabaseId)
      .single();
    if (error || !data?.model) return DEFAULT_MODEL;
    return data.model;
  } catch {
    return DEFAULT_MODEL;
  }
}

interface TradeRecommendation {
  action: 'buy' | 'sell';
  symbol: string;
  priority: 'high' | 'medium' | 'low';
  rationale?: string;
  suggested_qty?: number;
  target_price?: number;
  stop_loss?: number;
  take_profit?: number;
  signal_strength?: number;
}

function extractTradeRecommendations(
  analysis: any,
  signalLookup: { [symbol: string]: { price?: number; signal?: string; signal_strength?: number; regime?: string; strategies_agreeing?: number } }
): TradeRecommendation[] {
  const recommendations: TradeRecommendation[] = [];
  
  // Extract from pre_market_actions
  if (analysis.pre_market_actions && Array.isArray(analysis.pre_market_actions)) {
    for (const action of analysis.pre_market_actions) {
      if (action.priority === 'high' && action.ticker) {
        const signal = signalLookup[action.ticker];
        recommendations.push({
          action: action.action?.toLowerCase() === 'sell' ? 'sell' : 'buy',
          symbol: action.ticker,
          priority: 'high',
          rationale: action.rationale || action.reasoning,
          target_price: action.target_price || signal?.price,
          stop_loss: action.stop_loss,
          take_profit: action.take_profit,
          signal_strength: signal?.signal_strength,
        });
      }
    }
  }
  
  // Extract from market_hours_actions  
  if (analysis.market_hours_actions && Array.isArray(analysis.market_hours_actions)) {
    for (const action of analysis.market_hours_actions) {
      if (action.priority === 'high' && action.ticker) {
        const signal = signalLookup[action.ticker];
        recommendations.push({
          action: action.action?.toLowerCase() === 'sell' ? 'sell' : 'buy',
          symbol: action.ticker,
          priority: 'high',
          rationale: action.rationale || action.reasoning,
          target_price: action.target_price || signal?.price,
          stop_loss: action.stop_loss,
          take_profit: action.take_profit,
          signal_strength: signal?.signal_strength,
        });
      }
    }
  }
  
  // Extract from positions_review (for sells)
  if (analysis.positions_review && Array.isArray(analysis.positions_review)) {
    for (const review of analysis.positions_review) {
      if (review.action?.toLowerCase() === 'sell' && review.priority === 'high' && review.symbol) {
        recommendations.push({
          action: 'sell',
          symbol: review.symbol,
          priority: 'high',
          rationale: review.rationale || review.reasoning,
          target_price: review.target_price,
        });
      }
    }
  }
  
  return recommendations;
}

export async function handleAdvisorRequest(
  request: NextRequest,
  config: AdvisorConfig,
): Promise<NextResponse> {
  const authenticated = await getSessionAny();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const today = new Date().toISOString().split('T')[0];

  try {
    const signalsData = await loadSignalsData(request);
    const freshness = computeFreshness(signalsData.timestamp);

    if (!freshness.isActionable) {
      return NextResponse.json({
        date: today,
        market_assessment: `⚠️ Signal data is ${freshness.ageLabel} and has been auto-invalidated. ${config.name} cannot provide reliable analysis on stale data. Please refresh signals first.`,
        pre_market_actions: [],
        market_hours_actions: [],
        positions_review: [],
        watchlist: [],
        risk_warnings: [
          `Signal data expired (${freshness.ageLabel}). Analysis skipped.`,
          'Refresh signal data before requesting analysis.',
        ],
        generated_at: new Date().toISOString(),
        signal_timestamp: signalsData.timestamp,
        signal_freshness: { tier: freshness.tier, ageLabel: freshness.ageLabel, isActionable: false },
        knowledge_version: config.knowledgeVersion,
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
      if (error) console.error('Failed to fetch positions:', error);
      else positions = positionsData || [];
    }

    const marketContext = buildMarketContext(signalsData, positions, today);
    const citationRules = buildCitationInstructions(
      signalsData.timestamp,
      signalsData.regime.global,
      `${freshness.emoji} ${freshness.ageLabel} (${freshness.tier})`
    );

    // Fetch configured model from Supabase (falls back to default)
    const model = await getAdvisorModel(config.supabaseId);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        system: config.systemPrompt + "\n\nCRITICAL OUTPUT RULE: You MUST respond with ONLY a valid JSON object. No markdown, no commentary, no preamble. Your entire response must be parseable JSON matching this schema: {market_assessment, pre_market_actions[], market_hours_actions[], positions_review[], watchlist[], risk_warnings[]}",
        messages: [
          { role: "user", content: marketContext + "\n\n" + citationRules },
          { role: "assistant", content: "{" },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`${config.name} API error:`, errText);
      return NextResponse.json({ error: "LLM API error", detail: errText }, { status: 502 });
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text || "";

    // Prepend "{" since we used assistant prefill
    let jsonStr = ("{" + text).trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();
    // Find the outermost JSON object
    const braceStart = jsonStr.indexOf('{');
    if (braceStart > 0) jsonStr = jsonStr.slice(braceStart);
    // Trim any trailing text after the JSON object
    const lastBrace = jsonStr.lastIndexOf('}');
    if (lastBrace > 0) jsonStr = jsonStr.slice(0, lastBrace + 1);

    const analysisResult = JSON.parse(jsonStr);

    const { signalLookup, positionLookup, knownTickers } = buildLookups(
      signalsData.signals.by_asset_class,
      positions.map(p => ({ symbol: p.symbol, current_price: p.current_price, entry_price: p.entry_price })),
    );

    const validation = validateAdvisorOutput(
      analysisResult, signalLookup, positionLookup, knownTickers,
    );

    // Extract trade recommendations from high-priority actions
    const tradeRecommendations = extractTradeRecommendations(
      validation.cleanedOutput,
      signalLookup
    );

    return NextResponse.json({
      ...validation.cleanedOutput,
      trade_recommendations: tradeRecommendations,
      generated_at: new Date().toISOString(),
      signal_timestamp: signalsData.timestamp,
      signal_freshness: { tier: freshness.tier, ageLabel: freshness.ageLabel, isActionable: freshness.isActionable },
      knowledge_version: config.knowledgeVersion,
      disclaimer: ADVISOR_DISCLAIMER,
      validation: { warnings: validation.warnings, errors: validation.errors },
    });

  } catch (error) {
    console.error(`${config.name} API error:`, error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      error: `Failed to generate ${config.name}'s analysis`,
      detail: errMsg,
      fallback: {
        date: today,
        market_assessment: `Analysis error: ${errMsg}`,
        pre_market_actions: [],
        market_hours_actions: [],
        positions_review: [],
        watchlist: [],
        risk_warnings: [`Error: ${errMsg}`],
      }
    }, { status: 500 });
  }
}
