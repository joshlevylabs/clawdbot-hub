"use client";

import { X, TrendingUp, TrendingDown, Filter, Minus, DollarSign, Activity, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
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

// Strategy descriptions mapping
const STRATEGY_DESCRIPTIONS: Record<string, string> = {
  'Fear & Greed Strategy': "Triggers BUY when the CNN Fear & Greed Index drops below the ticker's fear threshold, indicating extreme market fear as a contrarian buying opportunity.",
  'Regime Confirm Strategy': "Confirms BUY signals only when the ticker is in a bull regime (price above SMA), ensuring trades align with the broader trend direction.",
  'RSI Oversold Strategy': "Triggers BUY when the 14-period RSI drops below 30, indicating the asset is oversold and likely to bounce.",
  'Mean Reversion Strategy': "Triggers BUY when the 5-day price drop exceeds a threshold, betting on a reversion to the mean price.",
  'Momentum Strategy': "Triggers BUY when 20-day momentum is strongly positive, riding the trend with confirmed directional strength.",
  'Vote Consensus Gate': "Classifies tickers by how many of the 5 strategies voted BUY, showing consensus strength from 1-of-5 (weak consensus) to 5-of-5 (unanimous agreement).",
  '1-of-5 Vote Consensus': "Tickers where exactly 1 of the 5 strategies voted BUY. Low consensus signals with higher risk but potentially overlooked opportunities.",
  '2-of-5 Vote Consensus': "Tickers where exactly 2 of the 5 strategies voted BUY. Moderate consensus signals with balanced risk-reward profile.",
  '3-of-5 Vote Consensus': "Tickers where exactly 3 of the 5 strategies voted BUY. Strong consensus signals with higher confidence and lower risk.",
  '4-of-5 Vote Consensus': "Tickers where exactly 4 of the 5 strategies voted BUY. Very strong consensus signals with high confidence.",
  '5-of-5 Vote Consensus': "Tickers where all 5 strategies unanimously voted BUY. Maximum consensus signals with highest confidence and lowest risk.",
  'Signal Gating': "Suppresses BUY signals in bear regimes (bear suppress) and converts SELL signals to HOLD (sell suppress) to reduce risk.",
  'Confidence Tuning': "Adjusts signal confidence using regime weight, asset role evaluation, sector rotation, sideways penalty, and Kalshi prediction market data.",
  'Final Filters': "Applies cluster limits (max 2 per sector), asset confidence thresholds, crash mode protection, and multiplier caps.",
};

// Helper function to check if this is an individual strategy stage
const isIndividualStrategy = (stageName: string): boolean => {
  return stageName.includes('Fear & Greed Strategy') ||
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
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="text-xs text-slate-500">Current RSI (14)</div>
          <div className="text-lg font-bold text-slate-200">{data.rsi_14?.toFixed(1) || 'N/A'}</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="text-xs text-slate-500">Oversold Threshold</div>
          <div className="text-lg font-bold text-slate-200">30</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          <div className="text-xs text-slate-500">Status</div>
          <div className={`text-sm font-medium ${(data.rsi_14 || 100) < 30 ? 'text-emerald-400' : 'text-red-400'}`}>
            {(data.rsi_14 || 100) < 30 ? 'Oversold' : 'Not Oversold'}
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

export default function PipelineDetailPanel({
  stageDetails,
  onClose
}: PipelineDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'output' | 'filtered'>('output');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Get strategy description
  const strategyDescription = STRATEGY_DESCRIPTIONS[stageDetails.name] || stageDetails.description;

  // Filter tickers based on search query
  const filterTickers = (tickers: TickerDetail[]) => {
    if (!searchQuery) return tickers;
    return tickers.filter(ticker => 
      ticker.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredOutput = filterTickers(stageDetails.passedTickers);
  const filteredFiltered = filterTickers(stageDetails.filteredTickers);

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
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-slate-100 truncate">{stageDetails.name}</h2>
                <p className="text-sm text-slate-400 mt-1 line-clamp-2">{stageDetails.description}</p>
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
          {/* Strategy Description Card */}
          <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-slate-800/30">
            <h3 className="text-base sm:text-lg font-semibold text-slate-200 mb-2">How This Strategy Works</h3>
            <p className="text-slate-300 text-sm leading-relaxed">{strategyDescription}</p>
          </div>

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
          
          {/* Content */}
            <div className="p-4 sm:p-6">
              {activeTab === 'output' && (
                <div className="space-y-3">
                  {filteredOutput.length > 0 ? (
                    filteredOutput
                      .sort((a, b) => (b.signalStrength || 0) - (a.signalStrength || 0))
                      .map((ticker, idx) => (
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
                      ))
                  ) : (
                    <div className="text-center text-slate-400 py-8">
                      {searchQuery 
                        ? `No tickers found matching "${searchQuery}"` 
                        : stageDetails.name.includes('Vote Consensus') && stageDetails.name.includes('-of-5')
                          ? "No tickers currently reach this consensus level"
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
          </div>
        </div>
      </div>
    </>
  );
}