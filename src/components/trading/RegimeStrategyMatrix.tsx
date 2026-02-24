"use client";

import { useState, useEffect } from "react";
import { TrendingUp, RefreshCw } from "lucide-react";

interface CalibrationTicker {
  confidence_multiplier: number;
  best_strategy: string;
  regime_preference: Record<string, string>;
  robustness_score: number;
  walk_forward_oos_sharpe: number;
  sector: string;
  asset_class: string;
}

interface CalibrationData {
  generated: string;
  synthesis_runtime_seconds: number;
  tickers_calibrated: number;
  summary: {
    avg_confidence: number;
    median_confidence: number;
    avg_robustness: number;
  };
  calibration: Record<string, CalibrationTicker>;
}

interface MatrixCell {
  regime: string;
  strategy: string;
  count: number;
  percentage: number;
  avgSharpe: number;
  avgRobustness: number;
}

const REGIMES = ['bull', 'bear', 'sideways', 'panic'];
const STRATEGIES = ['fear_greed', 'regime_confirmation', 'rsi_oversold', 'mean_reversion', 'momentum'];

const STRATEGY_DISPLAY_NAMES = {
  fear_greed: 'Fear & Greed',
  regime_confirmation: 'Regime Confirm',
  rsi_oversold: 'RSI Oversold',
  mean_reversion: 'Mean Reversion',
  momentum: 'Momentum'
};

const REGIME_DISPLAY_NAMES = {
  bull: 'Bull Market',
  bear: 'Bear Market',
  sideways: 'Sideways',
  panic: 'Panic/Crisis'
};

export default function RegimeStrategyMatrix() {
  const [data, setData] = useState<CalibrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const ts = Date.now();
      const response = await fetch(`/data/trading/optimization/calibration_20260210.json?${ts}`);
      
      if (!response.ok) {
        throw new Error("Failed to load calibration results");
      }
      
      setData(await response.json());
    } catch (e) {
      setError("Failed to load calibration data");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-purple-400" />
          Regime × Strategy Performance Matrix
        </h3>
        <div className="text-center py-8 text-red-400">
          {error || "Failed to load data"}
        </div>
      </div>
    );
  }

  // Build matrix data
  const matrixData: Record<string, Record<string, MatrixCell>> = {};
  const totalTickers = Object.keys(data.calibration).length;

  // Initialize matrix
  REGIMES.forEach(regime => {
    matrixData[regime] = {};
    STRATEGIES.forEach(strategy => {
      matrixData[regime][strategy] = {
        regime,
        strategy,
        count: 0,
        percentage: 0,
        avgSharpe: 0,
        avgRobustness: 0
      };
    });
  });

  // Count preferences and calculate averages
  Object.values(data.calibration).forEach(ticker => {
    // Use available regimes from the data (some might not have 'panic')
    const availableRegimes = Object.keys(ticker.regime_preference);
    
    availableRegimes.forEach(regime => {
      const preferredStrategy = ticker.regime_preference[regime];
      if (preferredStrategy && matrixData[regime] && matrixData[regime][preferredStrategy]) {
        matrixData[regime][preferredStrategy].count++;
      }
    });
  });

  // Calculate percentages and averages
  REGIMES.forEach(regime => {
    const regimeTotal = Object.values(matrixData[regime]).reduce((sum, cell) => sum + cell.count, 0);
    
    STRATEGIES.forEach(strategy => {
      const cell = matrixData[regime][strategy];
      cell.percentage = regimeTotal > 0 ? (cell.count / regimeTotal) * 100 : 0;
      
      // Calculate average Sharpe and robustness for tickers that prefer this strategy in this regime
      const relevantTickers = Object.values(data.calibration).filter(ticker => 
        ticker.regime_preference[regime] === strategy
      );
      
      if (relevantTickers.length > 0) {
        cell.avgSharpe = relevantTickers.reduce((sum, t) => sum + t.walk_forward_oos_sharpe, 0) / relevantTickers.length;
        cell.avgRobustness = relevantTickers.reduce((sum, t) => sum + t.robustness_score, 0) / relevantTickers.length;
      }
    });
  });

  // Color intensity based on percentage (0-100%)
  const getIntensityColor = (percentage: number): string => {
    if (percentage === 0) return "bg-slate-700/20";
    if (percentage < 10) return "bg-red-500/20";
    if (percentage < 25) return "bg-orange-500/30";
    if (percentage < 50) return "bg-yellow-500/40";
    if (percentage < 75) return "bg-emerald-500/50";
    return "bg-emerald-500/70";
  };

  const getTextColor = (percentage: number): string => {
    if (percentage === 0) return "text-slate-500";
    if (percentage < 25) return "text-slate-300";
    return "text-slate-100";
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-purple-400" />
          Regime × Strategy Performance Matrix ({totalTickers} tickers)
        </h3>
        <button
          onClick={fetchData}
          className="p-1 rounded hover:bg-slate-700/50 transition-colors"
        >
          <RefreshCw className="w-3 h-3 text-slate-400" />
        </button>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Header row */}
          <div className="grid grid-cols-6 gap-1 mb-1">
            <div className="h-12"></div> {/* Empty corner */}
            {STRATEGIES.map(strategy => (
              <div key={strategy} className="bg-slate-700/30 rounded p-2 text-center">
                <div className="text-xs text-slate-300 font-semibold">
                  {STRATEGY_DISPLAY_NAMES[strategy as keyof typeof STRATEGY_DISPLAY_NAMES]}
                </div>
              </div>
            ))}
          </div>

          {/* Matrix rows */}
          {REGIMES.map(regime => {
            const hasData = Object.values(matrixData[regime]).some(cell => cell.count > 0);
            if (!hasData) return null; // Skip regimes with no data

            return (
              <div key={regime} className="grid grid-cols-6 gap-1 mb-1">
                {/* Row header */}
                <div className="bg-slate-700/30 rounded p-2 flex items-center justify-center">
                  <div className="text-xs text-slate-300 font-semibold text-center">
                    {REGIME_DISPLAY_NAMES[regime as keyof typeof REGIME_DISPLAY_NAMES]}
                  </div>
                </div>

                {/* Strategy cells */}
                {STRATEGIES.map(strategy => {
                  const cell = matrixData[regime][strategy];
                  return (
                    <div
                      key={strategy}
                      className={`rounded p-2 text-center border border-slate-600/30 ${getIntensityColor(cell.percentage)}`}
                    >
                      <div className={`text-sm font-bold ${getTextColor(cell.percentage)}`}>
                        {cell.count > 0 ? cell.count : '—'}
                      </div>
                      <div className={`text-xs ${getTextColor(cell.percentage)}`}>
                        {cell.percentage > 0 ? `${cell.percentage.toFixed(0)}%` : '—'}
                      </div>
                      {cell.count > 0 && (
                        <div className="text-xs text-slate-400 mt-1">
                          S: {cell.avgSharpe.toFixed(2)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-slate-700/20 rounded"></div>
          <span>No preference</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500/20 rounded"></div>
          <span>&lt; 10%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500/40 rounded"></div>
          <span>25-50%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-emerald-500/70 rounded"></div>
          <span>&gt; 75%</span>
        </div>
        <span className="mx-2">•</span>
        <span>S = Avg Sharpe</span>
      </div>

      <div className="mt-3 text-xs text-slate-500 text-center">
        Generated: {new Date(data.generated).toLocaleString()}
      </div>
    </div>
  );
}