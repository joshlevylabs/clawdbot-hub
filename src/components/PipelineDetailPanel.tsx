"use client";

import { X, TrendingUp, TrendingDown, Filter, Minus, DollarSign, Activity } from 'lucide-react';
import { useEffect } from 'react';
import TickerTechnicalBreakdown from './TickerTechnicalBreakdown';

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
  };
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
    ema_200: number;
    above_ema_20: boolean;
    above_ema_50: boolean;
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
    trend: string;
    retracements?: { level: number; price: number }[];
    extensions?: { level: number; price: number }[];
    nearest_support?: number;
    nearest_resistance?: number;
    entry_zone?: { min: number; max: number };
    profit_targets?: { level: number; price: number }[];
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
}

interface PipelineDetailPanelProps {
  stageDetails: StageDetails | null;
  onClose: () => void;
}

export default function PipelineDetailPanel({
  stageDetails,
  onClose
}: PipelineDetailPanelProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!stageDetails) return null;

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

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-slate-900 border-l border-slate-700/50 z-50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            {getStageIcon()}
            <div>
              <h2 className="text-xl font-bold text-slate-100">{stageDetails.name}</h2>
              <p className="text-sm text-slate-400 mt-1">{stageDetails.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        {/* Summary Stats */}
        <div className="p-6 border-b border-slate-700/50">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-200">{stageDetails.inputCount.toLocaleString()}</div>
              <div className="text-sm text-slate-400">Input</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">{stageDetails.outputCount.toLocaleString()}</div>
              <div className="text-sm text-slate-400">Output</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{filteredCount.toLocaleString()}</div>
              <div className="text-sm text-slate-400">Filtered</div>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Filtered Tickers (for filter stages) */}
            {stageDetails.stageType === 'filter' && filteredCount > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-400" />
                  Filtered Out ({filteredCount})
                </h3>
                <div className="space-y-3">
                  {stageDetails.filteredTickers.map((ticker, idx) => (
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
                  ))}
                </div>
              </div>
            )}
            
            {/* Modifier Adjustments (for modifier stages) */}
            {stageDetails.stageType === 'modifier' && passedCount > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-400" />
                  Adjustments Applied ({passedCount})
                </h3>
                <div className="space-y-3">
                  {stageDetails.passedTickers.map((ticker, idx) => (
                    <TickerTechnicalBreakdown
                      key={idx}
                      symbol={ticker.symbol}
                      signal={ticker.signal}
                      signalStrength={ticker.signalStrength}
                      currentPrice={ticker.currentPrice}
                      rawData={ticker.rawData}
                      reason={ticker.adjustmentValue !== undefined ? 
                        `Adjustment: ${ticker.adjustmentValue >= 0 ? '+' : ''}${(ticker.adjustmentValue * 100).toFixed(1)}%` : 
                        undefined}
                      stageType={stageDetails.stageType}
                      stageName={stageDetails.name}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Final Output (for output stage) */}
            {stageDetails.stageType === 'output' && passedCount > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Final BUY Signals ({passedCount})
                </h3>
                <div className="space-y-3">
                  {stageDetails.passedTickers
                    .sort((a, b) => (b.signalStrength || 0) - (a.signalStrength || 0))
                    .map((ticker, idx) => (
                    <TickerTechnicalBreakdown
                      key={idx}
                      symbol={ticker.symbol}
                      signal={ticker.signal}
                      signalStrength={ticker.signalStrength}
                      currentPrice={ticker.currentPrice}
                      rawData={ticker.rawData}
                      stageType={stageDetails.stageType}
                      stageName={stageDetails.name}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Asset Class Breakdown (for input stage) */}
            {stageDetails.stageType === 'input' && (
              <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  Universe Breakdown ({stageDetails.passedTickers.length})
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {stageDetails.passedTickers.slice(0, 100).map((ticker, idx) => (
                    <TickerTechnicalBreakdown
                      key={idx}
                      symbol={ticker.symbol}
                      signal={ticker.signal}
                      signalStrength={ticker.signalStrength}
                      currentPrice={ticker.currentPrice}
                      rawData={ticker.rawData}
                      stageType={stageDetails.stageType}
                      stageName={stageDetails.name}
                    />
                  ))}
                  {stageDetails.passedTickers.length > 100 && (
                    <div className="text-center text-slate-400 text-sm py-4">
                      ... and {stageDetails.passedTickers.length - 100} more tickers
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}