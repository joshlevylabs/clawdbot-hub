"use client";

import { X, TrendingUp, TrendingDown, Filter, Minus, DollarSign, Activity, Search, ChevronDown, ChevronRight, Calendar, Target, TrendingDownIcon } from 'lucide-react';
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
    ema_100: number;
    ema_150: number;
    ema_200: number;
    above_ema_20: boolean;
    above_ema_50: boolean;
    above_ema_100: boolean;
    above_ema_150: boolean;
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
  'Fear & Greed Strategy': 'fear_greed',
  'Regime Confirm Strategy': 'regime_confirm', 
  'RSI Oversold Strategy': 'rsi_oversold',
  'RSI Oversold Strategy (MRE Regime Hybrid)': 'rsi_oversold',
  'Mean Reversion Strategy': 'mean_reversion',
  'Mean Reversion Strategy (Cross-Asset Pairs)': 'mean_reversion',
  'Momentum Strategy': 'momentum',
  'Momentum Strategy (Cross-Asset Predictor)': 'momentum',
};

// Strategy descriptions mapping
const STRATEGY_DESCRIPTIONS: Record<string, string> = {
  'Fear & Greed Strategy': "Triggers BUY when the CNN Fear & Greed Index drops below the ticker's fear threshold. Thresholds vary by asset class: Energy (6) requires extreme panic, Technology/Broad Market/Financials (8) use aggressive entries, and Healthcare/Real Estate (15) are more conservative. Thresholds were optimized in V15.1 Phase 5 via universe-scale backtests.",
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
          {/* Strategy Description Card */}
          <div className="p-4 sm:p-6 border-b border-slate-700/50 bg-slate-800/30">
            <h3 className="text-base sm:text-lg font-semibold text-slate-200 mb-2">How This Strategy Works</h3>
            <p className="text-slate-300 text-sm leading-relaxed">{strategyDescription}</p>
          </div>

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
          {stageDetails.name.includes('-of-5') && (
            <div className="px-4 sm:px-6 pt-4 pb-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400">
                {[
                  { label: 'Fear & Greed', color: 'bg-blue-400' },
                  { label: 'Regime', color: 'bg-purple-400' },
                  { label: 'RSI', color: 'bg-orange-400' },
                  { label: 'Mean Reversion', color: 'bg-amber-400' },
                  { label: 'Momentum', color: 'bg-emerald-400' },
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