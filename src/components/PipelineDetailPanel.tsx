"use client";

import { X, TrendingUp, TrendingDown, Filter, Minus, DollarSign, Activity, Search, ChevronDown, ChevronRight, Calendar, Target, TrendingDownIcon, Thermometer } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import TickerTechnicalBreakdown from './TickerTechnicalBreakdown';
import FibonacciInlineChart from './FibonacciInlineChart';

// Define MRESignal interface for rawData
interface MRESignal {
  symbol: string;
  signal: 'BUY' | 'HOLD' | 'SELL' | 'WATCH';
  signal_strength: number;
  signal_source: string;
  strategies_agreeing: number;
  current_fg: number;
  fear_threshold: number;
  fear_threshold_conservative: number;
  fear_threshold_opportunistic: number;
  regime: string;
  role: string;
  role_action: string;
  rotation_modifier: number;
  sideways_applied: boolean;
  kalshi_applied: boolean;
  cluster_limited: boolean;
  asset_confidence: number;
  cap_applied: boolean;
  crash_action: string;
  bear_suppressed: boolean;
  sell_suppressed: boolean;
  strategy_votes?: {
    fear_greed: boolean;
    regime_confirmation: boolean;
    rsi_oversold: boolean;
    mean_reversion: boolean;
    momentum: boolean;
    time_series_momentum?: boolean;
    qvm_factor?: boolean;
    vix_mean_reversion?: boolean;
  };
  persistence_by_strategy?: Record<string, number>;
  persistence_days?: number;
  persistence_confirmed?: boolean;
  price?: number;
  asset_class?: string;
  sector?: string;
  rsi_14?: number;
  bb_position?: string;
  dip_5d_pct?: number;
  return_5d?: number;
  momentum_20d?: number;
  volatility_20d?: number;
  regime_details?: {
    ema_20: number;
    ema_50: number;
    ema_100?: number;
    ema_150?: number;
    ema_200: number;
    ema_slow?: number;
    above_ema_20: boolean;
    above_ema_50: boolean;
    above_ema_100?: boolean;
    above_ema_150?: boolean;
    above_ema_200: boolean;
    regime_days: number;
    regime_stage: string;
    confidence: number;
    momentum_20d: number;
    ema_spread_pct: number;
  };
  fibonacci?: {
    symbol: string;
    current_price: number;
    swing_high: number;
    swing_low: number;
    swing_high_date?: string;
    swing_low_date?: string;
    swing_high_idx?: number;
    swing_low_idx?: number;
    trend: string;
    swing_quality?: string;
    lookback_period?: string;
    retracements?: Record<string, number>;  // {"0.0": 288.35, "23.6": 260.06, ...}
    extensions?: Record<string, number>;     // {"100.0": 363.07, ...}
    nearest_support?: number;
    nearest_resistance?: number;
    entry_zone?: string;                     // "242.56 - 214.27" (STRING!)
    profit_targets?: number[];               // [395.67, 437.15] (number array!)
    extension_type?: string;
    pullback_low?: number;
    pullback_high?: number;
    pullback_date?: string;
  };
  // New sector F&G fields from A-198 pipeline update
  global_fg?: number;
  sector_fg?: number;
  effective_fg?: number;
  fg_divergence?: number;
  fg_divergence_bonus?: number;
  fg_divergence_z_score?: number;
  fg_divergence_label?: 'normal' | 'elevated' | 'unusual' | 'extreme';
  fg_divergence_confidence?: 'insufficient' | 'low' | 'moderate' | 'high';
  fg_divergence_data_points?: number;
  fg_divergence_historical_mean?: number;
  fg_blend_weights?: {
    global_weight: number;
    sector_weight: number;
  };
  // Sector-equivalent thresholds (scaled by sector/global ratio)
  sector_fear_threshold_conservative?: number;
  sector_fear_threshold_opportunistic?: number;
  // Per-stage signal snapshots
  stage_signals?: {
    strategies: 'BUY' | 'HOLD' | 'SELL' | 'WATCH';
    signal_gating: 'BUY' | 'HOLD' | 'SELL' | 'WATCH';
    confidence_tuning: 'BUY' | 'HOLD' | 'SELL' | 'WATCH';
    final_filters: 'BUY' | 'HOLD' | 'SELL' | 'WATCH';
  };
}

interface TickerDetail {
  symbol: string;
  reason?: string;
  beforeValue?: number;
  afterValue?: number;
  signal?: string;
  signalStrength?: number;
  currentPrice?: number;
  adjustmentValue?: number;
  // Add full raw data
  rawData?: MRESignal;
}

interface StageDetails {
  name: string;
  description: string;
  stageType: 'input' | 'filter' | 'modifier' | 'output';
  inputCount: number;
  outputCount: number;
  filteredTickers: TickerDetail[];
  passedTickers: TickerDetail[];
  pendingTickers?: TickerDetail[];
}

interface PipelineDetailPanelProps {
  stageDetails: StageDetails | null;
  onClose: () => void;
}

// Strategy version data interfaces
interface StrategyVersion {
  version: string;
  date: string;
  changes: string[];
  accuracy: {
    overall: number;
    byAssetClass?: Record<string, number>;
  };
  winRate: number;
  sharpe: number;
  profitFactor: number;
}

interface StrategyVersionData {
  name: string;
  currentVersion: string;
  description: string;
  parameters: any;
  versions: StrategyVersion[];
  regressions: any[];
}

interface StrategyVersionsResponse {
  lastUpdated: string;
  strategies: Record<string, StrategyVersionData>;
}

// Strategy name to key mapping for version data
const STRATEGY_KEY_MAPPING: Record<string, string> = {
  'Blended F&G Strategy': 'fear_greed',
  'Fear & Greed Strategy': 'fear_greed', // Legacy support
  'Regime Confirm Strategy': 'regime_confirm', 
  'RSI Oversold Strategy': 'rsi_oversold',
  'RSI Oversold Strategy (MRE Regime Hybrid)': 'rsi_oversold',
  'Mean Reversion Strategy': 'mean_reversion',
  'Mean Reversion Strategy (Cross-Asset Pairs)': 'mean_reversion',
  'Momentum Strategy': 'momentum',
  'Momentum Strategy (Cross-Asset Predictor)': 'momentum',
};

// Check if this is the Blended F&G strategy modal
const isBlendedFGStrategy = (stageName: string): boolean => {
  return stageName.includes('Blended F&G') || stageName === 'Fear & Greed Strategy';
};

// Strategy descriptions mapping
const STRATEGY_DESCRIPTIONS: Record<string, string> = {
  // === Individual Strategy Stages (8 strategies) ===
  'Blended F&G Strategy': "Triggers BUY when the sector-blended Fear & Greed score drops below the ticker's fear threshold.\n\n**Filters:**\n• CNN Fear & Greed Index (global sentiment, 0–100)\n• Sector-specific F&G scores (per-sector sentiment)\n• Weighted blend: global vs sector weights vary by asset class (e.g., Energy 40/60, Broad Market 70/30)\n• Divergence bonus: when sector diverges >10 pts from global, weight shifts toward sector (max +25%)\n• Per-asset-class thresholds: Conservative (8) for panic entries, Opportunistic (19) for selective entries\n• Energy uses tighter thresholds (6/16) due to 96% bull regime and momentum conversion\n• Sector thresholds scale proportionally to the sector/global F&G ratio",
  'Fear & Greed Strategy': "Triggers BUY when the CNN Fear & Greed Index drops below the ticker's fear threshold.\n\n**Filters:**\n• CNN Fear & Greed Index score (0–100)\n• Conservative threshold: 8 (extreme panic entries)\n• Opportunistic threshold: 19 (selective fear entries)\n• Energy sector: 6/16 thresholds (momentum conversion)\n• Thresholds optimized in V15.1 Phase 5 via universe-scale backtests",
  'Multi-TF Trend Strategy': "Combines short, medium, and long-term trend confirmation with a dip entry filter. All 5 conditions must be true.\n\n**Filters (ALL required):**\n• Price > SMA(50) — short-term uptrend\n• SMA(50) > SMA(100) — medium-term uptrend\n• SMA(100) > SMA(200) — long-term uptrend\n• SMA(50) 20-day slope > 0 — trend acceleration confirmed\n• Price < SMA(20) — buying the dip within the uptrend\n\n**Strength factors:** Dip depth below SMA(20) + slope magnitude. Deeper dips in strong uptrends score higher.",
  'ConnorsRSI Strategy': "Uses ConnorsRSI (a composite of RSI, streak length, and percentile rank) to identify short-term oversold conditions in confirmed uptrends.\n\n**Filters (ALL required):**\n• ConnorsRSI < 15 — composite oversold signal\n• Price > SMA(200) — long-term uptrend filter\n\n**ConnorsRSI components:** RSI(3) short-term momentum + RSI(2) of streak length + percentile rank of current return vs. historical returns. More responsive than standard RSI(14).\n\n**Fallback:** If ConnorsRSI unavailable, uses RSI(14) < 20 with SMA(50) > SMA(200) trend filter.",
  'Dual Band MR Strategy': "Dual-band mean reversion combining Bollinger Bands and Keltner Channels with volume confirmation. Requires 3 of 4 conditions.\n\n**Filters (3 of 4 required):**\n• Price < Bollinger lower band (20-period, 2σ)\n• Price < Keltner lower channel (20-period, 1.5× ATR)\n• Volume > 1.5× 20-day average — capitulation confirmation\n• Price < 1% below the lowest band — persistence proxy\n\n**Strength factors:** Overshoot depth below both bands + volume surge magnitude. Dual-band confirmation reduces false signals vs. single-band approaches.\n\n**Fallback:** If Keltner data unavailable, uses Bollinger-only logic.",
  'Dual Momentum Strategy': "Implements Antonacci's dual momentum framework with multi-window acceleration. All 3 momentum types must confirm.\n\n**Filters (ALL required):**\n• Absolute momentum: 12-month return > 4.5% (risk-free rate) — beats cash\n• Relative momentum: top 30% of universe by 12-month return — outperforming peers\n• Acceleration: 1-month > 3-month > 6-month return — momentum is accelerating, not decelerating\n\n**Strength factors:** 12-month return magnitude + acceleration quality (1m − 6m spread). Filters out decelerating trends that may be topping.",
  'TS Momentum Strategy': "AQR-style time-series (trend-following) momentum with volatility targeting. Captures persistent trends while scaling for risk.\n\n**Filters:**\n• 12-month excess return > 0 (return minus ~4.5% risk-free rate)\n• Realized volatility available (20-day) for position sizing\n\n**Signal strength:** Excess return × (1 / volatility) — higher returns with lower volatility produce stronger signals. This is the core managed-futures insight: trend following works better when risk-adjusted.\n\n**Fallback:** If 12-month return unavailable, extrapolates from 20-day momentum × 8.",
  'QVM Factor Strategy': "Quality-Value-Momentum three-factor screen. Combines fundamental quality, relative value, and price momentum. All 3 factors required.\n\n**Filters (ALL required):**\n• Quality: ROE > 15% AND debt-to-equity < 1.0 — profitable with manageable leverage\n• Value: P/E ratio in bottom 30th percentile of sector — cheap relative to peers\n• Momentum: 12-1 month momentum positive — price trend confirms fundamentals\n\n**Data source:** Fundamental data from cached financial statements. ETFs and tickers without fundamental data are automatically skipped.\n\n**Strength factors:** ROE above 15% threshold + debt headroom below 1.0 + momentum magnitude.",
  'VIX Reversion Strategy': "Contrarian VIX spike strategy. Buys equities when fear spikes sharply, betting on mean reversion in volatility.\n\n**Filters (ALL required):**\n• VIX > 25 — elevated fear level\n• VIX 5-day change > +30% — sharp spike (not just elevated)\n• Equity asset classes only (broad market, technology, financials, energy)\n• Does NOT fire for bonds, commodities, or international\n\n**Exit rules:** Target VIX < 20 or max hold 10 days.\n\n**Strength:** Proportional to how far VIX exceeds 25. A VIX of 35 produces a stronger signal than 26.",
  // Legacy name mappings
  'Regime Confirm Strategy': "Confirms BUY signals only when the ticker is in a bull regime (price above SMA), ensuring trades align with the broader trend direction.",
  'RSI Oversold Strategy': "Uses ConnorsRSI < 15 with price > SMA(200) uptrend filter to identify oversold bounces.",
  'Mean Reversion Strategy': "Dual-band mean reversion: Price below both Bollinger and Keltner lower bands with volume confirmation.",
  'Momentum Strategy': "Dual momentum: absolute (beats risk-free), relative (top 30%), and acceleration (1m > 3m > 6m).",
  // === Pipeline Stages ===
  'Vote Consensus Gate': "Classifies tickers by how many of the 8 strategies voted BUY, showing consensus strength from 1-of-8 (weak consensus) to 8-of-8 (unanimous agreement).",
  '1-of-8 Vote Consensus': "Tickers where exactly 1 of the 8 strategies voted BUY. Low consensus signals with higher risk but potentially overlooked opportunities.",
  '2-of-8 Vote Consensus': "Tickers where exactly 2 of the 8 strategies voted BUY. Moderate consensus signals with balanced risk-reward profile.",
  '3-of-8 Vote Consensus': "Tickers where exactly 3 of the 8 strategies voted BUY. Strong consensus signals with higher confidence and lower risk.",
  '4-of-8 Vote Consensus': "Tickers where exactly 4 of the 8 strategies voted BUY. Very strong consensus signals with high confidence.",
  '5-of-8 Vote Consensus': "Tickers where 5 of the 8 strategies voted BUY. Very strong consensus.",
  '6-of-8 Vote Consensus': "Tickers where 6 of the 8 strategies voted BUY. Near-unanimous consensus.",
  '7-of-8 Vote Consensus': "Tickers where 7 of the 8 strategies voted BUY. Near-unanimous consensus.",
  '8-of-8 Vote Consensus': "Tickers where all 8 strategies unanimously voted BUY. Maximum consensus signals with highest confidence and lowest risk.",
  'Signal Gating': "A pass-through filter that operates on persistence-confirmed signals only. Applies defensive logic to reduce risk without modifying signal scores.\n\n**Bear Regime Suppression:**\n• Converts BUY signals to HOLD when a ticker's regime is bearish (price below key moving averages)\n• Prevents buying into downtrends regardless of strategy consensus strength\n\n**Sell Suppression:**\n• Converts SELL signals to HOLD to prevent panic selling during uncertain market conditions\n• Maintains defensive positioning rather than actively shorting\n\n**Pass-Through Design:**\n• No score modification — only signal suppression (BUY→HOLD, SELL→HOLD)\n• Operates exclusively on signals that have already passed 2-day persistence confirmation\n• Consensus tier structure is preserved through gating",
  'Confidence Tuning': "Assigns each ticker a confidence score (0-100%) based on multiple contextual factors, then filters signals based on confidence thresholds.\n\n**How confidence is calculated:**\n• Each ticker starts with a base confidence score from the raw signal strength\n• **Regime weight modifier:** Bull regime multiplies confidence by 1.2×, sideways by 1.0×, bear by 0.6×\n• **Sector rotation modifier:** Sectors in favorable rotation phase get boosted (>1.0×), unfavorable get penalized (<1.0×)\n• **Asset role consideration:** Core positions (All-Weather) vs Satellite positions are treated differently in the calculation\n• **Sideways penalty:** Range-bound markets get confidence reduced to account for lower trend reliability\n• **Kalshi adjustment:** When prediction market data is available, incorporates market-implied probabilities\n\n**Final filtering by confidence:**\n• **High confidence (≥70%):** Signal passes through unchanged\n• **Medium confidence (40-70%):** Signal may be moderated but generally passes\n• **Low confidence (<40%):** Signal gets filtered to HOLD to prevent weak entries\n\nThis ensures only signals with sufficient contextual support reach the portfolio, filtering out trades that may look good in isolation but lack broader market confirmation.",
  'Final Filters': "Last-pass filters that enforce portfolio construction rules and risk management.\n\n**Filters:**\n• Cluster limit: max 2 BUY signals per sector (prevents over-concentration)\n• Asset confidence threshold: minimum confidence required to pass\n• Crash mode protection: suppresses all BUY signals during market crashes (VIX spike + broad decline)\n• Multiplier caps: limits maximum position sizing multipliers",
  // === Portfolio Exit Strategies ===
  'Stop Loss Proximity': "Evaluates how close each position's current price is to its stop loss level.\n\n**Logic:**\n• Calculates distance: |current_price − stop_loss| / current_price\n• Triggers when distance < 10% — the position is dangerously close to the stop\n• Positions without a stop loss set are excluded (no trigger)\n\n**Why it matters:** Positions approaching their stop loss have already moved significantly against the thesis. Even if not yet stopped out, proximity signals deteriorating conviction and rising risk.",
  'Strategy Consensus': "Checks whether the strategy vote consensus that supported the original entry has decayed since the position was opened.\n\n**Logic:**\n• Retrieves entry-time signal confidence from the position record\n• Converts to estimated entry votes: round(confidence / 100 × 8 strategies)\n• Counts current active strategy votes for the ticker\n• Triggers when current votes < entry votes — consensus has weakened\n\n**Why it matters:** If the strategies that agreed to buy no longer agree, the original thesis may be breaking down. Decaying consensus is an early warning before price fully reflects the change.",
  'Momentum Reversal': "Detects when 20-day price momentum has turned negative for a held position.\n\n**Logic:**\n• Reads the ticker's `momentum_20d` value from the MRE signal data\n• Triggers when momentum_20d < 0 — the 20-day trend has flipped negative\n\n**Why it matters:** Negative 20-day momentum means the medium-term trend is reversing. Holding through a momentum reversal increases drawdown risk. Combined with other exit signals, this is a strong indicator to reduce exposure.",
  'Sector Sentiment': "Flags positions in sectors showing extreme greed on the Fear & Greed composite.\n\n**Logic:**\n• Reads sector-specific F&G score (falls back to effective F&G → global F&G)\n• Triggers when sector F&G > 70 — the sector is in extreme greed territory\n\n**Why it matters:** Extreme sector greed historically precedes sector rotations and pullbacks. Positions in overheated sectors carry elevated mean-reversion risk. This is the Portfolio flow's counterpart to the Pipeline's fear-based buy logic.",
  'Regime Check': "Detects when the market regime has changed since the position was opened.\n\n**Logic:**\n• Stores the regime at entry time on each position record (bull/sideways/bear)\n• Compares entry regime to the ticker's current regime from MRE signal data\n• Triggers when entry_regime ≠ current_regime — the environment has shifted\n\n**Why it matters:** A position entered during a bull regime may not be appropriate in a sideways or bear regime. Regime shifts invalidate the original entry context and signal that position sizing and thesis should be re-evaluated.",
  'RSI Overbought': "Identifies positions where the RSI(14) has climbed above 70, signaling overbought conditions.\n\n**Logic:**\n• Reads the ticker's `rsi_14` value from MRE signal data\n• Triggers when RSI(14) > 70 — standard overbought threshold\n\n**Why it matters:** RSI above 70 historically signals that a pullback is likely. For existing positions, this is a profit-taking signal — especially when combined with other exit signals like Fibonacci targets or momentum reversal.",
  'Fibonacci Target': "Checks whether the position's current price has reached Fibonacci extension targets.\n\n**Logic:**\n• Reads Fibonacci profit targets from the MRE signal data\n• Calculates distance to the nearest extension target\n• Triggers when price is within 5% of a Fibonacci extension level\n\n**Why it matters:** Fibonacci extensions are natural resistance levels where profit-taking pressure increases. Positions near their targets have realized most of their expected move. Combined with RSI or momentum signals, this is a strong sell trigger.",
  'Hold Time Analysis': "Evaluates whether a position has been held longer than its target hold period.\n\n**Logic:**\n• Calculates actual hold days: (now − opened_at) in days\n• Compares to the position's target hold period (default: 10 days if not set)\n• Triggers when hold_days ≥ target — the position has exceeded its intended timeframe\n\n**Why it matters:** Positions held beyond their target period often reflect thesis drift — the original catalyst may have passed. Time decay of edge is real: the longer you hold beyond the target, the more likely the position is drifting without conviction.",
  'Portfolio Input': "All open positions in the paper trading portfolio, loaded from the portfolio API. Each position includes entry price, current price, stop loss, take profit, entry regime, signal confidence, and hold duration.\n\nThis is the starting point of the exit pipeline — every position gets evaluated by all 8 exit strategies.",
  'Exit Gating': "Risk management layer that applies urgency multipliers to exit recommendations based on combined signals.\n\n**Logic:**\n• Base urgency: 1.0× for all positions\n• **Negative P&L + multiple exit signals:** Urgency increases to 1.5× — losing positions with multiple exit flags need faster attention\n• **Positive P&L + Fibonacci target hit:** Urgency set to 1.2× — profit-taking opportunity\n• Positions pass through with their urgency score attached\n\n**Why it matters:** Not all exit signals are equally urgent. A profitable position near a Fibonacci target is a different situation than a losing position with decaying consensus and regime change. The gating layer prioritizes which exits need immediate attention.",
  'HOLD Recommendation': "Positions with 0–2 exit signals. Low risk — maintain current position.\n\nThese positions still have strong thesis support: regime hasn't changed, strategy consensus is intact, momentum is positive, and they're not near stop loss or overbought levels.",
  'WATCH Recommendation': "Positions with 3–4 exit signals. Elevated risk — monitor closely.\n\nMultiple exit strategies are flagging concerns. The position isn't urgent enough to exit immediately, but conditions are deteriorating. Review at next daily check.",
  'TRIM Recommendation': "Positions with 5–6 exit signals. High risk — reduce position size.\n\nMore than half of exit strategies are flagging. The thesis is significantly weakened. Reduce exposure by selling a portion to lock in gains or limit losses.",
  'EXIT Recommendation': "Positions with 7+ exit signals. Critical risk — close position.\n\nNearly all exit strategies agree: the position should be closed. The original thesis has broken down across momentum, regime, sentiment, and technical levels.",
};

// Helper function to check if this is an individual strategy stage
const isIndividualStrategy = (stageName: string): boolean => {
  return stageName.includes('Fear & Greed Strategy') ||
         stageName.includes('Blended F&G Strategy') ||
         stageName.includes('Regime Confirm Strategy') ||
         stageName.includes('RSI Oversold Strategy') ||
         stageName.includes('Mean Reversion Strategy') ||
         stageName.includes('Momentum Strategy');
};

// Component to show strategy-specific parameters
function StrategyParameters({ 
  strategyName, 
  sampleTicker 
}: { 
  strategyName: string; 
  sampleTicker?: TickerDetail; 
}) {
  if (!sampleTicker?.rawData) {
    return <div className="text-sm text-slate-400">No data available</div>;
  }

  const data = sampleTicker.rawData;

  if (strategyName.includes('Fear & Greed')) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="text-xs text-slate-500">Current F&G Index</div>
          <div className="text-lg font-bold text-slate-200">{data.current_fg?.toFixed(0) || 'N/A'}</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="text-xs text-slate-500">Fear Threshold</div>
          <div className="text-lg font-bold text-slate-200">{data.fear_threshold || 'N/A'}</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="text-xs text-slate-500">Signal Trigger</div>
          <div className={`text-sm font-medium ${(data.current_fg || 0) <= (data.fear_threshold || 0) ? 'text-emerald-400' : 'text-red-400'}`}>
            {(data.current_fg || 0) <= (data.fear_threshold || 0) ? 'BUY Triggered' : 'No Signal'}
          </div>
        </div>
      </div>
    );
  }

  if (strategyName.includes('Regime Confirm')) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="text-xs text-slate-500">Current Regime</div>
          <div className="text-lg font-bold text-slate-200 capitalize">{data.regime}</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="text-xs text-slate-500">Required for BUY</div>
          <div className="text-lg font-bold text-slate-200">Bull</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="text-xs text-slate-500">Status</div>
          <div className={`text-sm font-medium ${data.regime === 'bull' ? 'text-emerald-400' : 'text-red-400'}`}>
            {data.regime === 'bull' ? 'Confirmed' : 'Not Confirmed'}
          </div>
        </div>
      </div>
    );
  }

  if (strategyName.includes('RSI Oversold')) {
    const rsiOversold = (data.rsi_14 || 100) < 20;
    const strategyVoted = data.strategy_votes?.rsi_oversold === true;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="text-xs text-slate-500">Current RSI (14)</div>
          <div className={`text-lg font-bold ${rsiOversold ? 'text-emerald-400' : 'text-slate-200'}`}>{data.rsi_14?.toFixed(1) || 'N/A'}</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="text-xs text-slate-500">RSI Threshold</div>
          <div className="text-lg font-bold text-slate-200">&lt; 20</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="text-xs text-slate-500">Trend (SMA50 &gt; SMA200)</div>
          <div className={`text-sm font-medium ${data.regime === 'bull' ? 'text-emerald-400' : 'text-red-400'}`}>
            {data.regime === 'bull' ? '✓ Uptrend' : '✗ No uptrend'}
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="text-xs text-slate-500">Strategy Vote</div>
          <div className={`text-sm font-medium ${strategyVoted ? 'text-emerald-400' : 'text-red-400'}`}>
            {strategyVoted ? '✓ BUY' : rsiOversold ? '✗ RSI low but no uptrend' : '✗ Not triggered'}
          </div>
        </div>
      </div>
    );
  }

  if (strategyName.includes('Mean Reversion')) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="text-xs text-slate-500">5-Day Return</div>
          <div className="text-lg font-bold text-slate-200">{data.return_5d?.toFixed(1) || 'N/A'}%</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="text-xs text-slate-500">Dip Threshold</div>
          <div className="text-lg font-bold text-slate-200">-5.0%</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="text-xs text-slate-500">Status</div>
          <div className={`text-sm font-medium ${(data.return_5d || 0) <= -5.0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {(data.return_5d || 0) <= -5.0 ? 'Dip Detected' : 'No Dip'}
          </div>
        </div>
      </div>
    );
  }

  if (strategyName.includes('Momentum')) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="text-xs text-slate-500">20-Day Momentum</div>
          <div className="text-lg font-bold text-slate-200">{data.momentum_20d?.toFixed(1) || 'N/A'}%</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="text-xs text-slate-500">Minimum Threshold</div>
          <div className="text-lg font-bold text-slate-200">+10.0%</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="text-xs text-slate-500">Status</div>
          <div className={`text-sm font-medium ${(data.momentum_20d || 0) >= 10.0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {(data.momentum_20d || 0) >= 10.0 ? 'Strong Momentum' : 'Weak Momentum'}
          </div>
        </div>
      </div>
    );
  }

  return <div className="text-sm text-slate-400">Strategy parameters not available</div>;
};

// ============================================================
// Strategy Technical Overview — visual breakdown for individual strategies
// ============================================================
function StrategyTechnicalOverview({ strategyName, tickers }: { strategyName: string; tickers: TickerDetail[] }) {
  const [vixData, setVixData] = useState<{ current: number; vix: number } | null>(null);

  // Fetch VIX data for VIX Reversion Strategy
  useEffect(() => {
    if (strategyName.includes('VIX')) {
      const fetchVixData = async () => {
        try {
          const res = await fetch('/data/trading/mre-signals-universe.json');
          if (res.ok) {
            const data = await res.json();
            setVixData({
              current: data.fear_greed?.current ?? 0,
              vix: data.regime?.vix ?? 0
            });
          }
        } catch { /* ignore */ }
      };
      fetchVixData();
    }
  }, [strategyName]);

  const getFGColor = (score: number) => {
    if (score < 25) return 'text-red-400';
    if (score < 40) return 'text-orange-400';
    if (score < 60) return 'text-amber-400';
    if (score < 75) return 'text-emerald-400';
    return 'text-green-400';
  };

  const getBBPositionColor = (position: string) => {
    switch(position) {
      case 'below_lower': return 'text-red-400';
      case 'above_upper': return 'text-emerald-400';
      case 'within_bands': return 'text-amber-400';
      default: return 'text-slate-400';
    }
  };

  const getBBPositionLabel = (position: string) => {
    switch(position) {
      case 'below_lower': return 'Below Lower';
      case 'above_upper': return 'Above Upper'; 
      case 'within_bands': return 'Within Bands';
      default: return 'Unknown';
    }
  };

  // Multi-TF Trend Strategy
  if (strategyName.includes('Multi-TF Trend') || strategyName.includes('Regime Confirm')) {
    const regimeCounts = tickers.reduce((acc, t) => {
      const regime = t.rawData?.regime || 'unknown';
      acc[regime] = (acc[regime] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = tickers.length;
    const bullPct = ((regimeCounts.bull || 0) / total) * 100;
    const sidewaysPct = ((regimeCounts.sideways || 0) / total) * 100;
    const bearPct = ((regimeCounts.bear || 0) / total) * 100;

    // Estimate trend conditions (simplified since full SMA data not available)
    const positiveMomentum = tickers.filter(t => (t.rawData?.momentum_20d || 0) > 0).length;
    const momentumPct = (positiveMomentum / total) * 100;

    return (
      <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-5 h-5 text-primary-400" />
          <h3 className="text-base font-semibold text-slate-200">Multi-Timeframe Trend Analysis</h3>
        </div>

        {/* Regime Distribution */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-900/50 rounded-lg p-4 text-center border border-emerald-700/40">
            <div className="text-xs text-slate-500 mb-1">Bull Regime</div>
            <div className="text-2xl font-bold text-emerald-400">{bullPct.toFixed(0)}%</div>
            <div className="text-xs text-slate-400">{regimeCounts.bull || 0} tickers</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4 text-center border border-amber-700/40">
            <div className="text-xs text-slate-500 mb-1">Sideways</div>
            <div className="text-2xl font-bold text-amber-400">{sidewaysPct.toFixed(0)}%</div>
            <div className="text-xs text-slate-400">{regimeCounts.sideways || 0} tickers</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4 text-center border border-red-700/40">
            <div className="text-xs text-slate-500 mb-1">Bear Regime</div>
            <div className="text-2xl font-bold text-red-400">{bearPct.toFixed(0)}%</div>
            <div className="text-xs text-slate-400">{regimeCounts.bear || 0} tickers</div>
          </div>
        </div>

        {/* Trend Conditions Summary */}
        <div className="bg-slate-900/40 rounded-lg p-4">
          <h4 className="text-sm font-medium text-slate-300 mb-3">Trend Condition Health</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">✓ Positive 20d Momentum</span>
              <span className={`text-sm font-medium ${momentumPct >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                {momentumPct.toFixed(0)}% ({positiveMomentum} tickers)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">✓ Bull Regime (Price &gt; SMA structure)</span>
              <span className={`text-sm font-medium ${bullPct >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                {bullPct.toFixed(0)}% ({regimeCounts.bull || 0} tickers)
              </span>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Strategy requires ALL 5 conditions: Price &gt; SMA(50) &gt; SMA(100) &gt; SMA(200), SMA(50) slope &gt; 0, Price &lt; SMA(20)
          </div>
        </div>
      </div>
    );
  }

  // ConnorsRSI Strategy
  if (strategyName.includes('RSI') || strategyName.includes('Oversold')) {
    const rsiData = tickers
      .filter(t => t.rawData?.rsi_14 !== undefined)
      .map(t => t.rawData!.rsi_14!);

    const oversoldCount = rsiData.filter(rsi => rsi < 20).length;
    const deepOversoldCount = rsiData.filter(rsi => rsi < 15).length;
    const neutralCount = rsiData.filter(rsi => rsi >= 20 && rsi < 50).length;
    const avgRSI = rsiData.length > 0 ? rsiData.reduce((a, b) => a + b, 0) / rsiData.length : 0;

    const bullRegimeCount = tickers.filter(t => t.rawData?.regime === 'bull').length;
    const bullPct = (bullRegimeCount / tickers.length) * 100;

    return (
      <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-3 mb-4">
          <TrendingDown className="w-5 h-5 text-primary-400" />
          <h3 className="text-base font-semibold text-slate-200">ConnorsRSI Oversold Analysis</h3>
        </div>

        {/* RSI Distribution */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-red-900/30 border border-red-700/40 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">RSI &lt; 15</div>
            <div className="text-lg font-bold text-red-400">{deepOversoldCount}</div>
            <div className="text-xs text-slate-400">Deep oversold</div>
          </div>
          <div className="bg-orange-900/30 border border-orange-700/40 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">RSI 15-20</div>
            <div className="text-lg font-bold text-orange-400">{oversoldCount - deepOversoldCount}</div>
            <div className="text-xs text-slate-400">Oversold</div>
          </div>
          <div className="bg-amber-900/30 border border-amber-700/40 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">RSI 20-50</div>
            <div className="text-lg font-bold text-amber-400">{neutralCount}</div>
            <div className="text-xs text-slate-400">Neutral</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">Avg RSI</div>
            <div className="text-lg font-bold text-slate-200">{avgRSI.toFixed(1)}</div>
            <div className="text-xs text-slate-400">Universe</div>
          </div>
        </div>

        {/* Trend Filter */}
        <div className="bg-slate-900/40 rounded-lg p-4">
          <h4 className="text-sm font-medium text-slate-300 mb-3">Trend Filter Status</h4>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Bull Regime (Price &gt; SMA 200)</span>
            <span className={`text-sm font-medium ${bullPct >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
              {bullPct.toFixed(0)}% ({bullRegimeCount} of {tickers.length})
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Strategy triggers when ConnorsRSI &lt; 15 AND price is above long-term uptrend
          </div>
        </div>
      </div>
    );
  }

  // Dual Band Mean Reversion Strategy
  if (strategyName.includes('Mean Reversion') || strategyName.includes('Dual Band')) {
    const bbPositions = tickers.reduce((acc, t) => {
      const pos = t.rawData?.bb_position || 'unknown';
      acc[pos] = (acc[pos] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = tickers.length;
    const belowLowerPct = ((bbPositions.below_lower || 0) / total) * 100;
    const withinBandsPct = ((bbPositions.within_bands || 0) / total) * 100;
    const aboveUpperPct = ((bbPositions.above_upper || 0) / total) * 100;

    // Calculate average 5-day return as proxy for dip activity
    const returnData = tickers
      .filter(t => t.rawData?.return_5d !== undefined)
      .map(t => t.rawData!.return_5d!);
    const avgReturn5d = returnData.length > 0 ? returnData.reduce((a, b) => a + b, 0) / returnData.length : 0;
    const bigDipsCount = returnData.filter(r => r <= -5.0).length;

    return (
      <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-3 mb-4">
          <Minus className="w-5 h-5 text-primary-400" />
          <h3 className="text-base font-semibold text-slate-200">Dual Band Mean Reversion</h3>
        </div>

        {/* Bollinger Position Distribution */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className={`rounded-lg p-4 text-center border ${bbPositions.below_lower ? 'bg-red-900/30 border-red-700/40' : 'bg-slate-900/50 border-slate-700/50'}`}>
            <div className="text-xs text-slate-500 mb-1">Below Lower Band</div>
            <div className={`text-2xl font-bold ${getBBPositionColor('below_lower')}`}>{belowLowerPct.toFixed(0)}%</div>
            <div className="text-xs text-slate-400">{bbPositions.below_lower || 0} tickers</div>
          </div>
          <div className={`rounded-lg p-4 text-center border ${bbPositions.within_bands ? 'bg-amber-900/30 border-amber-700/40' : 'bg-slate-900/50 border-slate-700/50'}`}>
            <div className="text-xs text-slate-500 mb-1">Within Bands</div>
            <div className={`text-2xl font-bold ${getBBPositionColor('within_bands')}`}>{withinBandsPct.toFixed(0)}%</div>
            <div className="text-xs text-slate-400">{bbPositions.within_bands || 0} tickers</div>
          </div>
          <div className={`rounded-lg p-4 text-center border ${bbPositions.above_upper ? 'bg-emerald-900/30 border-emerald-700/40' : 'bg-slate-900/50 border-slate-700/50'}`}>
            <div className="text-xs text-slate-500 mb-1">Above Upper Band</div>
            <div className={`text-2xl font-bold ${getBBPositionColor('above_upper')}`}>{aboveUpperPct.toFixed(0)}%</div>
            <div className="text-xs text-slate-400">{bbPositions.above_upper || 0} tickers</div>
          </div>
        </div>

        {/* Mean Reversion Activity */}
        <div className="bg-slate-900/40 rounded-lg p-4">
          <h4 className="text-sm font-medium text-slate-300 mb-3">Dip Activity</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Average 5-day return</span>
              <span className={`text-sm font-medium ${avgReturn5d < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {avgReturn5d > 0 ? '+' : ''}{avgReturn5d.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Big dips (-5% or worse)</span>
              <span className={`text-sm font-medium ${bigDipsCount > 0 ? 'text-orange-400' : 'text-slate-400'}`}>
                {bigDipsCount} tickers ({((bigDipsCount / total) * 100).toFixed(0)}%)
              </span>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Strategy requires 3 of 4: Price &lt; BB lower, Price &lt; Keltner lower, Volume &gt; 1.5x avg, persistence proxy
          </div>
        </div>
      </div>
    );
  }

  // Dual Momentum Strategy
  if (strategyName.includes('Momentum Strategy') && !strategyName.includes('TS')) {
    const momentumData = tickers
      .filter(t => t.rawData?.momentum_20d !== undefined)
      .map(t => t.rawData!.momentum_20d!);

    const positiveMomentumCount = momentumData.filter(m => m > 0).length;
    const strongMomentumCount = momentumData.filter(m => m >= 10).length;
    const avgMomentum = momentumData.length > 0 ? momentumData.reduce((a, b) => a + b, 0) / momentumData.length : 0;

    const positivePct = (positiveMomentumCount / tickers.length) * 100;
    const strongPct = (strongMomentumCount / tickers.length) * 100;

    return (
      <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="w-5 h-5 text-primary-400" />
          <h3 className="text-base font-semibold text-slate-200">Dual Momentum Analysis</h3>
        </div>

        {/* Momentum Distribution */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">Average</div>
            <div className={`text-lg font-bold ${avgMomentum >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {avgMomentum > 0 ? '+' : ''}{avgMomentum.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-400">20d momentum</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">Positive</div>
            <div className={`text-lg font-bold ${positivePct >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
              {positivePct.toFixed(0)}%
            </div>
            <div className="text-xs text-slate-400">{positiveMomentumCount} tickers</div>
          </div>
          <div className="bg-emerald-900/30 border border-emerald-700/40 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">Strong (+10%)</div>
            <div className="text-lg font-bold text-emerald-400">{strongPct.toFixed(0)}%</div>
            <div className="text-xs text-slate-400">{strongMomentumCount} tickers</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">Sample Size</div>
            <div className="text-lg font-bold text-slate-200">{momentumData.length}</div>
            <div className="text-xs text-slate-400">with data</div>
          </div>
        </div>

        {/* Strategy Components */}
        <div className="bg-slate-900/40 rounded-lg p-4">
          <h4 className="text-sm font-medium text-slate-300 mb-3">Momentum Components</h4>
          <div className="space-y-2 text-xs text-slate-400">
            <div>• <strong className="text-slate-300">Absolute momentum:</strong> 12-month return &gt; 4.5% risk-free rate</div>
            <div>• <strong className="text-slate-300">Relative momentum:</strong> Top 30% by 12-month return vs peers</div>
            <div>• <strong className="text-slate-300">Acceleration:</strong> 1-month &gt; 3-month &gt; 6-month progression</div>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            All 3 momentum types must confirm for signal generation
          </div>
        </div>
      </div>
    );
  }

  // TS Momentum Strategy
  if (strategyName.includes('TS Momentum')) {
    const volData = tickers
      .filter(t => t.rawData?.volatility_20d !== undefined)
      .map(t => t.rawData!.volatility_20d!);

    const lowVolCount = volData.filter(v => v < 20).length;
    const mediumVolCount = volData.filter(v => v >= 20 && v < 40).length;
    const highVolCount = volData.filter(v => v >= 40).length;
    const avgVol = volData.length > 0 ? volData.reduce((a, b) => a + b, 0) / volData.length : 0;

    const momentumData = tickers
      .filter(t => t.rawData?.momentum_20d !== undefined)
      .map(t => t.rawData!.momentum_20d!);
    const positiveMomentumCount = momentumData.filter(m => m > 0).length;
    const momentumPct = (positiveMomentumCount / tickers.length) * 100;

    return (
      <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-5 h-5 text-primary-400" />
          <h3 className="text-base font-semibold text-slate-200">Time Series Momentum</h3>
        </div>

        {/* Volatility Distribution */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-emerald-900/30 border border-emerald-700/40 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">Low Vol (&lt;20%)</div>
            <div className="text-lg font-bold text-emerald-400">{lowVolCount}</div>
            <div className="text-xs text-slate-400">Stable trends</div>
          </div>
          <div className="bg-amber-900/30 border border-amber-700/40 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">Med Vol (20-40%)</div>
            <div className="text-lg font-bold text-amber-400">{mediumVolCount}</div>
            <div className="text-xs text-slate-400">Moderate risk</div>
          </div>
          <div className="bg-red-900/30 border border-red-700/40 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">High Vol (40%+)</div>
            <div className="text-lg font-bold text-red-400">{highVolCount}</div>
            <div className="text-xs text-slate-400">High risk</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">Average</div>
            <div className="text-lg font-bold text-slate-200">{avgVol.toFixed(1)}%</div>
            <div className="text-xs text-slate-400">Universe vol</div>
          </div>
        </div>

        {/* Risk-Adjusted Trends */}
        <div className="bg-slate-900/40 rounded-lg p-4">
          <h4 className="text-sm font-medium text-slate-300 mb-3">Risk-Adjusted Trend Following</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Positive 12m excess return</span>
              <span className={`text-sm font-medium ${momentumPct >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                {momentumPct.toFixed(0)}% ({positiveMomentumCount} tickers)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Volatility-adjusted sizing available</span>
              <span className="text-sm font-medium text-slate-200">
                {volData.length} of {tickers.length} tickers
              </span>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Signal strength = Excess Return × (1 / Volatility) — AQR-style managed futures approach
          </div>
        </div>
      </div>
    );
  }

  // QVM Factor Strategy
  if (strategyName.includes('QVM') || strategyName.includes('Factor')) {
    // QVM data is mostly in fundamentals cache, so show what's available from ticker data
    const totalTickers = tickers.length;
    const equityTickers = tickers.filter(t => 
      t.rawData?.asset_class && ['broad_market', 'technology', 'healthcare', 'financials', 'energy', 'real_estate'].includes(t.rawData.asset_class)
    ).length;
    const etfCount = tickers.filter(t => t.symbol.includes('ETF') || t.symbol.length <= 4).length;
    const stockCount = totalTickers - etfCount;

    return (
      <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-3 mb-4">
          <DollarSign className="w-5 h-5 text-primary-400" />
          <h3 className="text-base font-semibold text-slate-200">Quality-Value-Momentum Factor</h3>
        </div>

        {/* Data Availability */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">Total Universe</div>
            <div className="text-lg font-bold text-slate-200">{totalTickers}</div>
            <div className="text-xs text-slate-400">tickers</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">Equity Classes</div>
            <div className="text-lg font-bold text-slate-200">{equityTickers}</div>
            <div className="text-xs text-slate-400">eligible</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">Est. Stocks</div>
            <div className="text-lg font-bold text-slate-200">{stockCount}</div>
            <div className="text-xs text-slate-400">with fundamentals</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">ETFs</div>
            <div className="text-lg font-bold text-slate-400">{etfCount}</div>
            <div className="text-xs text-slate-400">auto-skipped</div>
          </div>
        </div>

        {/* Factor Requirements */}
        <div className="bg-slate-900/40 rounded-lg p-4">
          <h4 className="text-sm font-medium text-slate-300 mb-3">Three-Factor Screen</h4>
          <div className="space-y-2 text-xs text-slate-400">
            <div>• <strong className="text-slate-300">Quality:</strong> ROE &gt; 15% AND debt-to-equity &lt; 1.0</div>
            <div>• <strong className="text-slate-300">Value:</strong> P/E ratio in bottom 30th percentile vs sector</div>
            <div>• <strong className="text-slate-300">Momentum:</strong> 12-1 month price momentum positive</div>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            ⚠️ Fundamental data sourced from cached financial statements, not visible in real-time ticker output
          </div>
        </div>
      </div>
    );
  }

  // VIX Reversion Strategy
  if (strategyName.includes('VIX')) {
    const currentVIX = vixData?.vix || 0;
    const fearGreed = vixData?.current || 0;
    
    // Estimate 5-day change (simplified since we don't have historical VIX)
    const vixThreshold = 25;
    const vixAboveThreshold = currentVIX > vixThreshold;
    
    const equityAssets = tickers.filter(t => 
      t.rawData?.asset_class && ['broad_market', 'technology', 'healthcare', 'financials', 'energy', 'real_estate'].includes(t.rawData.asset_class)
    ).length;

    return (
      <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-3 mb-4">
          <Thermometer className="w-5 h-5 text-primary-400" />
          <h3 className="text-base font-semibold text-slate-200">VIX Mean Reversion</h3>
        </div>

        {/* VIX Level */}
        <div className="mb-6">
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-300">Current VIX Level</span>
              <span className="text-xs text-slate-400">Threshold: 25</span>
            </div>
            
            {/* VIX gauge */}
            <div className="relative">
              <div className="h-8 bg-slate-700/50 rounded-lg">
                {/* Threshold line at 25 */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-orange-400 rounded-full" style={{ left: '50%' }} />
                
                {/* Current VIX position */}
                <div 
                  className={`absolute top-1 bottom-1 w-2 rounded-full ${
                    currentVIX > 30 ? 'bg-red-500' : currentVIX > 25 ? 'bg-orange-500' : 'bg-emerald-500'
                  }`}
                  style={{ 
                    left: `${Math.min(Math.max((currentVIX / 50) * 100, 0), 100)}%`,
                    transform: 'translateX(-50%)'
                  }}
                />
              </div>
              
              {/* Labels */}
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>0</span>
                <span className="text-orange-400 font-medium">25</span>
                <span>50+</span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3">
              <div>
                <div className={`text-2xl font-bold ${
                  currentVIX > 30 ? 'text-red-400' : currentVIX > 25 ? 'text-orange-400' : 'text-emerald-400'
                }`}>
                  {currentVIX.toFixed(1)}
                </div>
                <div className="text-xs text-slate-400">
                  {currentVIX > 30 ? 'High fear' : currentVIX > 25 ? 'Elevated fear' : 'Normal/low fear'}
                </div>
              </div>
              <div className={`px-2 py-1 rounded text-xs ${
                vixAboveThreshold ? 'bg-orange-900/50 text-orange-400' : 'bg-slate-700/50 text-slate-400'
              }`}>
                {vixAboveThreshold ? '✓ Above 25' : '✗ Below 25'}
              </div>
            </div>
          </div>
        </div>

        {/* Strategy Status */}
        <div className="bg-slate-900/40 rounded-lg p-4">
          <h4 className="text-sm font-medium text-slate-300 mb-3">Strategy Filters</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">VIX &gt; 25 (fear spike)</span>
              <span className={`text-sm font-medium ${vixAboveThreshold ? 'text-emerald-400' : 'text-red-400'}`}>
                {vixAboveThreshold ? '✓ Met' : '✗ Not met'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Equity assets only</span>
              <span className="text-sm font-medium text-slate-200">
                {equityAssets} of {tickers.length} eligible
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">VIX 5d change &gt; +30%</span>
              <span className="text-sm font-medium text-slate-400">
                Cannot verify (needs historical data)
              </span>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Strategy bets on VIX mean reversion: buys equity dips when fear spikes sharply
          </div>
        </div>
      </div>
    );
  }

  // Confidence Tuning Stage
  if (strategyName.includes('Confidence Tuning')) {
    // Aggregate modifier stats
    const regimeCounts = tickers.reduce((acc, t) => {
      const regime = t.rawData?.regime || 'unknown';
      acc[regime] = (acc[regime] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = tickers.length;
    const bullPct = ((regimeCounts.bull || 0) / total) * 100;
    const sidewaysPct = ((regimeCounts.sideways || 0) / total) * 100;
    const bearPct = ((regimeCounts.bear || 0) / total) * 100;

    const sidewaysApplied = tickers.filter(t => t.rawData?.sideways_applied).length;
    const kalshiApplied = tickers.filter(t => t.rawData?.kalshi_applied).length;

    // Asset confidence distribution
    const confidences = tickers
      .filter(t => t.rawData?.asset_confidence !== undefined)
      .map(t => t.rawData!.asset_confidence);
    const avgConfidence = confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;
    const highConfidence = confidences.filter(c => c >= 0.7).length;
    const medConfidence = confidences.filter(c => c >= 0.4 && c < 0.7).length;
    const lowConfidence = confidences.filter(c => c < 0.4).length;

    // Rotation modifier stats
    const rotations = tickers
      .filter(t => t.rawData?.rotation_modifier !== undefined)
      .map(t => t.rawData!.rotation_modifier);
    const avgRotation = rotations.length > 0 ? rotations.reduce((a, b) => a + b, 0) / rotations.length : 1;
    const boosted = rotations.filter(r => r > 1.0).length;
    const penalized = rotations.filter(r => r < 1.0).length;

    // Role distribution
    const roleCounts = tickers.reduce((acc, t) => {
      const role = t.rawData?.role || 'unknown';
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return (
      <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-5 h-5 text-primary-400" />
          <h3 className="text-base font-semibold text-slate-200">Confidence Tuning Analysis</h3>
        </div>

        {/* Regime Distribution */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-900/50 rounded-lg p-3 text-center border border-emerald-700/30">
            <div className="text-xs text-slate-500 mb-1">Bull Regime</div>
            <div className="text-xl font-bold text-emerald-400">{bullPct.toFixed(0)}%</div>
            <div className="text-xs text-slate-400">{regimeCounts.bull || 0} tickers</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 text-center border border-amber-700/30">
            <div className="text-xs text-slate-500 mb-1">Sideways</div>
            <div className="text-xl font-bold text-amber-400">{sidewaysPct.toFixed(0)}%</div>
            <div className="text-xs text-slate-400">{regimeCounts.sideways || 0} tickers</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 text-center border border-red-700/30">
            <div className="text-xs text-slate-500 mb-1">Bear Regime</div>
            <div className="text-xl font-bold text-red-400">{bearPct.toFixed(0)}%</div>
            <div className="text-xs text-slate-400">{regimeCounts.bear || 0} tickers</div>
          </div>
        </div>

        {/* Modifier Impact Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">Avg Confidence</div>
            <div className="text-lg font-bold text-slate-200">{(avgConfidence * 100).toFixed(0)}%</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">Avg Rotation</div>
            <div className={`text-lg font-bold ${avgRotation >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>
              {avgRotation.toFixed(2)}×
            </div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">Sideways Penalty</div>
            <div className="text-lg font-bold text-amber-400">{sidewaysApplied}</div>
            <div className="text-xs text-slate-400">tickers</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">Kalshi Adjusted</div>
            <div className="text-lg font-bold text-blue-400">{kalshiApplied}</div>
            <div className="text-xs text-slate-400">tickers</div>
          </div>
        </div>

        {/* Asset Confidence Distribution */}
        <div className="bg-slate-900/40 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-medium text-slate-300 mb-3">Asset Confidence Distribution</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">High (≥70%)</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-slate-700/50 rounded-full h-2">
                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${(highConfidence / total) * 100}%` }} />
                </div>
                <span className="text-sm font-medium text-emerald-400 w-12 text-right">{highConfidence}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Medium (40-70%)</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-slate-700/50 rounded-full h-2">
                  <div className="h-2 rounded-full bg-amber-500" style={{ width: `${(medConfidence / total) * 100}%` }} />
                </div>
                <span className="text-sm font-medium text-amber-400 w-12 text-right">{medConfidence}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Low (&lt;40%)</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-slate-700/50 rounded-full h-2">
                  <div className="h-2 rounded-full bg-red-500" style={{ width: `${(lowConfidence / total) * 100}%` }} />
                </div>
                <span className="text-sm font-medium text-red-400 w-12 text-right">{lowConfidence}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sector Rotation + Role Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-900/40 rounded-lg p-4">
            <h4 className="text-sm font-medium text-slate-300 mb-3">Rotation Modifier</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Boosted (&gt;1.0×)</span>
                <span className="text-sm font-medium text-emerald-400">{boosted}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Neutral (1.0×)</span>
                <span className="text-sm font-medium text-slate-300">{rotations.length - boosted - penalized}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Penalized (&lt;1.0×)</span>
                <span className="text-sm font-medium text-red-400">{penalized}</span>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/40 rounded-lg p-4">
            <h4 className="text-sm font-medium text-slate-300 mb-3">Asset Role</h4>
            <div className="space-y-2">
              {Object.entries(roleCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([role, count]) => (
                  <div key={role} className="flex items-center justify-between">
                    <span className="text-sm text-slate-400 capitalize">{role.replace('_', ' ')}</span>
                    <span className="text-sm font-medium text-slate-300">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-500">
          Confidence Tuning adjusts raw signal confidence using regime weight, asset role, sector rotation, sideways penalty, and Kalshi data. Tickers adjusted to HOLD appear in the Filtered tab.
        </div>
      </div>
    );
  }

  // Signal Gating Stage
  if (strategyName.includes('Signal Gating')) {
    const bearSuppressed = tickers.filter(t => t.rawData?.bear_suppressed).length;
    const sellSuppressed = tickers.filter(t => t.rawData?.sell_suppressed).length;
    const total = tickers.length;

    const regimeCounts = tickers.reduce((acc, t) => {
      const regime = t.rawData?.regime || 'unknown';
      acc[regime] = (acc[regime] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return (
      <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-primary-400" />
          <h3 className="text-base font-semibold text-slate-200">Signal Gating Analysis</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">Bear Suppressed</div>
            <div className="text-xl font-bold text-red-400">{bearSuppressed}</div>
            <div className="text-xs text-slate-400">BUY → HOLD</div>
          </div>
          <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">Sell Suppressed</div>
            <div className="text-xl font-bold text-amber-400">{sellSuppressed}</div>
            <div className="text-xs text-slate-400">SELL → HOLD</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">Passed Through</div>
            <div className="text-xl font-bold text-emerald-400">{total - bearSuppressed - sellSuppressed}</div>
            <div className="text-xs text-slate-400">unchanged</div>
          </div>
        </div>

        <div className="bg-slate-900/40 rounded-lg p-4">
          <h4 className="text-sm font-medium text-slate-300 mb-3">Regime Distribution</h4>
          <div className="space-y-2">
            {Object.entries(regimeCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([regime, count]) => (
                <div key={regime} className="flex items-center justify-between">
                  <span className="text-sm text-slate-400 capitalize">{regime}</span>
                  <span className={`text-sm font-medium ${
                    regime === 'bull' ? 'text-emerald-400' : regime === 'bear' ? 'text-red-400' : 'text-amber-400'
                  }`}>{count} ({((count / total) * 100).toFixed(0)}%)</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  }

  // Final Filters Stage
  if (strategyName.includes('Final Filters')) {
    const clusterLimited = tickers.filter(t => t.rawData?.cluster_limited).length;
    const capApplied = tickers.filter(t => t.rawData?.cap_applied).length;
    const total = tickers.length;

    // Sector distribution of filtered
    const sectorCounts = tickers.reduce((acc, t) => {
      const sector = t.rawData?.sector || t.rawData?.asset_class || 'unknown';
      acc[sector] = (acc[sector] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return (
      <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-primary-400" />
          <h3 className="text-base font-semibold text-slate-200">Final Filters Analysis</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">Cluster Limited</div>
            <div className="text-xl font-bold text-amber-400">{clusterLimited}</div>
            <div className="text-xs text-slate-400">max 2/sector</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">Cap Applied</div>
            <div className="text-xl font-bold text-slate-300">{capApplied}</div>
            <div className="text-xs text-slate-400">multiplier capped</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500 mb-1">Total Reviewed</div>
            <div className="text-xl font-bold text-slate-200">{total}</div>
            <div className="text-xs text-slate-400">tickers</div>
          </div>
        </div>

        {Object.keys(sectorCounts).length > 0 && (
          <div className="bg-slate-900/40 rounded-lg p-4">
            <h4 className="text-sm font-medium text-slate-300 mb-3">Sector Distribution</h4>
            <div className="space-y-2">
              {Object.entries(sectorCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
                .map(([sector, count]) => (
                  <div key={sector} className="flex items-center justify-between">
                    <span className="text-sm text-slate-400 capitalize">{sector.replace('_', ' ')}</span>
                    <span className="text-sm font-medium text-slate-300">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Fibonacci Levels — entry/stop/target analysis with inline chart
  if (strategyName.includes('Fibonacci Levels')) {
    const fibTickers = tickers.filter(t => t.rawData?.fibonacci?.swing_high);
    const [selectedFibTicker, setSelectedFibTicker] = useState<string>(
      fibTickers[0]?.symbol || ''
    );
    const selectedTicker = fibTickers.find(t => t.symbol === selectedFibTicker) || fibTickers[0];
    const fib = selectedTicker?.rawData?.fibonacci;
    const currentPrice = selectedTicker?.rawData?.price || fib?.current_price || 0;

    // Summary stats
    const total = fibTickers.length;
    const uptrendCount = fibTickers.filter(t => t.rawData?.fibonacci?.trend === 'uptrend').length;
    const downtrendCount = fibTickers.filter(t => t.rawData?.fibonacci?.trend === 'downtrend').length;
    const threePointCount = fibTickers.filter(t => t.rawData?.fibonacci?.pullback_low || t.rawData?.fibonacci?.pullback_high).length;
    const impulseCount = fibTickers.filter(t => t.rawData?.fibonacci?.swing_quality === 'impulse').length;

    // Tickers near entry zone (price between 38.2% and 61.8% retracement)
    const nearEntry = fibTickers.filter(t => {
      const f = t.rawData?.fibonacci;
      const p = t.rawData?.price || f?.current_price || 0;
      const r382 = f?.retracements?.["38.2"];
      const r618 = f?.retracements?.["61.8"];
      if (r382 == null || r618 == null) return false;
      const lo = Math.min(r382, r618);
      const hi = Math.max(r382, r618);
      return p >= lo && p <= hi;
    });

    const formatCurr = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
      <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-primary-400" />
          <h3 className="text-base font-semibold text-slate-200">Fibonacci Analysis</h3>
        </div>

        {/* Summary metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-slate-700/40 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-slate-200">{total}</div>
            <div className="text-xs text-slate-400 mt-1">Tickers</div>
          </div>
          <div className="bg-slate-700/40 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-emerald-400">{uptrendCount}</div>
            <div className="text-xs text-slate-400 mt-1">Uptrend</div>
          </div>
          <div className="bg-slate-700/40 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-cyan-400">{threePointCount}</div>
            <div className="text-xs text-slate-400 mt-1">3-Point A→B→C</div>
          </div>
          <div className="bg-slate-700/40 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-amber-400">{nearEntry.length}</div>
            <div className="text-xs text-slate-400 mt-1">In Entry Zone</div>
          </div>
        </div>

        {/* Ticker selector */}
        {fibTickers.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Select Ticker</div>
            <div className="flex flex-wrap gap-1.5">
              {fibTickers.map(t => {
                const f = t.rawData?.fibonacci;
                const isUptrend = f?.trend === 'uptrend';
                const isSelected = t.symbol === selectedFibTicker;
                return (
                  <button
                    key={t.symbol}
                    onClick={() => setSelectedFibTicker(t.symbol)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-primary-500/20 border-primary-500/50 text-primary-300'
                        : 'bg-slate-700/40 border-slate-600/30 text-slate-400 hover:bg-slate-700/60 hover:text-slate-300'
                    }`}
                  >
                    <span className="font-semibold">{t.symbol}</span>
                    <span className={`ml-1 ${isUptrend ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isUptrend ? '↑' : '↓'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Chart + levels for selected ticker */}
        {fib && selectedTicker && (
          <>
            {/* Header badges */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="text-sm font-bold text-slate-200">{selectedTicker.symbol}</span>
              <span className="text-xs font-mono text-slate-400">${formatCurr(currentPrice)}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium uppercase tracking-wide ${
                fib.trend === 'uptrend'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-red-500/20 text-red-400 border-red-500/40'
              }`}>
                {fib.trend}
              </span>
              {fib.swing_quality && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium uppercase tracking-wide ${
                  fib.swing_quality === 'impulse'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                }`}>
                  {fib.swing_quality}
                </span>
              )}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium uppercase tracking-wide ${
                (fib.pullback_low || fib.pullback_high)
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                  : 'bg-slate-500/20 text-slate-400 border-slate-500/40'
              }`}>
                {(fib.pullback_low || fib.pullback_high) ? '3-POINT A→B→C' : '2-POINT'}
              </span>
            </div>

            {/* Inline Fibonacci Chart */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/30 p-2 mb-4">
              <FibonacciInlineChart
                symbol={selectedTicker.symbol}
                fibonacci={fib as any}
                height={300}
              />
            </div>

            {/* Key Levels Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {/* Entry / Stop / Targets */}
              <div className="bg-slate-700/30 rounded-lg p-3">
                <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Trade Setup</div>
                <div className="space-y-2">
                  {fib.entry_zone && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-amber-400">🎯 Entry Zone</span>
                      <span className="text-xs font-mono text-slate-300">${fib.entry_zone}</span>
                    </div>
                  )}
                  {(fib.nearest_support ?? 0) > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-red-400">🛑 Nearest Support</span>
                      <span className="text-xs font-mono text-slate-300">${formatCurr(fib.nearest_support!)}</span>
                    </div>
                  )}
                  {(fib.nearest_resistance ?? 0) > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-emerald-400">🚀 Nearest Resistance</span>
                      <span className="text-xs font-mono text-slate-300">${formatCurr(fib.nearest_resistance!)}</span>
                    </div>
                  )}
                  {fib.profit_targets && fib.profit_targets.length > 0 && (() => {
                    const price = fib.current_price || 0;
                    const validTargets = fib.profit_targets.filter(t => t > price);
                    const allInverted = validTargets.length === 0;
                    return allInverted ? (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-red-400">⚠️ Targets Stale</span>
                        <span className="text-xs font-mono text-red-300/70">
                          Below entry — use resistance ${fib.nearest_resistance ? `$${formatCurr(fib.nearest_resistance)}` : 'N/A'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-cyan-400">💰 Profit Targets</span>
                        <span className="text-xs font-mono text-slate-300">
                          {validTargets.map(t => `$${formatCurr(t)}`).join(', ')}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Swing Points */}
              <div className="bg-slate-700/30 rounded-lg p-3">
                <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Swing Points</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-pink-400">
                      A — {fib.trend === 'uptrend' ? 'Swing Low' : 'Swing High'}
                    </span>
                    <div className="text-right">
                      <span className="text-xs font-mono text-slate-300">
                        ${formatCurr(fib.trend === 'uptrend' ? fib.swing_low : fib.swing_high)}
                      </span>
                      {(fib.trend === 'uptrend' ? fib.swing_low_date : fib.swing_high_date) && (
                        <span className="text-[10px] text-slate-500 ml-1">
                          {fib.trend === 'uptrend' ? fib.swing_low_date : fib.swing_high_date}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-cyan-400">
                      B — {fib.trend === 'uptrend' ? 'Swing High' : 'Swing Low'}
                    </span>
                    <div className="text-right">
                      <span className="text-xs font-mono text-slate-300">
                        ${formatCurr(fib.trend === 'uptrend' ? fib.swing_high : fib.swing_low)}
                      </span>
                      {(fib.trend === 'uptrend' ? fib.swing_high_date : fib.swing_low_date) && (
                        <span className="text-[10px] text-slate-500 ml-1">
                          {fib.trend === 'uptrend' ? fib.swing_high_date : fib.swing_low_date}
                        </span>
                      )}
                    </div>
                  </div>
                  {(fib.pullback_low || fib.pullback_high) && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-amber-400">C — Pullback</span>
                      <div className="text-right">
                        <span className="text-xs font-mono text-slate-300">
                          ${formatCurr(fib.pullback_low || fib.pullback_high || 0)}
                        </span>
                        {fib.pullback_date && (
                          <span className="text-[10px] text-slate-500 ml-1">{fib.pullback_date}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Retracement Levels Table */}
            {fib.retracements && Object.keys(fib.retracements).length > 0 && (
              <div className="bg-slate-700/30 rounded-lg p-3">
                <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Retracement Levels</div>
                <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-700/50">
                        <th className="text-left px-3 py-1.5 text-slate-500 font-medium">Level</th>
                        <th className="text-right px-3 py-1.5 text-slate-500 font-medium">Price</th>
                        <th className="text-right px-3 py-1.5 text-slate-500 font-medium">vs Current</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(fib.retracements)
                        .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
                        .map(([pct, price]) => {
                          const diff = ((price - currentPrice) / currentPrice) * 100;
                          const pctNum = parseFloat(pct);
                          const isEntryZone = pctNum >= 38.2 && pctNum <= 61.8;
                          const isAnchor = pctNum === 0 || pctNum === 100;
                          return (
                            <tr key={pct} className={`border-b border-slate-700/30 last:border-0 ${isEntryZone ? 'bg-amber-500/5' : ''}`}>
                              <td className="px-3 py-1.5">
                                <span className={`font-medium ${isAnchor ? 'text-cyan-400' : isEntryZone ? 'text-amber-400' : 'text-slate-300'}`}>
                                  {pctNum === 0 ? 'Swing High (0%)' : pctNum === 100 ? 'Swing Low (100%)' : `${pct}%`}
                                </span>
                                {isEntryZone && <span className="text-[10px] text-amber-500 ml-1">ENTRY</span>}
                              </td>
                              <td className="px-3 py-1.5 text-right font-mono text-slate-300">${formatCurr(price)}</td>
                              <td className={`px-3 py-1.5 text-right font-mono ${diff > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Entry zone alert */}
        {nearEntry.length > 0 && (
          <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <div className="text-xs font-semibold text-amber-400 mb-1">🎯 In Fibonacci Entry Zone</div>
            <div className="text-xs text-slate-400">
              {nearEntry.map(t => t.symbol).join(', ')} — price within 38.2%–61.8% retracement
            </div>
          </div>
        )}
      </div>
    );
  }

  // BUY Signals — final output summary for a consensus tier
  if (strategyName.includes('BUY Signals')) {
    const buyTickers = tickers.filter(t => t.rawData?.signal === 'BUY');
    const total = buyTickers.length;

    // Signal source breakdown
    const sourceCounts = buyTickers.reduce((acc, t) => {
      const src = t.rawData?.signal_source || 'unknown';
      acc[src] = (acc[src] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Regime breakdown
    const regimeCounts = buyTickers.reduce((acc, t) => {
      const r = t.rawData?.regime || 'unknown';
      acc[r] = (acc[r] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Asset class breakdown
    const assetClassCounts = buyTickers.reduce((acc, t) => {
      const ac = t.rawData?.asset_class || 'unknown';
      acc[ac] = (acc[ac] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Conviction: count how many strategies fired (confirmed + persistence)
    const convictionDist = buyTickers.reduce((acc, t) => {
      const votes = t.rawData?.strategy_votes || {};
      const persistence = t.rawData?.persistence_by_strategy || {};
      const confirmedKeys = Object.entries(votes).filter(([, v]) => v).map(([k]) => k);
      const pendingKeys = Object.entries(persistence).filter(([, v]) => v && (v as number) > 0).map(([k]) => k);
      const allKeys = Array.from(new Set(confirmedKeys.concat(pendingKeys)));
      const totalFired = allKeys.length;
      const key = `${totalFired}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Average metrics
    const avgStrength = total > 0 ? buyTickers.reduce((s, t) => s + (t.rawData?.signal_strength || 0), 0) / total : 0;
    const avgFG = total > 0 ? buyTickers.reduce((s, t) => s + (t.rawData?.effective_fg || 0), 0) / total : 0;
    const persistenceConfirmed = buyTickers.filter(t => t.rawData?.persistence_confirmed).length;

    // Top signals by strength
    const topByStrength = [...buyTickers].sort((a, b) => (b.rawData?.signal_strength || 0) - (a.rawData?.signal_strength || 0)).slice(0, 5);

    // Fibonacci data
    const withFib = buyTickers.filter(t => t.rawData?.fibonacci?.nearest_support);
    const nearSupport = withFib.filter(t => {
      const price = t.rawData?.price || 0;
      const support = t.rawData?.fibonacci?.nearest_support || 0;
      return support > 0 && ((price - support) / price) < 0.03;
    });

    const getRegimeColor = (r: string) => {
      if (r === 'bull') return 'text-emerald-400';
      if (r === 'bear') return 'text-red-400';
      return 'text-amber-400';
    };

    const getSourceLabel = (s: string) => {
      if (s === 'multi_confirm') return 'Multi-Confirm';
      if (s === 'time_series_momentum') return 'TS Momentum';
      if (s === 'fear_greed') return 'Fear & Greed';
      return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    return (
      <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-primary-400" />
          <h3 className="text-base font-semibold text-slate-200">BUY Signal Analysis</h3>
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-slate-700/40 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-emerald-400">{total}</div>
            <div className="text-xs text-slate-400 mt-1">BUY Signals</div>
          </div>
          <div className="bg-slate-700/40 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-slate-200">{avgStrength.toFixed(1)}</div>
            <div className="text-xs text-slate-400 mt-1">Avg Strength</div>
          </div>
          <div className="bg-slate-700/40 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-amber-400">{avgFG.toFixed(0)}</div>
            <div className="text-xs text-slate-400 mt-1">Avg F&G</div>
          </div>
          <div className="bg-slate-700/40 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-cyan-400">{persistenceConfirmed}/{total}</div>
            <div className="text-xs text-slate-400 mt-1">Persistence ✓</div>
          </div>
        </div>

        {/* Signal Source + Conviction */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {/* Signal Sources */}
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Signal Source</div>
            <div className="space-y-1.5">
              {Object.entries(sourceCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([src, count]) => (
                  <div key={src} className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">{getSourceLabel(src)}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-slate-600 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-400 rounded-full"
                          style={{ width: `${(count / total) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-400 w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Conviction Distribution */}
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Conviction (Strategies Fired)</div>
            <div className="space-y-1.5">
              {Object.entries(convictionDist)
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([votes, count]) => (
                  <div key={votes} className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">{votes} of 8 strategies</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-slate-600 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${Number(votes) >= 3 ? 'bg-emerald-400' : Number(votes) >= 2 ? 'bg-amber-400' : 'bg-slate-400'}`}
                          style={{ width: `${(count / total) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-400 w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Regime + Asset Class */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {/* Regime Breakdown */}
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Regime</div>
            <div className="space-y-1.5">
              {Object.entries(regimeCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([regime, count]) => (
                  <div key={regime} className="flex items-center justify-between">
                    <span className={`text-sm capitalize ${getRegimeColor(regime)}`}>{regime}</span>
                    <span className="text-xs font-medium text-slate-400">{count} ({((count / total) * 100).toFixed(0)}%)</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Asset Class */}
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Asset Class</div>
            <div className="space-y-1.5">
              {Object.entries(assetClassCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 6)
                .map(([ac, count]) => (
                  <div key={ac} className="flex items-center justify-between">
                    <span className="text-sm text-slate-300 capitalize">{ac.replace(/_/g, ' ')}</span>
                    <span className="text-xs font-medium text-slate-400">{count}</span>
                  </div>
                ))}
              {Object.keys(assetClassCounts).length > 6 && (
                <div className="text-xs text-slate-500">+{Object.keys(assetClassCounts).length - 6} more</div>
              )}
            </div>
          </div>
        </div>

        {/* Top Signals */}
        {topByStrength.length > 0 && (
          <div className="bg-slate-700/30 rounded-lg p-3 mb-4">
            <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Top Signals by Strength</div>
            <div className="space-y-2">
              {topByStrength.map((t) => {
                const votes = t.rawData?.strategy_votes || {};
                const persistence = t.rawData?.persistence_by_strategy || {};
                const cKeys = Object.entries(votes).filter(([, v]) => v).map(([k]) => k);
                const pKeys = Object.entries(persistence).filter(([, v]) => v && (v as number) > 0).map(([k]) => k);
                const totalFired = Array.from(new Set(cKeys.concat(pKeys))).length;
                return (
                  <div key={t.symbol} className="flex items-center justify-between py-1 border-b border-slate-700/30 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-200">{t.symbol}</span>
                      <span className={`text-xs ${getRegimeColor(t.rawData?.regime || '')}`}>{t.rawData?.regime}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">{totalFired}/8 strats</span>
                      <span className="text-xs text-slate-400">{getSourceLabel(t.rawData?.signal_source || '')}</span>
                      <span className="text-sm font-medium text-emerald-400">Str: {t.rawData?.signal_strength?.toFixed(1)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Fibonacci proximity alert */}
        {nearSupport.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <div className="text-xs font-semibold text-amber-400 mb-1">⚠️ Near Fibonacci Support</div>
            <div className="text-xs text-slate-400">
              {nearSupport.map(t => t.symbol).join(', ')} — within 3% of nearest Fib support level
            </div>
          </div>
        )}
      </div>
    );
  }

  // Agent Analysis — 5 Trading Desk Agents
  if (strategyName.includes('Agent Analysis') || strategyName.includes('Agent')) {
    const agents = [
      { id: 'chris-vermeulen', emoji: '📊', name: 'Chris Vermeulen', role: 'Technical Analyst', specialty: 'Chart patterns, cycles, momentum, risk assessment', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)', minStrength: 40, minStrategies: 3, sectors: 'All', regimes: 'Bull, Recovery, Sideways' },
      { id: 'warren-buffett', emoji: '📈', name: 'Warren Buffett', role: 'Value Investor', specialty: 'Intrinsic value, moats, margin of safety, long-term quality', color: '#10B981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.3)', minStrength: 35, minStrategies: 3, sectors: 'Financials, Staples, Energy, Industrials, Healthcare', regimes: 'All (incl. Bear)' },
      { id: 'peter-schiff', emoji: '🥇', name: 'Peter Schiff', role: 'Austrian Economist', specialty: 'Monetary policy, gold, inflation hedges, macro risk', color: '#EAB308', bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.3)', minStrength: 30, minStrategies: 2, sectors: 'Energy, Materials, Utilities, Real Estate', regimes: 'All (incl. Crisis)' },
      { id: 'raoul-pal', emoji: '🌊', name: 'Raoul Pal', role: 'Global Macro', specialty: 'Liquidity cycles, crypto, exponential age, risk-on/off', color: '#06B6D4', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.3)', minStrength: 35, minStrategies: 3, sectors: 'Tech, Comms, Financials', regimes: 'Bull, Recovery only' },
      { id: 'peter-lynch', emoji: '📉', name: 'Peter Lynch', role: 'GARP Investor', specialty: 'PEG ratios, stock categorization, two-minute drill', color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.3)', minStrength: 30, minStrategies: 2, sectors: 'All', regimes: 'Bull, Recovery, Sideways' },
      { id: 'ray-dalio', emoji: '⚖️', name: 'Ray Dalio', role: 'All Weather Strategist', specialty: 'Risk parity, macro regimes, all-weather allocation, debt cycles', color: '#F97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.3)', minStrength: 35, minStrategies: 3, sectors: 'All (risk parity)', regimes: 'All (All Weather)' },
    ];

    return (
      <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-5 h-5 text-primary-400" />
          <h3 className="text-base font-semibold text-slate-200">Trading Desk — Agent Analysis</h3>
        </div>

        {/* Agent Cards Grid — with filter criteria */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {agents.map((agent) => (
            <div
              key={agent.name}
              className="rounded-lg p-3 border"
              style={{ backgroundColor: agent.bg, borderColor: agent.border }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">{agent.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-200 truncate">{agent.name}</div>
                  <div className="text-[10px] font-medium" style={{ color: agent.color }}>{agent.role}</div>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Active" />
              </div>
              <div className="mt-2 space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Min Strength:</span>
                  <span className="text-slate-300 font-mono">{agent.minStrength}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Min Strategies:</span>
                  <span className="text-slate-300 font-mono">{agent.minStrategies}+</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sectors:</span>
                  <span className="text-slate-300 truncate ml-2 text-right" title={agent.sectors}>{agent.sectors}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Regimes:</span>
                  <span className="text-slate-300 truncate ml-2 text-right" title={agent.regimes}>{agent.regimes}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Analysis Flow */}
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/30">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">How It Works</div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <div className="bg-slate-800 rounded px-3 py-1.5 text-xs text-slate-300 border border-slate-700">
              BUY Signal Input
            </div>
            <span className="text-slate-500">→</span>
            <div className="flex gap-1">
              {agents.map((a) => (
                <span key={a.name} className="text-sm" title={a.name}>{a.emoji}</span>
              ))}
            </div>
            <span className="text-slate-500">→</span>
            <div className="bg-emerald-900/40 rounded px-3 py-1.5 text-xs text-emerald-300 border border-emerald-700/40">
              Unanimous → Today&apos;s Plays
            </div>
          </div>
          <p className="text-[11px] text-slate-500 text-center mt-2">
            Each agent applies their style filters (sector, strength, regime). Only tickers where <strong className="text-slate-400">all 5 agents agree</strong> pass through to Today&apos;s Plays.
          </p>
        </div>
      </div>
    );
  }

  // Portfolio Exit Strategies — visual breakdown
  const EXIT_STRATEGY_KEYS = ['Stop Loss Proximity', 'Strategy Consensus', 'Momentum Reversal', 'Sector Sentiment', 'Regime Check', 'RSI Overbought', 'Fibonacci Target', 'Hold Time Analysis', 'Exit Gating', 'Portfolio Input'];
  const EXIT_REC_KEYS = ['HOLD Recommendation', 'WATCH Recommendation', 'TRIM Recommendation', 'EXIT Recommendation', 'HOLD', 'WATCH', 'TRIM', 'EXIT'];
  if (EXIT_STRATEGY_KEYS.includes(strategyName) || EXIT_REC_KEYS.includes(strategyName)) {
    const exitColors: Record<string, string> = {
      'Stop Loss Proximity': 'text-red-400',
      'Strategy Consensus': 'text-amber-400',
      'Momentum Reversal': 'text-orange-400',
      'Sector Sentiment': 'text-purple-400',
      'Regime Check': 'text-cyan-400',
      'RSI Overbought': 'text-pink-400',
      'Fibonacci Target': 'text-emerald-400',
      'Hold Time Analysis': 'text-blue-400',
      'Exit Gating': 'text-yellow-400',
      'Portfolio Input': 'text-slate-300',
    };
    const exitIcons: Record<string, string> = {
      'Stop Loss Proximity': '🛑',
      'Strategy Consensus': '📊',
      'Momentum Reversal': '↩️',
      'Sector Sentiment': '🌡️',
      'Regime Check': '🔄',
      'RSI Overbought': '📈',
      'Fibonacci Target': '🎯',
      'Hold Time Analysis': '⏱️',
      'Exit Gating': '🚦',
      'Portfolio Input': '📂',
      'HOLD': '🟢', 'HOLD Recommendation': '🟢',
      'WATCH': '👀', 'WATCH Recommendation': '👀',
      'TRIM': '✂️', 'TRIM Recommendation': '✂️',
      'EXIT': '🚪', 'EXIT Recommendation': '🚪',
    };
    const icon = exitIcons[strategyName] || '📋';
    const color = exitColors[strategyName] || 'text-slate-300';
    
    // Show position details for exit strategies
    const positionStats = tickers.length > 0 ? {
      total: tickers.length,
      withPrice: tickers.filter(t => t.currentPrice && t.currentPrice > 0).length,
      avgPrice: tickers.reduce((sum, t) => sum + (t.currentPrice || 0), 0) / Math.max(1, tickers.length),
    } : null;

    return (
      <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xl">{icon}</span>
          <h3 className={`text-base font-semibold ${color}`}>Exit Strategy Analysis</h3>
        </div>
        <div className="space-y-3">
          {/* Pipeline position in exit flow */}
          <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Exit Pipeline Flow</div>
            <div className="flex items-center justify-center gap-1 flex-wrap text-xs">
              <span className={`px-2 py-1 rounded ${strategyName === 'Portfolio Input' ? 'bg-primary-900/40 text-primary-300 border border-primary-700/40' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>Input</span>
              <span className="text-slate-600">→</span>
              <span className={`px-2 py-1 rounded ${EXIT_STRATEGY_KEYS.slice(0, 8).includes(strategyName) ? 'bg-red-900/40 text-red-300 border border-red-700/40' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>8 Evaluations</span>
              <span className="text-slate-600">→</span>
              <span className="px-2 py-1 rounded bg-slate-800 text-slate-500 border border-slate-700">Signal Count</span>
              <span className="text-slate-600">→</span>
              <span className={`px-2 py-1 rounded ${strategyName === 'Exit Gating' ? 'bg-yellow-900/40 text-yellow-300 border border-yellow-700/40' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>Gating</span>
              <span className="text-slate-600">→</span>
              <span className={`px-2 py-1 rounded ${EXIT_REC_KEYS.includes(strategyName) ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/40' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>Recommendation</span>
            </div>
          </div>
          {/* Position statistics */}
          {positionStats && positionStats.total > 0 && (
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Position Overview</div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-lg font-bold text-slate-200">{positionStats.total}</div>
                  <div className="text-xs text-slate-500">Positions Evaluated</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-200">{positionStats.withPrice}</div>
                  <div className="text-xs text-slate-500">With Live Prices</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-200">${positionStats.avgPrice.toFixed(2)}</div>
                  <div className="text-xs text-slate-500">Avg Price</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default for unknown strategies
  return (
    <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-slate-800/30">
      <div className="flex items-center gap-3 mb-4">
        <Filter className="w-5 h-5 text-primary-400" />
        <h3 className="text-base font-semibold text-slate-200">Strategy Technical Overview</h3>
      </div>
      <div className="text-sm text-slate-400 text-center py-8">
        Technical breakdown not yet implemented for {strategyName}
      </div>
    </div>
  );
}

// ============================================================
// Blended F&G Sector Overview — shown at top of Blended F&G modal
// ============================================================
function BlendedFGSectorOverview({ tickers }: { tickers: TickerDetail[] }) {
  const [sectorData, setSectorData] = useState<Record<string, { score: number; rating: string; sector_etf: string }> | null>(null);
  const [globalFG, setGlobalFG] = useState<number | null>(null);

  useEffect(() => {
    const fetchSectorData = async () => {
      try {
        const res = await fetch('/data/trading/mre-signals.json');
        if (res.ok) {
          const data = await res.json();
          setGlobalFG(data.fear_greed?.current ?? null);
          if (data.sector_fear_greed?.sectors) {
            setSectorData(data.sector_fear_greed.sectors);
          }
        }
      } catch { /* ignore */ }
    };
    fetchSectorData();
  }, []);

  // Also extract thresholds from tickers
  const thresholds = useMemo(() => {
    const map: Record<string, { conservative: number; opportunistic: number }> = {};
    for (const t of tickers) {
      const ac = t.rawData?.asset_class;
      if (ac && !map[ac]) {
        map[ac] = {
          conservative: t.rawData?.fear_threshold_conservative ?? 8,
          opportunistic: t.rawData?.fear_threshold_opportunistic ?? 19,
        };
      }
    }
    return map;
  }, [tickers]);

  const getFGColor = (score: number) => {
    if (score < 25) return 'text-red-400';
    if (score < 40) return 'text-orange-400';
    if (score < 60) return 'text-amber-400';
    if (score < 75) return 'text-emerald-400';
    return 'text-green-400';
  };

  const getFGBg = (score: number) => {
    if (score < 25) return 'bg-red-900/30 border-red-700/40';
    if (score < 40) return 'bg-orange-900/30 border-orange-700/40';
    if (score < 60) return 'bg-amber-900/30 border-amber-700/40';
    if (score < 75) return 'bg-emerald-900/30 border-emerald-700/40';
    return 'bg-green-900/30 border-green-700/40';
  };

  const getRatingLabel = (score: number) => {
    if (score < 25) return 'Extreme Fear';
    if (score < 40) return 'Fear';
    if (score < 60) return 'Neutral';
    if (score < 75) return 'Greed';
    return 'Extreme Greed';
  };

  const SECTOR_LABELS: Record<string, string> = {
    broad_market: 'Broad Market',
    technology: 'Technology',
    healthcare: 'Healthcare',
    financials: 'Financials',
    real_estate: 'Real Estate',
    energy: 'Energy',
    bonds: 'Bonds',
    international: 'International',
    commodities: 'Commodities',
  };

  return (
    <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-slate-800/30">
      {/* Global F&G */}
      <div className="flex items-center gap-3 mb-4">
        <Thermometer className="w-5 h-5 text-primary-400" />
        <h3 className="text-base font-semibold text-slate-200">Fear & Greed Overview</h3>
      </div>

      {/* Global index card */}
      {globalFG !== null && (
        <div className={`rounded-lg p-4 border mb-4 ${getFGBg(globalFG)}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 mb-1">Global CNN F&G Index</div>
              <div className={`text-2xl font-bold ${getFGColor(globalFG)}`}>{globalFG.toFixed(0)}</div>
              <div className="text-xs text-slate-400 mt-0.5">{getRatingLabel(globalFG)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Sector gauges 3x3 grid */}
      {sectorData ? (
        <div className="grid grid-cols-3 gap-2 mb-6">
          {Object.entries(SECTOR_LABELS).map(([key, label]) => {
            const sector = sectorData[key];
            if (!sector) return null;
            const score = sector.score;
            const threshold = thresholds[key];
            const divergence = globalFG !== null ? Math.abs(score - globalFG) : 0;

            return (
              <div key={key} className={`rounded-lg p-2.5 border ${getFGBg(score)} ${divergence > 15 ? 'animate-pulse' : ''}`}>
                <div className="text-[10px] text-slate-400 truncate">{label}</div>
                <div className="text-[10px] text-slate-500">{sector.sector_etf}</div>
                <div className={`text-lg font-bold ${getFGColor(score)}`}>{score.toFixed(0)}</div>
                {threshold && (
                  <div className="text-[9px] text-slate-500 mt-0.5">
                    Thresh: {threshold.conservative} / {threshold.opportunistic}
                  </div>
                )}
                {divergence > 10 && (
                  <div className="text-[9px] text-amber-400 mt-0.5">
                    Δ {divergence.toFixed(0)} from global
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-slate-500 text-center py-4 mb-6">Sector data pending...</div>
      )}

      {/* Asset Class Thresholds Section */}
      <div className="border-t border-slate-600/30 pt-4">
        <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <Target className="w-4 h-4" />
          Asset Class Thresholds
        </h4>
        <div className="space-y-3">
          {Object.entries(thresholds).map(([assetClass, threshold]) => {
            // Find sector score for this asset class
            const sectorScore = sectorData && sectorData[assetClass] ? sectorData[assetClass].score : null;
            
            return (
              <div key={assetClass} className="bg-slate-900/40 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-200 capitalize">
                    {assetClass.replace('_', ' ')}
                  </span>
                  {sectorScore && (
                    <span className={`text-sm font-bold ${getFGColor(sectorScore)}`}>
                      Current: {sectorScore.toFixed(0)}
                    </span>
                  )}
                </div>
                
                {/* Threshold visualization slider */}
                <div className="relative">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Conservative</span>
                    <span>Opportunistic</span>
                  </div>
                  
                  {/* Track */}
                  <div className="relative h-3 bg-slate-700/50 rounded-full">
                    {/* Conservative threshold marker */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-emerald-500 rounded-full"
                      style={{ left: `${threshold.conservative}%` }}
                    />
                    {/* Opportunistic threshold marker */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-blue-500 rounded-full"
                      style={{ left: `${threshold.opportunistic}%` }}
                    />
                    
                    {/* Current sector score position */}
                    {sectorScore && (
                      <div 
                        className={`absolute top-0 bottom-0 w-1 rounded-full ${getFGColor(sectorScore).replace('text-', 'bg-')}`}
                        style={{ 
                          left: `${Math.min(Math.max(sectorScore, 0), 100)}%`,
                          transform: 'translateX(-50%)'
                        }}
                      />
                    )}
                    
                    {/* Opportunistic zone fill */}
                    <div 
                      className="absolute top-1 bottom-1 bg-blue-500/20 rounded-full"
                      style={{ 
                        left: '0%',
                        width: `${threshold.opportunistic}%`
                      }}
                    />
                    
                    {/* Conservative zone fill */}
                    <div 
                      className="absolute top-1 bottom-1 bg-emerald-500/20 rounded-full"
                      style={{ 
                        left: '0%',
                        width: `${threshold.conservative}%`
                      }}
                    />
                  </div>
                  
                  {/* Threshold value labels */}
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span 
                      className="text-emerald-400 font-medium"
                      style={{ marginLeft: `${threshold.conservative - 3}%` }}
                    >
                      {threshold.conservative}
                    </span>
                    <span 
                      className="text-blue-400 font-medium"
                      style={{ marginRight: `${100 - threshold.opportunistic - 3}%` }}
                    >
                      {threshold.opportunistic}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-xs text-slate-500 mt-2">
          ⚠️ Threshold configuration is read-only for now. Interactive adjustment coming soon.
        </div>
      </div>

      {/* Calibration Note */}
      <div className="border-t border-slate-600/30 pt-3 mt-4">
        <details className="group">
          <summary className="flex items-center gap-2 text-xs text-amber-400 cursor-pointer hover:text-amber-300 transition-colors">
            <span className="transform transition-transform group-open:rotate-90">▶</span>
            ⚠️ Methodology Calibration Note
          </summary>
          <div className="mt-2 p-3 bg-amber-900/10 border border-amber-800/30 rounded-lg text-xs text-slate-300 leading-relaxed">
            <p className="mb-2">
              <strong className="text-amber-400">Sector scores use a simplified CNN-style methodology and may diverge from the official CNN index.</strong>
            </p>
            <p className="mb-1"><strong>Key differences:</strong></p>
            <ul className="space-y-1 text-slate-400 ml-3">
              <li>• <strong>Volatility inversion formula:</strong> CNN shows 7.7 (extreme fear) while our sectors score 68-93</li>
              <li>• <strong>Safe haven baseline:</strong> CNN shows 15.5 while our scores range 33-83 (different baseline)</li>
              <li>• <strong>Strength calculation:</strong> CNN shows 50 vs our 52-week high/low ratios on small samples</li>
            </ul>
            <p className="mt-2 text-slate-300">
              <strong>Best use:</strong> Sector scores are most useful for relative comparison between sectors, not absolute comparison to CNN global.
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}

// ============================================================
// Agent Analysis Ticker Row — shows which agents approve/reject each ticker
// Expandable: click to see per-agent reasoning tabs
// ============================================================
function AgentAnalysisTickerRow({ ticker, isFiltered }: { ticker: TickerDetail; isFiltered?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const raw = ticker.rawData as Record<string, any>;
  if (!raw) return null;

  const approvals: string[] = (raw as any)._agentApprovals || [];
  const agentStyles: Array<{ id: string; name: string; emoji: string; color: string }> = (raw as any)._agentStyles || [];
  const agentReasons: Record<string, { approved: boolean; reasons: string[] }> = (raw as any)._agentReasons || {};
  const approvalCount = approvals.length;
  const totalAgents = agentStyles.length || 5;

  // Auto-select first agent on expand
  const handleExpand = () => {
    setExpanded(!expanded);
    if (!expanded && !activeAgent && agentStyles.length > 0) {
      setActiveAgent(agentStyles[0].id);
    }
  };

  return (
    <div className={`rounded-lg border overflow-hidden ${isFiltered ? 'bg-red-900/10 border-red-700/20' : 'bg-slate-800/50 border-slate-700/50'}`}>
      {/* Collapsed row — symbol + signal strength + agent icons */}
      <button
        onClick={handleExpand}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-700/20 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className={`text-xs transition-transform ${expanded ? 'rotate-90' : ''} text-slate-500`}>›</span>
          <span className="font-mono font-semibold text-slate-200 text-sm">{raw.symbol}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
            approvalCount === totalAgents 
              ? 'bg-emerald-900/50 text-emerald-300' 
              : approvalCount >= 3 
                ? 'bg-amber-900/50 text-amber-300'
                : 'bg-red-900/50 text-red-300'
          }`}>
            {approvalCount}/{totalAgents}
          </span>
          {raw.signal_strength != null && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
              raw.signal_strength >= 40 ? 'bg-emerald-900/30 text-emerald-400' 
              : raw.signal_strength >= 30 ? 'bg-amber-900/30 text-amber-400' 
              : 'bg-red-900/30 text-red-400'
            }`}>
              Str: {typeof raw.signal_strength === 'number' ? raw.signal_strength.toFixed(0) : raw.signal_strength}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {agentStyles.map((agent) => {
            const approved = approvals.includes(agent.id);
            return (
              <div key={agent.id} className="flex items-center gap-1" title={`${agent.name}: ${approved ? 'BUY' : 'PASS'}`}>
                <span className={`text-sm ${approved ? 'opacity-100' : 'opacity-20 grayscale'}`}
                  style={approved ? { filter: `drop-shadow(0 0 3px ${agent.color}60)` } : undefined}
                >{agent.emoji}</span>
                {approved ? (
                  <span className="text-[9px] font-bold text-emerald-400">✓</span>
                ) : (
                  <span className="text-[9px] font-bold text-red-400">✗</span>
                )}
              </div>
            );
          })}
        </div>
      </button>

      {/* Expanded: per-agent tabs with reasoning */}
      {expanded && (
        <div className="border-t border-slate-700/30">
          {/* Agent tabs */}
          <div className="flex border-b border-slate-700/30 bg-slate-900/30 overflow-x-auto">
            {agentStyles.map((agent) => {
              const isActive = activeAgent === agent.id;
              const approved = approvals.includes(agent.id);
              return (
                <button
                  key={agent.id}
                  onClick={() => setActiveAgent(agent.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap transition-all relative ${
                    isActive ? 'text-slate-200 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
                  }`}
                >
                  <span className="text-sm">{agent.emoji}</span>
                  <span>{agent.name.split(' ')[1] || agent.name.split(' ')[0]}</span>
                  {approved ? (
                    <span className="text-[9px] font-bold text-emerald-400">BUY</span>
                  ) : (
                    <span className="text-[9px] font-bold text-red-400">PASS</span>
                  )}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: agent.color }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Active agent reasoning */}
          {activeAgent && (() => {
            const agent = agentStyles.find(a => a.id === activeAgent);
            const reasons = agentReasons[activeAgent];
            if (!agent || !reasons) return null;
            return (
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{agent.emoji}</span>
                  <span className="text-sm font-semibold text-slate-200">{agent.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    reasons.approved ? 'bg-emerald-900/50 text-emerald-300' : 'bg-red-900/50 text-red-300'
                  }`}>
                    {reasons.approved ? '✓ BUY' : '✗ PASS'}
                  </span>
                </div>
                <div className="space-y-1">
                  {reasons.reasons.map((reason, i) => {
                    const isPass = reason.startsWith('✓');
                    return (
                      <div key={i} className={`text-xs px-2 py-1.5 rounded ${
                        isPass ? 'bg-emerald-900/20 text-emerald-300/80' : 'bg-red-900/20 text-red-300/80'
                      }`}>
                        {reason}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Blended F&G Ticker Row — clear two-row display per ticker
// ============================================================
function BlendedFGTickerRow({ ticker }: { ticker: TickerDetail }) {
  const raw = ticker.rawData;
  if (!raw) return null;

  const sectorFG = raw.sector_fg ?? raw.current_fg ?? 0;
  const globalFG = raw.global_fg ?? raw.current_fg ?? 0;
  const effectiveFG = raw.effective_fg ?? raw.current_fg ?? 0;
  const thresholdConservative = raw.fear_threshold_conservative ?? 15;
  const thresholdOpportunistic = raw.fear_threshold_opportunistic ?? 40;
  // Sector-specific thresholds: scaled by sector/global ratio so sector row
  // shows a proportionally meaningful threshold (sector F&G runs hotter)
  const sectorThresholdConservative = raw.sector_fear_threshold_conservative ?? thresholdConservative;
  const sectorThresholdOpportunistic = raw.sector_fear_threshold_opportunistic ?? thresholdOpportunistic;
  const divergence = raw.fg_divergence ?? (sectorFG - globalFG);

  // Determine which threshold triggered and which index (global or sector) triggered it
  const globalTriggeredConservative = globalFG <= thresholdConservative;
  const globalTriggeredOpportunistic = globalFG <= thresholdOpportunistic;
  const sectorTriggeredConservative = sectorFG <= sectorThresholdConservative;
  const sectorTriggeredOpportunistic = sectorFG <= sectorThresholdOpportunistic;
  
  const globalTriggered = globalTriggeredConservative || globalTriggeredOpportunistic;
  const sectorTriggered = sectorTriggeredConservative || sectorTriggeredOpportunistic;
  
  // Determine what caused the signal (which was used as effective FG)
  const effectiveTriggeredConservative = effectiveFG <= thresholdConservative;
  const effectiveTriggeredOpportunistic = effectiveFG <= thresholdOpportunistic;
  const effectiveTriggered = effectiveTriggeredConservative || effectiveTriggeredOpportunistic;
  const triggerLevel = effectiveTriggeredConservative ? 'conservative' : effectiveTriggeredOpportunistic ? 'opportunistic' : 'none';

  const getFGColor = (score: number) => {
    if (score < 25) return 'text-red-400';
    if (score < 40) return 'text-orange-400';
    if (score < 60) return 'text-amber-400';
    return 'text-emerald-400';
  };

  // Relative divergence indicator (new system)
  const getRelativeDivergenceDisplay = () => {
    const confidence = raw.fg_divergence_confidence ?? 'insufficient';
    const label = raw.fg_divergence_label ?? 'normal';
    const zScore = raw.fg_divergence_z_score ?? 0;
    const dataPoints = raw.fg_divergence_data_points ?? 0;
    const historicalMean = raw.fg_divergence_historical_mean ?? 0;
    const rawDivergence = Math.abs(divergence);
    
    // Insufficient confidence - show data accumulation state
    if (confidence === 'insufficient') {
      return {
        color: 'text-blue-400',
        bg: 'bg-blue-900/20',
        label: `📊 Accumulating data (${dataPoints}/5 days)`,
        barColor: 'bg-blue-500',
        width: (dataPoints / 5) * 100, // Progress indicator
        showRaw: true, // Still show raw divergence but without warning styling
      };
    }
    
    // Sufficient confidence - show z-score based assessment
    const absZ = Math.abs(zScore);
    if (absZ < 1.0) {
      return {
        color: 'text-emerald-400',
        bg: 'bg-emerald-900/30',
        label: `✓ Normal for ${raw.asset_class?.replace('_', ' ')}`,
        barColor: 'bg-emerald-500',
        width: Math.min(absZ * 50, 50),
        showRaw: false,
      };
    } else if (absZ < 1.5) {
      return {
        color: 'text-yellow-400',
        bg: 'bg-yellow-900/30',
        label: '↗ Slightly elevated',
        barColor: 'bg-yellow-500',
        width: Math.min(absZ * 40, 60),
        showRaw: false,
      };
    } else if (absZ < 2.0) {
      return {
        color: 'text-amber-400',
        bg: 'bg-amber-900/30',
        label: '⚠ Unusual divergence',
        barColor: 'bg-amber-500',
        width: Math.min(absZ * 35, 75),
        showRaw: false,
      };
    } else {
      return {
        color: 'text-red-400',
        bg: 'bg-red-900/30',
        label: '🔴 Extreme divergence — significantly outside historical norm',
        barColor: 'bg-red-500',
        width: Math.min(absZ * 25, 100),
        showRaw: false,
      };
    }
  };

  const divergenceInfo = getRelativeDivergenceDisplay();

  return (
    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
      {/* Header with symbol and trigger status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-slate-200 text-sm">{raw.symbol}</span>
          <span className="text-[10px] text-slate-500 capitalize">{raw.asset_class?.replace('_', ' ')}</span>
        </div>
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
          effectiveTriggered 
            ? triggerLevel === 'conservative' 
              ? 'bg-emerald-900/50 text-emerald-400' 
              : 'bg-blue-900/50 text-blue-400'
            : 'bg-slate-700/50 text-slate-400'
        }`}>
          {effectiveTriggered 
            ? triggerLevel === 'conservative' ? '✓ Conservative' : '✓ Opportunistic'
            : '✗ Not triggered'
          }
        </span>
      </div>

      {/* Two clear rows: Global and Sector */}
      <div className="space-y-2 mb-3">
        {/* Global Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-300">Global:</span>
            <span className={`font-semibold ${getFGColor(globalFG)}`}>{globalFG.toFixed(0)}</span>
            <span className="text-slate-500 text-xs">|</span>
            <span className="text-xs text-slate-400">
              Threshold: <span className="text-slate-300">{thresholdOpportunistic}</span>
            </span>
          </div>
          {globalTriggered && (
            <span className="text-[10px] text-emerald-400 bg-emerald-900/30 px-1.5 py-0.5 rounded">
              ✓ Triggered
            </span>
          )}
        </div>

        {/* Sector Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-300">Sector:</span>
            <span className={`font-semibold ${getFGColor(sectorFG)}`}>{sectorFG.toFixed(0)}</span>
            <span className="text-slate-500 text-xs">|</span>
            <span className="text-xs text-slate-400">
              Threshold: <span className="text-slate-300">{sectorThresholdOpportunistic}</span>
            </span>
          </div>
          {sectorTriggered && (
            <span className="text-[10px] text-emerald-400 bg-emerald-900/30 px-1.5 py-0.5 rounded">
              ✓ Triggered
            </span>
          )}
        </div>
      </div>

      {/* Relative Divergence visualization */}
      {(divergenceInfo.showRaw || Math.abs(divergence) > 5) && (
        <div className={`rounded p-2 border ${divergenceInfo.bg} border-opacity-40`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs ${divergenceInfo.color}`}>
                {divergenceInfo.showRaw ? (
                  `Raw: ${divergence > 0 ? '+' : ''}${divergence.toFixed(0)} pts`
                ) : (
                  `Z-Score: ${(raw.fg_divergence_z_score ?? 0) > 0 ? '+' : ''}${(raw.fg_divergence_z_score ?? 0).toFixed(1)}`
                )}
              </span>
              {!divergenceInfo.showRaw && (
                <span className={`text-[10px] ${divergenceInfo.color} opacity-60`}>
                  Based on {raw.fg_divergence_data_points ?? 0} data points | {raw.fg_divergence_confidence} confidence
                </span>
              )}
            </div>
            <div className="flex-1 mx-3 bg-slate-700/50 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full ${divergenceInfo.barColor}`}
                style={{ width: `${divergenceInfo.width}%` }}
              />
            </div>
          </div>
          <div className={`text-[10px] ${divergenceInfo.color} opacity-80`}>
            {divergenceInfo.label}
          </div>
          {!divergenceInfo.showRaw && raw.fg_divergence_historical_mean !== undefined && (
            <div className="text-[9px] text-slate-500 mt-1">
              Typical divergence for {raw.asset_class?.replace('_', ' ')}: ±{raw.fg_divergence_historical_mean.toFixed(0)} points
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Signal Gating Ticker Row — for Signal Gating modal
// ============================================================
function SignalGatingTickerRow({ ticker }: { ticker: TickerDetail }) {
  const raw = ticker.rawData;
  if (!raw) return null;

  const getSignalColor = (signal: string) => {
    switch(signal) {
      case 'BUY': return 'text-emerald-400';
      case 'SELL': return 'text-red-400';
      case 'HOLD': return 'text-amber-400';
      default: return 'text-slate-400';
    }
  };

  const getRegimeColor = (regime: string) => {
    switch(regime) {
      case 'bull': return 'text-emerald-400';
      case 'bear': return 'text-red-400';
      case 'sideways': return 'text-amber-400';
      default: return 'text-slate-400';
    }
  };

  const getRegimeIcon = (regime: string) => {
    switch(regime) {
      case 'bull': return '🟢';
      case 'bear': return '🔴';
      case 'sideways': return '🟡';
      default: return '⚪';
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
      {/* Header with symbol and current signal */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-slate-200 text-sm">{raw.symbol}</span>
          <span className="text-[10px] text-slate-500 capitalize">{raw.asset_class?.replace('_', ' ')}</span>
        </div>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSignalColor(raw.signal)} bg-slate-700/50`}>
          {raw.signal}
        </span>
      </div>

      {/* Signal Gating Details */}
      <div className="space-y-2">
        {/* Regime Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-300">Regime:</span>
            <span className="flex items-center gap-1">
              <span>{getRegimeIcon(raw.regime)}</span>
              <span className={`font-semibold capitalize ${getRegimeColor(raw.regime)}`}>
                {raw.regime}
              </span>
            </span>
          </div>
          {raw.regime_details?.regime_days && (
            <span className="text-[10px] text-slate-400">
              {raw.regime_details.regime_days} days
            </span>
          )}
        </div>

        {/* Bear Suppression Status */}
        {raw.bear_suppressed && (
          <div className="bg-red-900/20 border border-red-700/30 rounded p-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-red-400">🛑 Bear Suppressed</span>
            </div>
            <div className="text-[10px] text-red-300 mt-1">
              BUY signal converted to HOLD due to bearish regime
            </div>
            {raw.regime_details && (
              <div className="text-[10px] text-slate-400 mt-1">
                Price below key moving averages ({raw.regime_details.regime_stage})
              </div>
            )}
          </div>
        )}

        {/* Sell Suppression Status */}
        {raw.sell_suppressed && (
          <div className="bg-amber-900/20 border border-amber-700/30 rounded p-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-amber-400">⏸️ Sell Suppressed</span>
            </div>
            <div className="text-[10px] text-amber-300 mt-1">
              SELL signal converted to HOLD to prevent panic selling
            </div>
          </div>
        )}

        {/* Pass-Through Status */}
        {!raw.bear_suppressed && !raw.sell_suppressed && (
          <div className="bg-emerald-900/20 border border-emerald-700/30 rounded p-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-emerald-400">✅ Passed Through</span>
            </div>
            <div className="text-[10px] text-emerald-300 mt-1">
              Signal unchanged by gating filters
            </div>
          </div>
        )}
      </div>

      {/* Current Price (if available) */}
      {raw.price && (
        <div className="mt-3 pt-2 border-t border-slate-700/50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Current Price:</span>
            <span className="text-sm font-mono text-slate-200">
              ${raw.price.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PipelineDetailPanel({
  stageDetails,
  onClose
}: PipelineDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'output' | 'pending' | 'filtered'>('output');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Auto-select the most relevant tab when panel opens
  useEffect(() => {
    if (!stageDetails) return;
    if (stageDetails.pendingTickers && stageDetails.pendingTickers.length > 0) {
      setActiveTab('pending');
    } else if (stageDetails.passedTickers.length > 0) {
      setActiveTab('output');
    } else if (stageDetails.filteredTickers.length > 0) {
      setActiveTab('filtered');
    } else {
      setActiveTab('output');
    }
  }, [stageDetails]);
  const [strategyVersions, setStrategyVersions] = useState<StrategyVersionsResponse | null>(null);
  const [isVersionHistoryExpanded, setIsVersionHistoryExpanded] = useState(false);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Fetch strategy versions data
  useEffect(() => {
    const fetchStrategyVersions = async () => {
      try {
        const response = await fetch('/data/trading/strategy-versions.json');
        if (response.ok) {
          const data = await response.json();
          setStrategyVersions(data);
        }
      } catch (error) {
        console.warn('Failed to load strategy versions:', error);
      }
    };
    
    fetchStrategyVersions();
  }, []);

  if (!stageDetails) return null;

  // Get strategy version data for current strategy
  const getStrategyData = (): StrategyVersionData | null => {
    if (!strategyVersions || !isIndividualStrategy(stageDetails.name)) return null;
    const strategyKey = STRATEGY_KEY_MAPPING[stageDetails.name];
    return strategyKey ? strategyVersions.strategies[strategyKey] : null;
  };

  // Calculate accuracy delta from previous version
  const getAccuracyDelta = (currentVersion: StrategyVersion, previousVersion?: StrategyVersion): number | null => {
    if (!previousVersion) return null;
    return currentVersion.accuracy.overall - previousVersion.accuracy.overall;
  };

  const strategyData = getStrategyData();
  const currentVersionData = strategyData?.versions[0]; // First version is current
  const previousVersionData = strategyData?.versions[1]; // Second version is previous
  const accuracyDelta = currentVersionData && previousVersionData ? getAccuracyDelta(currentVersionData, previousVersionData) : null;

  const getStageIcon = () => {
    switch (stageDetails.stageType) {
      case 'input':
        return <TrendingUp className="w-5 h-5 text-blue-400" />;
      case 'output':
        return <TrendingUp className="w-5 h-5 text-emerald-400" />;
      case 'modifier':
        return <Minus className="w-5 h-5 text-amber-400" />;
      default:
        return <Filter className="w-5 h-5 text-slate-400" />;
    }
  };

  const filteredCount = stageDetails.filteredTickers.length;
  const passedCount = stageDetails.passedTickers.length;
  const pendingCount = stageDetails.pendingTickers?.length || 0;
  const hasPending = pendingCount > 0;

  // Get strategy description
  // Strip tier suffix like "(3/8)" to match STRATEGY_DESCRIPTIONS keys
  const baseStageNameMatch = stageDetails.name.match(/^(.+?)\s*\(/);
  const baseStageName = baseStageNameMatch ? baseStageNameMatch[1].trim() : stageDetails.name;
  const strategyDescription = STRATEGY_DESCRIPTIONS[stageDetails.name] || STRATEGY_DESCRIPTIONS[baseStageName] || stageDetails.description;

  // Filter tickers based on search query
  const filterTickers = (tickers: TickerDetail[]) => {
    if (!searchQuery) return tickers;
    return tickers.filter(ticker => 
      ticker.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredOutput = filterTickers(stageDetails.passedTickers);
  const filteredFiltered = filterTickers(stageDetails.filteredTickers);
  const filteredPending = filterTickers(stageDetails.pendingTickers || []);

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* Centered Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-slate-900 rounded-xl shadow-2xl max-w-full sm:max-w-5xl w-full max-h-[95vh] sm:max-h-[85vh] overflow-hidden border border-slate-700/50 flex flex-col">
          {/* Header - sticky */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-700/50 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {getStageIcon()}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-100 truncate">{stageDetails.name}</h2>
                  {strategyData && (
                    <div className="flex items-center gap-2">
                      <div className="bg-slate-800 text-slate-200 px-2 py-1 rounded-md text-xs font-medium">
                        v{strategyData.currentVersion}
                      </div>
                      {accuracyDelta !== null && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                          accuracyDelta >= 0 
                            ? 'bg-emerald-900/50 text-emerald-400'
                            : 'bg-red-900/50 text-red-400'
                        }`}>
                          {accuracyDelta >= 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDownIcon className="w-3 h-3" />
                          )}
                          {accuracyDelta > 0 ? '+' : ''}{accuracyDelta.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-sm text-slate-400 line-clamp-2">{stageDetails.description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors shrink-0 ml-2"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Scrollable body - everything below header scrolls on mobile */}
          <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">

          {/* ======= BLENDED F&G CUSTOM MODAL ======= */}
          {isBlendedFGStrategy(stageDetails.name) ? (
            <>
              {/* Sector Overview with global index + 9 sector gauges + thresholds */}
              <BlendedFGSectorOverview tickers={[...stageDetails.passedTickers, ...stageDetails.filteredTickers]} />

              {/* Version History - Show for Blended F&G strategy */}
              {strategyData && (
                <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-slate-800/20">
                  <button
                    onClick={() => setIsVersionHistoryExpanded(!isVersionHistoryExpanded)}
                    className="flex items-center justify-between w-full text-left group"
                  >
                    <h3 className="text-base sm:text-lg font-semibold text-slate-200 group-hover:text-slate-100 transition-colors">
                      Version History
                    </h3>
                    <div className="flex items-center gap-2">
                      {currentVersionData && (
                        <span className="text-xs text-slate-400">
                          {currentVersionData.accuracy.overall.toFixed(1)}% accuracy
                        </span>
                      )}
                      {isVersionHistoryExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-300 transition-colors" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-300 transition-colors" />
                      )}
                    </div>
                  </button>

                  {/* Current Version Summary - Always visible */}
                  {currentVersionData && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-900/50 rounded-lg p-3">
                        <div className="text-xs text-slate-500">Version</div>
                        <div className="text-sm font-semibold text-slate-200">v{currentVersionData.version}</div>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-3">
                        <div className="text-xs text-slate-500">Last Updated</div>
                        <div className="text-sm font-semibold text-slate-200">
                          {new Date(currentVersionData.date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-3">
                        <div className="text-xs text-slate-500">Accuracy</div>
                        <div className="text-sm font-semibold text-emerald-400">
                          {currentVersionData.accuracy.overall.toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-3">
                        <div className="text-xs text-slate-500">Win Rate</div>
                        <div className="text-sm font-semibold text-slate-200">
                          {(currentVersionData.winRate * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Expanded History */}
                  {isVersionHistoryExpanded && strategyData.versions.length > 1 && (
                    <div className="mt-4 space-y-4">
                      <h4 className="text-sm font-medium text-slate-300">Recent Versions</h4>
                      {strategyData.versions.slice(1, 6).map((version, index) => {
                        const prevVersion = strategyData.versions[index + 1];
                        const versionDelta = prevVersion ? getAccuracyDelta(version, prevVersion) : null;
                        
                        return (
                          <div key={version.version} className="bg-slate-900/30 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-slate-200">v{version.version}</span>
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(version.date).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-slate-300">{version.accuracy.overall.toFixed(1)}%</span>
                                {versionDelta !== null && (
                                  <span className={`flex items-center gap-1 ${
                                    versionDelta >= 0 ? 'text-emerald-400' : 'text-red-400'
                                  }`}>
                                    {versionDelta >= 0 ? (
                                      <TrendingUp className="w-3 h-3" />
                                    ) : (
                                      <TrendingDownIcon className="w-3 h-3" />
                                    )}
                                    {versionDelta > 0 ? '+' : ''}{versionDelta.toFixed(1)}%
                                  </span>
                                )}
                              </div>
                            </div>
                            <ul className="text-xs text-slate-300 space-y-1">
                              {version.changes.slice(0, 3).map((change, changeIndex) => (
                                <li key={changeIndex} className="flex items-start gap-2">
                                  <span className="text-slate-500 mt-1">•</span>
                                  <span>{change}</span>
                                </li>
                              ))}
                              {version.changes.length > 3 && (
                                <li className="text-slate-400 italic">
                                  ... and {version.changes.length - 3} more changes
                                </li>
                              )}
                            </ul>
                          </div>
                        );
                      })}

                      {/* Show regressions if any */}
                      {strategyData.regressions && strategyData.regressions.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-red-400 mb-2">Known Regressions</h4>
                          {strategyData.regressions.map((regression, index) => (
                            <div key={index} className="bg-red-900/20 border border-red-800/30 rounded-lg p-3">
                              <div className="text-sm font-medium text-red-300 mb-1">v{regression.version}</div>
                              <div className="text-xs text-slate-300 mb-2">{regression.issue}</div>
                              <div className="text-xs text-emerald-300">
                                <span className="font-medium">Resolution:</span> {regression.resolution}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Performance Section - Show for Blended F&G strategy */}
              {strategyData && currentVersionData && (
                <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-slate-800/20">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-200 mb-4">Performance</h3>
                  
                  {/* Accuracy Gauge */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-300">Current Strategy Accuracy</span>
                      <span className="text-lg font-bold text-slate-100">
                        {currentVersionData.accuracy.overall.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-700/50 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${
                          currentVersionData.accuracy.overall >= 60 
                            ? 'bg-emerald-500' 
                            : currentVersionData.accuracy.overall >= 50 
                            ? 'bg-amber-500' 
                            : 'bg-red-500'
                        }`}
                        style={{ 
                          width: `${Math.min(currentVersionData.accuracy.overall, 100)}%` 
                        }}
                      />
                    </div>
                  </div>

                  {/* Key Metrics Row */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                      <div className="text-xs text-slate-500 mb-1">Win Rate</div>
                      <div className="text-lg font-bold text-slate-200">
                        {(currentVersionData.winRate * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                      <div className="text-xs text-slate-500 mb-1">Sharpe Ratio</div>
                      <div className="text-lg font-bold text-slate-200">
                        {currentVersionData.sharpe.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                      <div className="text-xs text-slate-500 mb-1">Profit Factor</div>
                      <div className="text-lg font-bold text-slate-200">
                        {currentVersionData.profitFactor.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Asset Class Breakdown */}
                  {currentVersionData.accuracy.byAssetClass && Object.keys(currentVersionData.accuracy.byAssetClass).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-300 mb-3">Asset Class Breakdown</h4>
                      <div className="space-y-2">
                        {Object.entries(currentVersionData.accuracy.byAssetClass)
                          .sort(([,a], [,b]) => b - a) // Sort by accuracy descending
                          .map(([assetClass, accuracy]) => (
                            <div key={assetClass} className="flex items-center justify-between p-2 bg-slate-900/30 rounded-lg">
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-slate-300 capitalize">
                                  {assetClass.replace(/_/g, ' ')}
                                </span>
                                <div className="w-16 bg-slate-700/50 rounded-full h-1.5">
                                  <div 
                                    className={`h-1.5 rounded-full ${
                                      accuracy >= 60 
                                        ? 'bg-emerald-500' 
                                        : accuracy >= 50 
                                        ? 'bg-amber-500' 
                                        : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min(accuracy, 100)}%` }}
                                  />
                                </div>
                              </div>
                              <span className={`text-sm font-medium ${
                                accuracy >= 60 
                                  ? 'text-emerald-400' 
                                  : accuracy >= 50 
                                  ? 'text-amber-400' 
                                  : 'text-red-400'
                              }`}>
                                {accuracy.toFixed(1)}%
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Summary Stats */}
              <div className="p-4 sm:p-6 border-b border-slate-700/50">
                {hasPending ? (
                  /* 4-column layout for persistence gate: Input / Confirmed / Pending / Filtered */
                  <div className="grid grid-cols-4 gap-3">
                    <div className="text-center">
                      <div className="text-lg sm:text-xl font-bold text-slate-200">{stageDetails.inputCount.toLocaleString()}</div>
                      <div className="text-[10px] sm:text-xs text-slate-400">Input</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg sm:text-xl font-bold text-emerald-400">{passedCount.toLocaleString()}</div>
                      <div className="text-[10px] sm:text-xs text-emerald-500/70">Confirmed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg sm:text-xl font-bold text-amber-400">{pendingCount.toLocaleString()}</div>
                      <div className="text-[10px] sm:text-xs text-amber-500/70">Pending</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg sm:text-xl font-bold text-red-400">{filteredCount.toLocaleString()}</div>
                      <div className="text-[10px] sm:text-xs text-red-500/70">Filtered</div>
                    </div>
                  </div>
                ) : (
                  /* Standard 3-column layout */
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-xl sm:text-2xl font-bold text-slate-200">{stageDetails.inputCount.toLocaleString()}</div>
                      <div className="text-xs sm:text-sm text-slate-400">Input</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl sm:text-2xl font-bold text-emerald-400">{stageDetails.outputCount.toLocaleString()}</div>
                      <div className="text-xs sm:text-sm text-slate-400">Output</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl sm:text-2xl font-bold text-red-400">{filteredCount.toLocaleString()}</div>
                      <div className="text-xs sm:text-sm text-slate-400">Filtered</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Search */}
              <div className="p-4 sm:p-6 border-b border-slate-700/50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search symbols..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-700/50 bg-slate-800/20 sticky top-0 z-10">
                <button
                  onClick={() => setActiveTab('output')}
                  className={`px-3 sm:px-5 py-3 text-sm font-medium transition-all relative ${
                    activeTab === 'output' ? 'text-emerald-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
                  }`}
                >
                  {stageDetails.name.includes('Agent Analysis') ? 'Output' : 'Confirmed'} ({filteredOutput.length})
                  {activeTab === 'output' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />}
                </button>
                {hasPending && (
                  <button
                    onClick={() => setActiveTab('pending')}
                    className={`px-3 sm:px-5 py-3 text-sm font-medium transition-all relative ${
                      activeTab === 'pending' ? 'text-amber-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
                    }`}
                  >
                    Pending ({filteredPending.length})
                    {activeTab === 'pending' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />}
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('filtered')}
                  className={`px-3 sm:px-5 py-3 text-sm font-medium transition-all relative ${
                    activeTab === 'filtered' ? 'text-red-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
                  }`}
                >
                  Filtered ({filteredFiltered.length})
                  {activeTab === 'filtered' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-400" />}
                </button>
              </div>

              {/* Ticker list — simplified rows */}
              <div className="p-4 sm:p-6">
                {activeTab === 'output' && (
                  <div className="space-y-2">
                    {filteredOutput.length > 0 ? (
                      filteredOutput.map((ticker, idx) => (
                        stageDetails.name.includes('Agent Analysis') ? (
                          <AgentAnalysisTickerRow key={idx} ticker={ticker} />
                        ) : stageDetails.name.includes('Signal Gating') ? (
                          <SignalGatingTickerRow key={idx} ticker={ticker} />
                        ) : (
                          <BlendedFGTickerRow key={idx} ticker={ticker} />
                        )
                      ))
                    ) : (
                      <div className="text-center text-slate-400 py-8">
                        {searchQuery ? `No tickers matching "${searchQuery}"` : stageDetails.name.includes('Agent Analysis') ? 'No tickers passed all 5 agent filters' : 'No confirmed tickers yet — signals need 2 consecutive days to confirm'}
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'pending' && (
                  <div className="space-y-2">
                    {filteredPending.length > 0 ? (
                      filteredPending.slice(0, 100).map((ticker, idx) => (
                        stageDetails.name.includes('Agent Analysis') ? (
                          <AgentAnalysisTickerRow key={idx} ticker={ticker} />
                        ) : stageDetails.name.includes('Signal Gating') ? (
                          <SignalGatingTickerRow key={idx} ticker={ticker} />
                        ) : (
                          <BlendedFGTickerRow key={idx} ticker={ticker} />
                        )
                      ))
                    ) : (
                      <div className="text-center text-slate-400 py-8">
                        {searchQuery ? `No pending tickers matching "${searchQuery}"` : 'No pending tickers'}
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'filtered' && (
                  <div className="space-y-2">
                    {filteredFiltered.length > 0 ? (
                      filteredFiltered.slice(0, 100).map((ticker, idx) => (
                        stageDetails.name.includes('Agent Analysis') ? (
                          <AgentAnalysisTickerRow key={idx} ticker={ticker} isFiltered />
                        ) : stageDetails.name.includes('Signal Gating') ? (
                          <SignalGatingTickerRow key={idx} ticker={ticker} />
                        ) : (
                          <BlendedFGTickerRow key={idx} ticker={ticker} />
                        )
                      ))
                    ) : (
                      <div className="text-center text-slate-400 py-8">
                        {searchQuery ? `No filtered tickers matching "${searchQuery}"` : stageDetails.name.includes('Agent Analysis') ? 'All tickers passed — all agents agree on every signal' : 'No filtered tickers — signals that fail day-2 confirmation appear here'}
                      </div>
                    )}
                    {filteredFiltered.length > 100 && !searchQuery && (
                      <div className="text-center text-slate-400 text-sm py-4">
                        ... and {filteredFiltered.length - 100} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
          <>
          {/* ======= DEFAULT MODAL (all other strategies) ======= */}

          {/* Strategy Description Card - explanation first to set context */}
          <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-slate-800/30">
            <h3 className="text-base sm:text-lg font-semibold text-slate-200 mb-2">How This Strategy Works</h3>
            <div className="text-slate-300 text-sm leading-relaxed space-y-2">
              {strategyDescription.split('\n').map((line: string, i: number) => {
                // Handle **bold** markers
                const parts = line.split(/\*\*(.*?)\*\*/g);
                const rendered = parts.map((part: string, j: number) =>
                  j % 2 === 1
                    ? <span key={j} className="font-semibold text-slate-200">{part}</span>
                    : <span key={j}>{part}</span>
                );
                // Bullet lines get special styling
                if (line.trim().startsWith('•')) {
                  return <div key={i} className="pl-3 text-slate-400">{rendered}</div>;
                }
                // Empty lines become spacing
                if (line.trim() === '') return <div key={i} className="h-1" />;
                return <div key={i}>{rendered}</div>;
              })}
            </div>
          </div>

          {/* Strategy Technical Overview - visual analysis after explanation */}
          <StrategyTechnicalOverview 
            strategyName={stageDetails.name}
            tickers={[...stageDetails.passedTickers, ...stageDetails.filteredTickers]}
          />

          {/* Version History - Show only for individual strategy modals */}
          {strategyData && isIndividualStrategy(stageDetails.name) && (
            <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-slate-800/20">
              <button
                onClick={() => setIsVersionHistoryExpanded(!isVersionHistoryExpanded)}
                className="flex items-center justify-between w-full text-left group"
              >
                <h3 className="text-base sm:text-lg font-semibold text-slate-200 group-hover:text-slate-100 transition-colors">
                  Version History
                </h3>
                <div className="flex items-center gap-2">
                  {currentVersionData && (
                    <span className="text-xs text-slate-400">
                      {currentVersionData.accuracy.overall.toFixed(1)}% accuracy
                    </span>
                  )}
                  {isVersionHistoryExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-300 transition-colors" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-300 transition-colors" />
                  )}
                </div>
              </button>

              {/* Current Version Summary - Always visible */}
              {currentVersionData && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-xs text-slate-500">Version</div>
                    <div className="text-sm font-semibold text-slate-200">v{currentVersionData.version}</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-xs text-slate-500">Last Updated</div>
                    <div className="text-sm font-semibold text-slate-200">
                      {new Date(currentVersionData.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-xs text-slate-500">Accuracy</div>
                    <div className="text-sm font-semibold text-emerald-400">
                      {currentVersionData.accuracy.overall.toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-xs text-slate-500">Win Rate</div>
                    <div className="text-sm font-semibold text-slate-200">
                      {(currentVersionData.winRate * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}

              {/* Expanded History */}
              {isVersionHistoryExpanded && strategyData.versions.length > 1 && (
                <div className="mt-4 space-y-4">
                  <h4 className="text-sm font-medium text-slate-300">Recent Versions</h4>
                  {strategyData.versions.slice(1, 6).map((version, index) => {
                    const prevVersion = strategyData.versions[index + 1];
                    const versionDelta = prevVersion ? getAccuracyDelta(version, prevVersion) : null;
                    
                    return (
                      <div key={version.version} className="bg-slate-900/30 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-slate-200">v{version.version}</span>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(version.date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-300">{version.accuracy.overall.toFixed(1)}%</span>
                            {versionDelta !== null && (
                              <span className={`flex items-center gap-1 ${
                                versionDelta >= 0 ? 'text-emerald-400' : 'text-red-400'
                              }`}>
                                {versionDelta >= 0 ? (
                                  <TrendingUp className="w-3 h-3" />
                                ) : (
                                  <TrendingDownIcon className="w-3 h-3" />
                                )}
                                {versionDelta > 0 ? '+' : ''}{versionDelta.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>
                        <ul className="text-xs text-slate-300 space-y-1">
                          {version.changes.slice(0, 3).map((change, changeIndex) => (
                            <li key={changeIndex} className="flex items-start gap-2">
                              <span className="text-slate-500 mt-1">•</span>
                              <span>{change}</span>
                            </li>
                          ))}
                          {version.changes.length > 3 && (
                            <li className="text-slate-400 italic">
                              ... and {version.changes.length - 3} more changes
                            </li>
                          )}
                        </ul>
                      </div>
                    );
                  })}

                  {/* Show regressions if any */}
                  {strategyData.regressions && strategyData.regressions.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-red-400 mb-2">Known Regressions</h4>
                      {strategyData.regressions.map((regression, index) => (
                        <div key={index} className="bg-red-900/20 border border-red-800/30 rounded-lg p-3">
                          <div className="text-sm font-medium text-red-300 mb-1">v{regression.version}</div>
                          <div className="text-xs text-slate-300 mb-2">{regression.issue}</div>
                          <div className="text-xs text-emerald-300">
                            <span className="font-medium">Resolution:</span> {regression.resolution}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Performance Section - Show only for individual strategy modals */}
          {strategyData && isIndividualStrategy(stageDetails.name) && currentVersionData && (
            <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-slate-800/20">
              <h3 className="text-base sm:text-lg font-semibold text-slate-200 mb-4">Performance</h3>
              
              {/* Accuracy Gauge */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-300">Current Strategy Accuracy</span>
                  <span className="text-lg font-bold text-slate-100">
                    {currentVersionData.accuracy.overall.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-slate-700/50 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${
                      currentVersionData.accuracy.overall >= 60 
                        ? 'bg-emerald-500' 
                        : currentVersionData.accuracy.overall >= 50 
                        ? 'bg-amber-500' 
                        : 'bg-red-500'
                    }`}
                    style={{ 
                      width: `${Math.min(currentVersionData.accuracy.overall, 100)}%` 
                    }}
                  />
                </div>
              </div>

              {/* Key Metrics Row */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-500 mb-1">Win Rate</div>
                  <div className="text-lg font-bold text-slate-200">
                    {(currentVersionData.winRate * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-500 mb-1">Sharpe Ratio</div>
                  <div className="text-lg font-bold text-slate-200">
                    {currentVersionData.sharpe.toFixed(2)}
                  </div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-500 mb-1">Profit Factor</div>
                  <div className="text-lg font-bold text-slate-200">
                    {currentVersionData.profitFactor.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Asset Class Breakdown */}
              {currentVersionData.accuracy.byAssetClass && Object.keys(currentVersionData.accuracy.byAssetClass).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-3">Asset Class Breakdown</h4>
                  <div className="space-y-2">
                    {Object.entries(currentVersionData.accuracy.byAssetClass)
                      .sort(([,a], [,b]) => b - a) // Sort by accuracy descending
                      .map(([assetClass, accuracy]) => (
                        <div key={assetClass} className="flex items-center justify-between p-2 bg-slate-900/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-300 capitalize">
                              {assetClass.replace(/_/g, ' ')}
                            </span>
                            <div className="w-16 bg-slate-700/50 rounded-full h-1.5">
                              <div 
                                className={`h-1.5 rounded-full ${
                                  accuracy >= 60 
                                    ? 'bg-emerald-500' 
                                    : accuracy >= 50 
                                    ? 'bg-amber-500' 
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(accuracy, 100)}%` }}
                              />
                            </div>
                          </div>
                          <span className={`text-sm font-medium ${
                            accuracy >= 60 
                              ? 'text-emerald-400' 
                              : accuracy >= 50 
                              ? 'text-amber-400' 
                              : 'text-red-400'
                          }`}>
                            {accuracy.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Strategy Parameters - Show for individual strategy gates */}
          {isIndividualStrategy(stageDetails.name) && (
            <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-slate-800/20">
              <h3 className="text-base sm:text-lg font-semibold text-slate-200 mb-2">Strategy Parameters (read-only)</h3>
              <p className="text-xs text-slate-500 mb-4">Configuration coming soon</p>
              <StrategyParameters 
                strategyName={stageDetails.name} 
                sampleTicker={stageDetails.passedTickers[0] || stageDetails.filteredTickers[0]} 
              />
            </div>
          )}
          
          {/* Summary Stats */}
          <div className="p-4 sm:p-6 border-b border-slate-700/50">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-slate-200">{stageDetails.inputCount.toLocaleString()}</div>
                <div className="text-xs sm:text-sm text-slate-400">Input</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-emerald-400">{stageDetails.outputCount.toLocaleString()}</div>
                <div className="text-xs sm:text-sm text-slate-400">Output</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-red-400">{filteredCount.toLocaleString()}</div>
                <div className="text-xs sm:text-sm text-slate-400">Filtered</div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-4 sm:p-6 border-b border-slate-700/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search symbols..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Tab Controls - sticky within scroll */}
          <div className="flex border-b border-slate-700/50 bg-slate-800/20 sticky top-0 z-10">
            <button
              onClick={() => setActiveTab('output')}
              className={`px-4 sm:px-6 py-3 text-sm font-medium transition-all relative ${
                activeTab === 'output'
                  ? 'text-emerald-400 bg-slate-800/50'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
              }`}
            >
              Output ({filteredOutput.length})
              {activeTab === 'output' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('filtered')}
              className={`px-4 sm:px-6 py-3 text-sm font-medium transition-all relative ${
                activeTab === 'filtered'
                  ? 'text-red-400 bg-slate-800/50'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
              }`}
            >
              Filtered ({filteredFiltered.length})
              {activeTab === 'filtered' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-400" />
              )}
            </button>
          </div>
          
          {/* Strategy Legend — for Vote Consensus sub-modals */}
          {stageDetails.name.includes('Vote Consensus') && (
            <div className="px-4 sm:px-6 pt-4 pb-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
                {[
                  { label: 'Fear & Greed', color: 'bg-emerald-400' },
                  { label: 'Multi-TF Trend', color: 'bg-blue-400' },
                  { label: 'ConnorsRSI', color: 'bg-orange-400' },
                  { label: 'Dual Band MR', color: 'bg-purple-400' },
                  { label: 'Dual Momentum', color: 'bg-red-400' },
                  { label: 'TS Momentum', color: 'bg-cyan-400' },
                  { label: 'QVM Factor', color: 'bg-pink-400' },
                  { label: 'VIX Reversion', color: 'bg-amber-400' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
            <div className="p-4 sm:p-6">
              {activeTab === 'output' && (
                <div className="space-y-3">
                  {filteredOutput.length > 0 ? (
                    filteredOutput
                      .sort((a, b) => (b.signalStrength || 0) - (a.signalStrength || 0))
                      .map((ticker, idx) => (
                        stageDetails.name.includes('Agent Analysis') ? (
                          <AgentAnalysisTickerRow key={idx} ticker={ticker} />
                        ) : (
                          <TickerTechnicalBreakdown
                            key={idx}
                            symbol={ticker.symbol}
                            signal={ticker.signal}
                            signalStrength={ticker.signalStrength}
                            currentPrice={ticker.currentPrice}
                            rawData={ticker.rawData}
                            reason={ticker.reason}
                            stageType={stageDetails.stageType}
                            stageName={stageDetails.name}
                          />
                        )
                      ))
                  ) : (
                    <div className="text-center text-slate-400 py-8">
                      {searchQuery 
                        ? `No tickers found matching "${searchQuery}"` 
                        : stageDetails.name.includes('Vote Consensus')
                          ? "No tickers currently reach this consensus level"
                          : stageDetails.name.includes('Agent Analysis')
                            ? "No tickers passed all 5 agent filters"
                            : "No output tickers"
                      }
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'filtered' && (
                <div className="space-y-3">
                  {filteredFiltered.length > 0 ? (
                    filteredFiltered.slice(0, 100).map((ticker, idx) => (
                      stageDetails.name.includes('Agent Analysis') ? (
                        <AgentAnalysisTickerRow key={idx} ticker={ticker} isFiltered />
                      ) : (
                        <TickerTechnicalBreakdown
                          key={idx}
                          symbol={ticker.symbol}
                          signal={ticker.signal}
                          signalStrength={ticker.signalStrength}
                          currentPrice={ticker.currentPrice}
                          rawData={ticker.rawData}
                          reason={ticker.reason}
                          stageType={stageDetails.stageType}
                          stageName={stageDetails.name}
                        />
                      )
                    ))
                  ) : (
                    <div className="text-center text-slate-400 py-8">
                      {searchQuery ? `No filtered tickers found matching "${searchQuery}"` : "No filtered tickers"}
                    </div>
                  )}
                  {filteredFiltered.length > 100 && !searchQuery && (
                    <div className="text-center text-slate-400 text-sm py-4">
                      ... and {filteredFiltered.length - 100} more filtered tickers
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
          )}
          </div>
        </div>
      </div>
    </>
  );
}