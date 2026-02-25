"use client";

import { useState } from "react";
import { 
  ChevronDown, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Target,
  BarChart3,
  Gauge,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  ExternalLink
} from "lucide-react";

// Define the MRESignal interface locally with CORRECT types matching actual JSON data
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
    pullback_date?: string;
  };
  // New sector F&G fields from A-198 pipeline update
  global_fg?: number;
  sector_fg?: number;
  effective_fg?: number;
  fg_divergence?: number;
  fg_divergence_bonus?: number;
  fg_blend_weights?: {
    global_weight: number;
    sector_weight: number;
  };
}

interface TickerTechnicalBreakdownProps {
  symbol: string;
  signal?: string;
  signalStrength?: number;
  currentPrice?: number;
  rawData?: MRESignal;
  reason?: string;
  stageType: 'input' | 'filter' | 'modifier' | 'output';
  stageName: string;
}

// Helper functions
const getSignalColor = (signal?: string) => {
  switch (signal) {
    case 'BUY': return 'text-emerald-400';
    case 'HOLD': return 'text-amber-400';
    case 'SELL': return 'text-red-400';
    case 'WATCH': return 'text-slate-400';
    default: return 'text-slate-300';
  }
};

const getSignalBg = (signal?: string) => {
  switch (signal) {
    case 'BUY': return 'bg-emerald-900/50 border-emerald-700/50';
    case 'HOLD': return 'bg-amber-900/50 border-amber-700/50';
    case 'SELL': return 'bg-red-900/50 border-red-700/50';
    case 'WATCH': return 'bg-slate-900/50 border-slate-700/50';
    default: return 'bg-slate-800/50 border-slate-700/50';
  }
};

export default function TickerTechnicalBreakdown({
  symbol,
  signal,
  signalStrength,
  currentPrice,
  rawData,
  reason,
  stageType,
  stageName
}: TickerTechnicalBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'technical' | 'regime' | 'fibonacci'>('overview');

  // Strategy color mapping — consistent across legend and dots (all 8 strategies)
  const STRATEGY_COLORS: Record<string, { active: string; inactive: string }> = {
    fear_greed:            { active: 'bg-emerald-400', inactive: 'bg-emerald-400/20' },
    regime_confirmation:   { active: 'bg-blue-400',    inactive: 'bg-blue-400/20' },
    rsi_oversold:          { active: 'bg-orange-400',  inactive: 'bg-orange-400/20' },
    mean_reversion:        { active: 'bg-purple-400',  inactive: 'bg-purple-400/20' },
    momentum:              { active: 'bg-red-400',     inactive: 'bg-red-400/20' },
    time_series_momentum:  { active: 'bg-cyan-400',    inactive: 'bg-cyan-400/20' },
    qvm_factor:            { active: 'bg-pink-400',    inactive: 'bg-pink-400/20' },
    vix_mean_reversion:    { active: 'bg-amber-400',   inactive: 'bg-amber-400/20' },
  };

  const isVoteConsensusSubModal = stageName.includes('Vote Consensus');

  // Simplified view for Vote Consensus sub-modals
  if (isVoteConsensusSubModal && rawData?.strategy_votes) {
    return (
      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 flex items-center justify-between">
        <span className="font-mono font-semibold text-slate-200">{symbol}</span>
        <div className="flex items-center gap-1.5">
          {[
            { key: 'fear_greed' },
            { key: 'regime_confirmation' },
            { key: 'rsi_oversold' },
            { key: 'mean_reversion' },
            { key: 'momentum' },
            { key: 'time_series_momentum' },
            { key: 'qvm_factor' },
            { key: 'vix_mean_reversion' },
          ].map(strategy => {
            // Check both confirmed votes and persistence-pending votes
            const voted = rawData.strategy_votes?.[strategy.key as keyof typeof rawData.strategy_votes]
              || (rawData.persistence_by_strategy && (rawData.persistence_by_strategy as any)[strategy.key] > 0);
            const colors = STRATEGY_COLORS[strategy.key] || { active: 'bg-slate-400', inactive: 'bg-slate-400/20' };
            return (
              <div
                key={strategy.key}
                className={`w-3 h-3 rounded-full ${voted ? colors.active : colors.inactive}`}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // Simplified view for individual strategy gate modals
  const isStrategyGateModal = 
    stageName.includes('Fear & Greed Strategy') ||
    stageName.includes('Regime Confirm Strategy') ||
    stageName.includes('RSI Oversold Strategy') ||
    stageName.includes('Mean Reversion Strategy') ||
    stageName.includes('Momentum Strategy');

  if (isStrategyGateModal && rawData) {
    // Render strategy-specific compact row
    const renderStrategyData = () => {
      if (stageName.includes('Fear & Greed') || stageName.includes('Blended F&G')) {
        const fg = rawData.effective_fg ?? rawData.current_fg;  // Use blended score if available
        const threshold = rawData.fear_threshold;
        const triggered = fg !== undefined && threshold !== undefined && fg <= threshold;
        const hasBlendedData = rawData.global_fg !== undefined && rawData.sector_fg !== undefined;
        
        return (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">{hasBlendedData ? 'Effective' : 'F&G'}: <span className={`font-medium ${fg !== undefined && fg <= 25 ? 'text-red-400' : fg !== undefined && fg <= 45 ? 'text-amber-400' : 'text-emerald-400'}`}>{fg?.toFixed(0) ?? '—'}</span></span>
            {hasBlendedData && (
              <>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400">Global: <span className="text-slate-200 font-medium">{rawData.global_fg?.toFixed(0) ?? '—'}</span></span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400">Sector: <span className="text-slate-200 font-medium">{rawData.sector_fg?.toFixed(0) ?? '—'}</span></span>
              </>
            )}
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">Threshold: <span className="text-slate-200 font-medium">{threshold ?? '—'}</span></span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${triggered ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-700/50 text-slate-400'}`}>
              {triggered ? '✓ Triggered' : '✗ Not triggered'}
            </span>
          </div>
        );
      }

      if (stageName.includes('Regime Confirm')) {
        const price = rawData.price;
        const regime = rawData.regime;
        const rd = rawData.regime_details;
        // Fallback chain: 200 → 150 → 100 → 50 → 20
        const emaChain: { value: number | undefined; label: string }[] = [
          { value: rd?.ema_200, label: 'EMA 200' },
          { value: rd?.ema_150, label: 'EMA 150' },
          { value: rd?.ema_100, label: 'EMA 100' },
          { value: rd?.ema_50, label: 'EMA 50' },
          { value: rd?.ema_20, label: 'EMA 20' },
        ];
        const bestEma = emaChain.find(e => e.value !== undefined && e.value !== null && e.value > 0);
        const compareEma = bestEma?.value;
        const compareLabel = bestEma?.label ?? null;
        const pctAbove = price && compareEma ? ((price - compareEma) / compareEma * 100) : undefined;
        return (
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span className="text-slate-400">Price: <span className="text-slate-200 font-medium">${price?.toFixed(2) ?? '—'}</span></span>
            {compareLabel && compareEma ? (
              <>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400">{compareLabel}: <span className="text-slate-200 font-medium">${compareEma.toFixed(2)}</span></span>
                {pctAbove !== undefined && (
                  <>
                    <span className="text-slate-500">|</span>
                    <span className={`font-medium ${pctAbove >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {pctAbove >= 0 ? '+' : ''}{pctAbove.toFixed(1)}%
                    </span>
                  </>
                )}
              </>
            ) : null}
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${regime === 'bull' ? 'bg-emerald-900/50 text-emerald-400' : regime === 'bear' ? 'bg-red-900/50 text-red-400' : 'bg-amber-900/50 text-amber-400'}`}>
              {regime ?? '—'}
            </span>
          </div>
        );
      }

      if (stageName.includes('RSI Oversold')) {
        const rsi = rawData.rsi_14;
        const rsiColor = rsi !== undefined 
          ? rsi < 30 ? 'text-emerald-400' : rsi > 70 ? 'text-red-400' : 'text-amber-400'
          : 'text-slate-400';
        return (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">RSI (14): <span className={`font-medium ${rsiColor}`}>{rsi?.toFixed(1) ?? '—'}</span></span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">Threshold: <span className="text-slate-200 font-medium">30</span></span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${rsi !== undefined && rsi < 30 ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-700/50 text-slate-400'}`}>
              {rsi !== undefined && rsi < 30 ? '✓ Oversold' : '✗ Not oversold'}
            </span>
          </div>
        );
      }

      if (stageName.includes('Mean Reversion')) {
        const ret5d = rawData.return_5d;
        const dip = rawData.dip_5d_pct;
        const triggered = ret5d !== undefined && ret5d <= -5.0;
        return (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">5d Return: <span className={`font-medium ${ret5d !== undefined ? (ret5d <= -5 ? 'text-emerald-400' : ret5d < 0 ? 'text-amber-400' : 'text-slate-300') : 'text-slate-400'}`}>{ret5d !== undefined ? `${ret5d >= 0 ? '+' : ''}${ret5d.toFixed(1)}%` : '—'}</span></span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">Threshold: <span className="text-slate-200 font-medium">-5.0%</span></span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${triggered ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-700/50 text-slate-400'}`}>
              {triggered ? '✓ Dip detected' : '✗ No dip'}
            </span>
          </div>
        );
      }

      if (stageName.includes('Momentum')) {
        const mom = rawData.momentum_20d;
        const triggered = mom !== undefined && mom >= 10.0;
        return (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">20d Momentum: <span className={`font-medium ${mom !== undefined ? (mom >= 10 ? 'text-emerald-400' : mom >= 0 ? 'text-amber-400' : 'text-red-400') : 'text-slate-400'}`}>{mom !== undefined ? `${mom >= 0 ? '+' : ''}${mom.toFixed(1)}%` : '—'}</span></span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">Threshold: <span className="text-slate-200 font-medium">+10.0%</span></span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${triggered ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-700/50 text-slate-400'}`}>
              {triggered ? '✓ Strong' : '✗ Weak'}
            </span>
          </div>
        );
      }

      return null;
    };

    return (
      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono font-semibold text-slate-200">{symbol}</span>
          {rawData.price && (
            <span className="text-xs text-slate-400">${rawData.price.toFixed(2)}</span>
          )}
        </div>
        {renderStrategyData()}
      </div>
    );
  }

  if (!rawData) {
    // Fallback for when no raw data is available
    return (
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono font-semibold text-slate-200">{symbol}</span>
            {signal && (
              <span className={`px-2 py-1 rounded text-xs font-medium border ${getSignalBg(signal)}`}>
                {signal}
              </span>
            )}
          </div>
          {currentPrice && (
            <div className="flex items-center gap-1 text-slate-400">
              <DollarSign className="w-3 h-3" />
              <span className="text-sm">{currentPrice.toFixed(2)}</span>
            </div>
          )}
        </div>
        {reason && (
          <div className="mt-2 text-sm text-slate-400">{reason}</div>
        )}
      </div>
    );
  }

  const getRsiColor = (rsi?: number) => {
    if (!rsi) return 'text-slate-400';
    if (rsi < 30) return 'text-emerald-400'; // Oversold - good for buying
    if (rsi > 70) return 'text-red-400';     // Overbought - avoid buying
    return 'text-amber-400';                 // Neutral
  };

  const getBBPositionColor = (position?: string) => {
    switch (position) {
      case 'below_lower': return 'text-emerald-400'; // Good for buying
      case 'above_upper': return 'text-red-400';     // Avoid buying
      default: return 'text-slate-400';              // Within bands
    }
  };

  const getReturnColor = (returnPct?: number) => {
    if (!returnPct) return 'text-slate-400';
    return returnPct >= 0 ? 'text-emerald-400' : 'text-red-400';
  };

  const generatePipelineDecision = () => {
    if (!rawData) return "No detailed data available.";
    
    const { signal, signal_strength, signal_source, regime, momentum_20d, rsi_14, bear_suppressed, sell_suppressed } = rawData;
    
    if (signal === 'BUY') {
      return `${symbol} passed via ${signal_source} strategy with ${momentum_20d ? `${momentum_20d.toFixed(1)}% 20d momentum` : 'momentum data'} in ${regime} regime. RSI ${rsi_14 ? `at ${rsi_14.toFixed(1)}` : 'neutral'}. Signal strength: ${signal_strength.toFixed(1)}.`;
    }
    
    if (signal === 'HOLD') {
      if (bear_suppressed) {
        return `${symbol} bear_suppressed: BUY signal blocked due to ${regime} regime despite meeting ${signal_source} criteria.`;
      }
      if (sell_suppressed) {
        return `${symbol} sell_suppressed: Signal adjusted to HOLD for risk management.`;
      }
      const failedVotes = rawData.strategy_votes ? Object.entries(rawData.strategy_votes).filter(([_, voted]) => !voted).map(([strategy, _]) => strategy).join(', ') : 'strategies';
      return `${symbol} failed ${failedVotes}. ${regime} regime with ${momentum_20d ? `${momentum_20d.toFixed(1)}%` : 'negative'} momentum. RSI at ${rsi_14 || 'unknown'}.`;
    }
    
    return `${symbol} signal: ${signal}. ${reason || 'See technical details for more information.'}`;
  };

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden transition-all duration-200">
      {/* Main Row - Always Visible */}
      <div 
        className="p-4 cursor-pointer hover:bg-slate-800/80 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
            <span className="font-mono font-semibold text-slate-200">{symbol}</span>
            {signal && (
              <span className={`px-2 py-1 rounded text-xs font-medium border ${
                // In Vote Consensus contexts, these tickers passed the strategy vote — show BUY
                (stageName.includes('Vote Consensus') || stageName.includes('-of-5'))
                  ? getSignalBg('BUY')
                  : getSignalBg(signal)
              }`}>
                {stageName.includes('Vote Consensus') ? 'BUY' : signal}
              </span>
            )}
            {rawData.asset_class && (
              <span className="text-xs text-slate-500 capitalize">{rawData.asset_class}</span>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {/* Strategy Vote Indicators — only show on the main Vote Consensus Gate, not on specific N-of-5 sub-modals where it's redundant */}
            {(stageName.includes('Vote Consensus') || stageName.includes('consensus')) && rawData.strategy_votes && (
              <div className="flex items-center gap-1">
                {[
                  { key: 'fear_greed', label: 'F&G' },
                  { key: 'regime_confirmation', label: 'Trend' },
                  { key: 'rsi_oversold', label: 'RSI' },
                  { key: 'mean_reversion', label: 'MR' },
                  { key: 'momentum', label: 'Mom' },
                  { key: 'time_series_momentum', label: 'TS' },
                  { key: 'qvm_factor', label: 'QVM' },
                  { key: 'vix_mean_reversion', label: 'VIX' },
                ].map(strategy => {
                  const voted = rawData.strategy_votes?.[strategy.key as keyof typeof rawData.strategy_votes]
                    || (rawData.persistence_by_strategy && (rawData.persistence_by_strategy as any)[strategy.key] > 0);
                  const colors = STRATEGY_COLORS[strategy.key] || { active: 'bg-slate-400', inactive: 'bg-slate-600' };
                  return (
                    <div
                      key={strategy.key}
                      className={`w-2 h-2 rounded-full ${
                        voted ? colors.active : 'bg-slate-600'
                      }`}
                      title={`${strategy.label}: ${voted ? '✓' : '✗'}`}
                    />
                  );
                })}
                <span className="text-xs text-slate-400 ml-1">
                  {rawData.strategies_agreeing}/8
                </span>
              </div>
            )}
            
            {/* Quick indicators */}
            <div className="flex items-center gap-2 text-xs">
              {rawData.rsi_14 && (
                <span className={`${getRsiColor(rawData.rsi_14)}`}>
                  RSI: {rawData.rsi_14.toFixed(0)}
                </span>
              )}
              {rawData.momentum_20d && (
                <span className={`${getReturnColor(rawData.momentum_20d)}`}>
                  20d: {rawData.momentum_20d >= 0 ? '+' : ''}{rawData.momentum_20d.toFixed(1)}%
                </span>
              )}
            </div>
            {signalStrength !== undefined && signalStrength > 0 && (
              <div className="text-sm">
                <span className="text-slate-400">Conf: </span>
                <span className="text-emerald-400 font-medium">{Math.round(signalStrength)}</span>
              </div>
            )}
            {currentPrice && (
              <div className="flex items-center gap-1 text-slate-400">
                <DollarSign className="w-3 h-3" />
                <span className="text-sm">{currentPrice.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
        
        {reason && !isExpanded && (
          <div className="mt-2 text-sm text-slate-400">{reason}</div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-700/50">
          {/* Tab Navigation */}
          <div className="flex border-b border-slate-700/50">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'overview' 
                  ? 'border-b-2 border-primary-500 text-primary-400' 
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('technical')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'technical' 
                  ? 'border-b-2 border-primary-500 text-primary-400' 
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Technical
            </button>
            {rawData.regime_details && (
              <button
                onClick={() => setActiveTab('regime')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'regime' 
                    ? 'border-b-2 border-primary-500 text-primary-400' 
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Regime
              </button>
            )}
            {rawData.fibonacci && (
              <button
                onClick={() => setActiveTab('fibonacci')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'fibonacci' 
                    ? 'border-b-2 border-primary-500 text-primary-400' 
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Fibonacci
              </button>
            )}
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {activeTab === 'overview' && (
              <OverviewTab 
                rawData={rawData} 
                reason={reason} 
                generatePipelineDecision={generatePipelineDecision}
                stageName={stageName}
              />
            )}
            {activeTab === 'technical' && (
              <TechnicalTab rawData={rawData} />
            )}
            {activeTab === 'regime' && rawData.regime_details && (
              <RegimeTab rawData={rawData} />
            )}
            {activeTab === 'fibonacci' && rawData.fibonacci && (
              <FibonacciTab rawData={rawData} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Overview Tab Component - FOCUSED ON CURRENT STRATEGY ONLY
function OverviewTab({ 
  rawData, 
  reason, 
  generatePipelineDecision, 
  stageName 
}: { 
  rawData: MRESignal; 
  reason?: string; 
  generatePipelineDecision: () => string;
  stageName: string;
}) {
  
  // Determine which strategy to focus on based on stageName
  const getRelevantStrategy = (stageName: string) => {
    if (stageName.includes('Fear & Greed') || stageName.includes('Blended F&G')) return 'fear_greed';
    if (stageName.includes('Regime Confirm')) return 'regime_confirmation';
    if (stageName.includes('RSI Oversold')) return 'rsi_oversold';
    if (stageName.includes('Mean Reversion')) return 'mean_reversion';
    if (stageName.includes('Momentum')) return 'momentum';
    return null; // For non-strategy stages, show all
  };

  const relevantStrategy = getRelevantStrategy(stageName);

  return (
    <div className="space-y-4">
      {/* Financial Chart - TradingView Link */}
      <div>
        <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Financial Chart
        </h4>
        <div className="bg-slate-900/50 rounded p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">View live chart with technical indicators</span>
            <a
              href={`https://www.tradingview.com/chart/?symbol=${rawData.symbol}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              View Chart
            </a>
          </div>
        </div>
      </div>

      {/* Strategy Analysis - FOCUSED ON CURRENT STRATEGY */}
      {rawData.strategy_votes && relevantStrategy && (
        <div>
          <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {stageName} Analysis
          </h4>
          <div className="bg-slate-900/50 rounded p-3">
            {renderStrategyAnalysis(relevantStrategy, rawData)}
          </div>
        </div>
      )}

      {/* Pipeline Decision */}
      <div>
        <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
          <Info className="w-4 h-4" />
          Pipeline Decision
        </h4>
        <div className="bg-slate-900/50 rounded p-3 text-sm text-slate-300">
          {generatePipelineDecision()}
        </div>
        {reason && (
          <div className="mt-2 text-xs text-slate-500">
            Stage reason: {reason}
          </div>
        )}
      </div>

      {/* Key Modifiers */}
      <div>
        <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Applied Modifiers
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-slate-900/50 rounded p-2">
            <div className="text-xs text-slate-500">Bear Suppressed</div>
            <div className={`text-sm font-medium ${rawData.bear_suppressed ? 'text-red-400' : 'text-slate-400'}`}>
              {rawData.bear_suppressed ? 'Yes' : 'No'}
            </div>
          </div>
          <div className="bg-slate-900/50 rounded p-2">
            <div className="text-xs text-slate-500">Asset Confidence</div>
            <div className="text-sm font-medium text-slate-300">
              {(rawData.asset_confidence * 100).toFixed(0)}%
            </div>
          </div>
          <div className="bg-slate-900/50 rounded p-2">
            <div className="text-xs text-slate-500">Cluster Limited</div>
            <div className={`text-sm font-medium ${rawData.cluster_limited ? 'text-amber-400' : 'text-slate-400'}`}>
              {rawData.cluster_limited ? 'Yes' : 'No'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to render strategy-specific analysis
function renderStrategyAnalysis(strategy: string, rawData: MRESignal) {
  const voted = rawData.strategy_votes?.[strategy as keyof typeof rawData.strategy_votes];
  
  switch (strategy) {
    case 'fear_greed':
      const hasBlendedData = rawData.global_fg !== undefined && rawData.sector_fg !== undefined;
      const effectiveFg = rawData.effective_fg ?? rawData.current_fg;
      
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {voted ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-sm font-medium ${voted ? 'text-emerald-400' : 'text-red-400'}`}>
              {voted ? 'BUY Vote' : 'No BUY Vote'}
            </span>
          </div>
          
          {hasBlendedData ? (
            <>
              <div className="text-sm text-slate-300">
                Effective F&G: <span className="font-medium">{effectiveFg?.toFixed(0) ?? '—'}</span> vs threshold{' '}
                <span className="font-medium">{rawData.fear_threshold}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-800/50 rounded p-2">
                  <div className="text-slate-400">Global F&G</div>
                  <div className="font-medium text-slate-200">{rawData.global_fg?.toFixed(0) ?? '—'}</div>
                </div>
                <div className="bg-slate-800/50 rounded p-2">
                  <div className="text-slate-400">Sector F&G</div>
                  <div className="font-medium text-slate-200">{rawData.sector_fg?.toFixed(0) ?? '—'}</div>
                </div>
              </div>
              {rawData.fg_divergence !== undefined && (
                <div className="text-xs text-slate-400">
                  Divergence: <span className={`font-medium ${Math.abs(rawData.fg_divergence) > 10 ? 'text-amber-400' : 'text-slate-300'}`}>
                    {rawData.fg_divergence > 0 ? '+' : ''}{rawData.fg_divergence.toFixed(1)}
                  </span> points from global
                </div>
              )}
              {rawData.fg_blend_weights && (
                <div className="text-xs text-slate-400">
                  Blend: {(rawData.fg_blend_weights.global_weight * 100).toFixed(0)}% global, {(rawData.fg_blend_weights.sector_weight * 100).toFixed(0)}% sector
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-slate-300">
              Fear & Greed Index: <span className="font-medium">{rawData.current_fg?.toFixed(0) ?? '—'}</span> vs threshold{' '}
              <span className="font-medium">{rawData.fear_threshold}</span>
            </div>
          )}
          
          <div className="text-xs text-slate-400">
            {voted 
              ? hasBlendedData 
                ? 'Sector-blended fear below threshold - contrarian opportunity detected'
                : 'Market fear below threshold - contrarian buying opportunity detected'
              : 'Market not fearful enough for contrarian entry'
            }
          </div>
        </div>
      );
    
    case 'regime_confirmation':
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {voted ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-sm font-medium ${voted ? 'text-emerald-400' : 'text-red-400'}`}>
              {voted ? 'BUY Vote' : 'No BUY Vote'}
            </span>
          </div>
          <div className="text-sm text-slate-300">
            Current regime: <span className="font-medium capitalize">{rawData.regime}</span>
          </div>
          <div className="text-xs text-slate-400">
            {voted 
              ? 'Bull regime confirmed - trades align with trend direction'
              : 'Bear/sideways regime - BUY signals not confirmed'
            }
          </div>
        </div>
      );
    
    case 'rsi_oversold':
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {voted ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-sm font-medium ${voted ? 'text-emerald-400' : 'text-red-400'}`}>
              {voted ? 'BUY Vote' : 'No BUY Vote'}
            </span>
          </div>
          <div className="text-sm text-slate-300">
            RSI (14): <span className="font-medium">{rawData.rsi_14?.toFixed(1) || 'N/A'}</span>
          </div>
          <div className="text-xs text-slate-400">
            {voted 
              ? 'RSI below 30 - asset oversold and likely to bounce'
              : 'RSI above 30 - asset not oversold enough'
            }
          </div>
        </div>
      );
    
    case 'mean_reversion':
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {voted ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-sm font-medium ${voted ? 'text-emerald-400' : 'text-red-400'}`}>
              {voted ? 'BUY Vote' : 'No BUY Vote'}
            </span>
          </div>
          <div className="text-sm text-slate-300">
            5-day return: <span className="font-medium">{rawData.return_5d?.toFixed(1) || 'N/A'}%</span>
          </div>
          <div className="text-xs text-slate-400">
            {voted 
              ? 'Significant price drop detected - betting on reversion to mean'
              : 'Price drop insufficient for mean reversion signal'
            }
          </div>
        </div>
      );
    
    case 'momentum':
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {voted ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <XCircle className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-sm font-medium ${voted ? 'text-emerald-400' : 'text-red-400'}`}>
              {voted ? 'BUY Vote' : 'No BUY Vote'}
            </span>
          </div>
          <div className="text-sm text-slate-300">
            20-day momentum: <span className="font-medium">{rawData.momentum_20d?.toFixed(1) || 'N/A'}%</span>
          </div>
          <div className="text-xs text-slate-400">
            {voted 
              ? 'Strong positive momentum - riding the trend'
              : 'Momentum insufficient or negative'
            }
          </div>
        </div>
      );
    
    default:
      return <div className="text-sm text-slate-400">Strategy analysis not available</div>;
  }
}

// Technical Tab Component
function TechnicalTab({ rawData }: { rawData: MRESignal }) {
  const getRsiColor = (rsi?: number) => {
    if (!rsi) return 'text-slate-400';
    if (rsi < 30) return 'text-emerald-400';
    if (rsi > 70) return 'text-red-400';
    return 'text-amber-400';
  };

  const getRsiGauge = (rsi?: number) => {
    if (!rsi) return 50;
    return Math.min(100, Math.max(0, rsi));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4">
        {/* RSI */}
        {rawData.rsi_14 && (
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-300">RSI (14)</span>
              <span className={`text-lg font-bold ${getRsiColor(rawData.rsi_14)}`}>
                {rawData.rsi_14.toFixed(1)}
              </span>
            </div>
            <div className="w-full bg-slate-700/50 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  rawData.rsi_14 < 30 ? 'bg-emerald-400' : 
                  rawData.rsi_14 > 70 ? 'bg-red-400' : 'bg-amber-400'
                }`}
                style={{ width: `${getRsiGauge(rawData.rsi_14)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>0</span>
              <span>30</span>
              <span>70</span>
              <span>100</span>
            </div>
          </div>
        )}

        {/* Bollinger Bands */}
        {rawData.bb_position && (
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-300">Bollinger Bands</span>
              <span className={`text-sm font-medium ${
                rawData.bb_position === 'below_lower' ? 'text-emerald-400' :
                rawData.bb_position === 'above_upper' ? 'text-red-400' : 'text-amber-400'
              }`}>
                {rawData.bb_position.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>
        )}

        {/* 5-Day Return */}
        {rawData.return_5d !== undefined && (
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-300">5-Day Return</span>
              <span className={`text-lg font-bold ${rawData.return_5d >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {rawData.return_5d >= 0 ? '+' : ''}{rawData.return_5d.toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        {/* 20-Day Momentum */}
        {rawData.momentum_20d !== undefined && (
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-300">20-Day Momentum</span>
              <div className="flex items-center gap-2">
                {rawData.momentum_20d > 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
                <span className={`text-lg font-bold ${rawData.momentum_20d >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {rawData.momentum_20d >= 0 ? '+' : ''}{rawData.momentum_20d.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Volatility */}
        {rawData.volatility_20d !== undefined && (
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-300">20-Day Volatility</span>
              <span className={`text-lg font-bold ${
                rawData.volatility_20d < 20 ? 'text-emerald-400' :
                rawData.volatility_20d > 40 ? 'text-red-400' : 'text-amber-400'
              }`}>
                {rawData.volatility_20d.toFixed(1)}%
              </span>
            </div>
            <div className="text-xs text-slate-500">
              {rawData.volatility_20d < 20 ? 'Low Risk' :
               rawData.volatility_20d > 40 ? 'High Risk' : 'Moderate Risk'}
            </div>
          </div>
        )}

        {/* Signal Strength */}
        <div className="bg-slate-900/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">Signal Strength</span>
            <span className="text-lg font-bold text-primary-400">
              {rawData.signal_strength.toFixed(1)}
            </span>
          </div>
          <div className="text-xs text-slate-500">
            Source: {rawData.signal_source}
          </div>
        </div>
      </div>
    </div>
  );
}

// Regime Tab Component
function RegimeTab({ rawData }: { rawData: MRESignal }) {
  const regime = rawData.regime_details;
  if (!regime) return <div>No regime data available</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Regime */}
        <div className="bg-slate-900/50 rounded-lg p-4">
          <h5 className="text-sm font-medium text-slate-300 mb-2">Current Regime</h5>
          <div className="text-lg font-bold text-accent-400 capitalize">
            {rawData.regime} - {regime.regime_stage}
          </div>
          <div className="text-sm text-slate-400 mt-1">
            {regime.regime_days} days • {regime.confidence.toFixed(0)}% confidence
          </div>
        </div>

        {/* EMA Stack */}
        <div className="bg-slate-900/50 rounded-lg p-4">
          <h5 className="text-sm font-medium text-slate-300 mb-2">EMA Stack</h5>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>EMA 20:</span>
              <span className={regime.above_ema_20 ? 'text-emerald-400' : 'text-red-400'}>
                {regime.ema_20.toFixed(2)} {regime.above_ema_20 ? '✓' : '✗'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>EMA 50:</span>
              <span className={regime.above_ema_50 ? 'text-emerald-400' : 'text-red-400'}>
                {regime.ema_50.toFixed(2)} {regime.above_ema_50 ? '✓' : '✗'}
              </span>
            </div>
            {regime.ema_100 !== undefined && (
            <div className="flex justify-between text-sm">
              <span>EMA 100:</span>
              <span className={regime.above_ema_100 ? 'text-emerald-400' : 'text-red-400'}>
                {regime.ema_100.toFixed(2)} {regime.above_ema_100 ? '✓' : '✗'}
              </span>
            </div>
            )}
            {regime.ema_150 !== undefined && (
            <div className="flex justify-between text-sm">
              <span>EMA 150:</span>
              <span className={regime.above_ema_150 ? 'text-emerald-400' : 'text-red-400'}>
                {regime.ema_150.toFixed(2)} {regime.above_ema_150 ? '✓' : '✗'}
              </span>
            </div>
            )}
            <div className="flex justify-between text-sm">
              <span>EMA 200:</span>
              <span className={regime.above_ema_200 ? 'text-emerald-400' : 'text-red-400'}>
                {regime.ema_200.toFixed(2)} {regime.above_ema_200 ? '✓' : '✗'}
              </span>
            </div>
          </div>
        </div>

        {/* EMA Spread */}
        <div className="bg-slate-900/50 rounded-lg p-4">
          <h5 className="text-sm font-medium text-slate-300 mb-2">EMA Spread</h5>
          <div className="text-lg font-bold text-slate-200">
            {regime.ema_spread_pct.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500">
            Separation between EMAs
          </div>
        </div>

        {/* Momentum */}
        <div className="bg-slate-900/50 rounded-lg p-4">
          <h5 className="text-sm font-medium text-slate-300 mb-2">Regime Momentum</h5>
          <div className={`text-lg font-bold ${regime.momentum_20d >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {regime.momentum_20d >= 0 ? '+' : ''}{regime.momentum_20d.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Visual EMA Alignment */}
      <div className="bg-slate-900/50 rounded-lg p-4">
        <h5 className="text-sm font-medium text-slate-300 mb-3">EMA Alignment Indicator</h5>
        <div className="space-y-2">
          {[
            { name: 'Current Price', value: rawData.price, above: true },
            { name: 'EMA 20', value: regime.ema_20, above: regime.above_ema_20 },
            { name: 'EMA 50', value: regime.ema_50, above: regime.above_ema_50 },
            ...(regime.ema_100 !== undefined ? [{ name: 'EMA 100', value: regime.ema_100, above: regime.above_ema_100 }] : []),
            ...(regime.ema_150 !== undefined ? [{ name: 'EMA 150', value: regime.ema_150, above: regime.above_ema_150 }] : []),
            { name: 'EMA 200', value: regime.ema_200, above: regime.above_ema_200 },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                idx === 0 ? 'bg-white' : item.above ? 'bg-emerald-400' : 'bg-red-400'
              }`} />
              <span className="text-sm text-slate-300 w-24">{item.name}:</span>
              <span className="text-sm text-slate-200">{item.value?.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Fibonacci Tab Component - FIXED to handle actual JSON data types
function FibonacciTab({ rawData }: { rawData: MRESignal }) {
  const fib = rawData.fibonacci;
  if (!fib) return <div>No Fibonacci data available</div>;

  const currentPrice = fib.current_price;
  const swingRange = fib.swing_high - fib.swing_low;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Position */}
        <div className="bg-slate-900/50 rounded-lg p-4">
          <h5 className="text-sm font-medium text-slate-300 mb-2">Current Position</h5>
          <div className="text-lg font-bold text-slate-200">
            ${currentPrice.toFixed(2)}
          </div>
          <div className="text-sm text-slate-400">
            Trend: {fib.trend}
          </div>
        </div>

        {/* Swing Range */}
        <div className="bg-slate-900/50 rounded-lg p-4">
          <h5 className="text-sm font-medium text-slate-300 mb-2">Swing Range</h5>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>High:</span>
              <span className="text-emerald-400">${fib.swing_high.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Low:</span>
              <span className="text-red-400">${fib.swing_low.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Support/Resistance */}
        {(fib.nearest_support || fib.nearest_resistance) && (
          <>
            {fib.nearest_support && (
              <div className="bg-slate-900/50 rounded-lg p-4">
                <h5 className="text-sm font-medium text-slate-300 mb-2">Nearest Support</h5>
                <div className="text-lg font-bold text-emerald-400">
                  ${fib.nearest_support.toFixed(2)}
                </div>
                <div className="text-xs text-slate-500">
                  {((currentPrice - fib.nearest_support) / currentPrice * 100).toFixed(1)}% below
                </div>
              </div>
            )}
            {fib.nearest_resistance && (
              <div className="bg-slate-900/50 rounded-lg p-4">
                <h5 className="text-sm font-medium text-slate-300 mb-2">Nearest Resistance</h5>
                <div className="text-lg font-bold text-red-400">
                  ${fib.nearest_resistance.toFixed(2)}
                </div>
                <div className="text-xs text-slate-500">
                  {((fib.nearest_resistance - currentPrice) / currentPrice * 100).toFixed(1)}% above
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Entry Zone - FIXED: now expects string, not object */}
      {fib.entry_zone && (
        <div className="bg-slate-900/50 rounded-lg p-4">
          <h5 className="text-sm font-medium text-slate-300 mb-2">Entry Zone</h5>
          <div className="text-sm text-slate-200">
            {fib.entry_zone}
          </div>
        </div>
      )}

      {/* Retracements - FIXED: now expects Record<string, number> not array */}
      {fib.retracements && (
        <div className="bg-slate-900/50 rounded-lg p-4">
          <h5 className="text-sm font-medium text-slate-300 mb-3">Fibonacci Retracements</h5>
          <div className="space-y-2">
            {Object.entries(fib.retracements)
              .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
              .map(([level, price]) => (
              <div key={level} className="flex justify-between text-sm">
                <span>{parseFloat(level).toFixed(1)}%:</span>
                <span className="text-amber-400">${price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extensions - FIXED: now expects Record<string, number> not array */}
      {fib.extensions && (
        <div className="bg-slate-900/50 rounded-lg p-4">
          <h5 className="text-sm font-medium text-slate-300 mb-3">Fibonacci Extensions</h5>
          <div className="space-y-2">
            {Object.entries(fib.extensions)
              .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
              .map(([level, price]) => (
              <div key={level} className="flex justify-between text-sm">
                <span>{parseFloat(level).toFixed(1)}%:</span>
                <span className="text-emerald-400">${price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visual Level Diagram */}
      <div className="bg-slate-900/50 rounded-lg p-4">
        <h5 className="text-sm font-medium text-slate-300 mb-3">Price Levels</h5>
        <div className="relative h-32 bg-slate-800/50 rounded">
          {/* Current price indicator */}
          <div 
            className="absolute w-full border-t-2 border-white"
            style={{
              bottom: `${((currentPrice - fib.swing_low) / swingRange) * 100}%`
            }}
          >
            <div className="absolute right-2 -top-3 bg-white text-black px-1 rounded text-xs">
              ${currentPrice.toFixed(2)}
            </div>
          </div>
          
          {/* Swing high */}
          <div className="absolute w-full border-t border-emerald-400 top-0">
            <div className="absolute right-2 -top-3 text-emerald-400 text-xs">
              ${fib.swing_high.toFixed(2)}
            </div>
          </div>
          
          {/* Swing low */}
          <div className="absolute w-full border-t border-red-400 bottom-0">
            <div className="absolute right-2 -bottom-4 text-red-400 text-xs">
              ${fib.swing_low.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Profit Targets - FIXED: now expects number[] not {level, price}[] */}
      {fib.profit_targets && fib.profit_targets.length > 0 && (
        <div className="bg-slate-900/50 rounded-lg p-4">
          <h5 className="text-sm font-medium text-slate-300 mb-3">Profit Targets</h5>
          <div className="space-y-2">
            {fib.profit_targets.slice(0, 3).map((target, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span>Target {idx + 1}:</span>
                <span className="text-emerald-400">${target.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}