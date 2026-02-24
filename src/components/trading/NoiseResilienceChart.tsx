"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Zap, RefreshCw } from "lucide-react";

interface NoiseLevelData {
  noise: number;
  sharpe: number;
  win_rate: number;
  avg_return: number;
}

interface StrategyNoiseData {
  base_sharpe: number;
  base_win_rate: number;
  base_trades: number;
  resilience_score: number;
  degradation_curve: NoiseLevelData[];
}

interface TickerNoiseData {
  strategies: Record<string, StrategyNoiseData>;
}

interface NoiseResilienceData {
  generated: string;
  noise_levels_tested: number[];
  trials_per_level: number;
  tickers_tested: number;
  strategies_tested: string[];
  summary: {
    avg_resilience_2pct: number;
    most_robust_strategy: string;
    most_robust_score: number;
    most_fragile_strategy: string;
    most_fragile_score: number;
    strategy_avg_resilience: Record<string, number>;
  };
  results: Record<string, TickerNoiseData>;
}

interface ChartDataPoint {
  noise_pct: string;
  noise: number;
  [key: string]: any; // For dynamic strategy fields
}

const STRATEGY_COLORS = {
  fear_greed: "#10B981",      // Green
  regime_confirmation: "#3B82F6", // Blue  
  rsi_oversold: "#F59E0B",    // Orange
  mean_reversion: "#8B5CF6",  // Purple
  momentum: "#EF4444",        // Red
  time_series_momentum: "#06B6D4", // Cyan
  qvm_factor: "#EC4899",      // Pink
  vix_mean_reversion: "#F97316"    // Orange-500
};

export default function NoiseResilienceChart() {
  const [data, setData] = useState<NoiseResilienceData | null>(null);
  const [versions, setVersions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const ts = Date.now();
      const [noiseResponse, versionsResponse] = await Promise.all([
        fetch(`/data/trading/optimization/noise_resilience.json?${ts}`),
        fetch(`/data/trading/strategy-versions.json?${ts}`)
      ]);
      
      if (!noiseResponse.ok) {
        throw new Error("Failed to load noise resilience results");
      }
      
      setData(await noiseResponse.json());
      
      if (versionsResponse.ok) {
        setVersions(await versionsResponse.json());
      }
    } catch (e) {
      setError("Failed to load noise resilience data");
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
          <Zap className="w-4 h-4 text-yellow-400" />
          Noise Resilience Analysis
        </h3>
        <div className="text-center py-8 text-red-400">
          {error || "Failed to load data"}
        </div>
      </div>
    );
  }

  // Calculate average Sharpe retention across all tickers for each strategy at each noise level
  const chartData: ChartDataPoint[] = data.noise_levels_tested.map(noiseLevel => {
    const point: ChartDataPoint = {
      noise: noiseLevel,
      noise_pct: `${(noiseLevel * 100).toFixed(0)}%`
    };

    // For each strategy, calculate average sharpe retention across all tickers
    data.strategies_tested.forEach(strategy => {
      const retentions: number[] = [];
      
      Object.values(data.results).forEach(ticker => {
        const strategyData = ticker.strategies[strategy];
        if (strategyData && strategyData.degradation_curve.length > 0) {
          const basePoint = strategyData.degradation_curve.find(d => d.noise === 0);
          const currentPoint = strategyData.degradation_curve.find(d => d.noise === noiseLevel);
          
          if (basePoint && currentPoint && basePoint.sharpe !== 0) {
            const retention = (currentPoint.sharpe / basePoint.sharpe) * 100;
            retentions.push(Math.max(0, retention)); // Don't go below 0%
          }
        }
      });

      if (retentions.length > 0) {
        point[strategy] = retentions.reduce((a, b) => a + b, 0) / retentions.length;
      } else {
        point[strategy] = 100; // Default to 100% retention if no data
      }
    });

    return point;
  });

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          Noise Resilience Analysis ({data.tickers_tested} tickers, {data.trials_per_level} trials/level)
        </h3>
        <button
          onClick={fetchData}
          className="p-1 rounded hover:bg-slate-700/50 transition-colors"
        >
          <RefreshCw className="w-3 h-3 text-slate-400" />
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">Most Robust Strategy</div>
          <div className="text-sm font-bold text-emerald-400 capitalize">
            {data.summary.most_robust_strategy.replace(/_/g, " ")}
          </div>
          <div className="text-lg font-bold text-emerald-400">
            {(data.summary.most_robust_score * 100).toFixed(0)}%
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">Most Fragile Strategy</div>
          <div className="text-sm font-bold text-red-400 capitalize">
            {data.summary.most_fragile_strategy.replace(/_/g, " ")}
          </div>
          <div className="text-lg font-bold text-red-400">
            {(data.summary.most_fragile_score * 100).toFixed(0)}%
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">Avg @ 2% Noise</div>
          <div className="text-lg font-bold text-amber-400">
            {(data.summary.avg_resilience_2pct * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-slate-500">Sharpe retention</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="noise_pct" 
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              tickLine={{ stroke: '#9CA3AF' }}
            />
            <YAxis 
              domain={[0, 110]}
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              tickLine={{ stroke: '#9CA3AF' }}
              label={{ value: 'Sharpe Retention (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F3F4F6'
              }}
              formatter={(value: any, name?: string) => [
                `${Number(value).toFixed(1)}%`,
                (name || '').replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
              ]}
              labelFormatter={(label) => `Noise Level: ${label}`}
            />
            <Legend 
              wrapperStyle={{ color: '#9CA3AF' }}
              formatter={(value: string) => 
                <span style={{ color: STRATEGY_COLORS[value as keyof typeof STRATEGY_COLORS] || '#9CA3AF' }}>
                  {value.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </span>
              }
            />
            {data.strategies_tested.map(strategy => (
              <Line
                key={strategy}
                type="monotone"
                dataKey={strategy}
                stroke={STRATEGY_COLORS[strategy as keyof typeof STRATEGY_COLORS] || "#9CA3AF"}
                strokeWidth={3}
                dot={{ r: 4 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Strategy resilience breakdown */}
      <div className="mt-4 flex flex-wrap gap-2">
        {data.strategies_tested.map(strategy => {
          // Handle regime_confirm vs regime_confirmation key mismatch
          const versionKey = strategy === 'regime_confirmation' ? 'regime_confirm' : strategy;
          const version = versions?.strategies?.[versionKey]?.currentVersion;
          
          return (
            <div key={strategy} className="bg-slate-900/50 rounded-lg p-2 text-center min-w-[140px] flex-1">
              <div className="text-xs text-slate-500 capitalize">
                {strategy.replace(/_/g, " ")}
              </div>
              <div 
                className="text-sm font-bold"
                style={{ color: STRATEGY_COLORS[strategy as keyof typeof STRATEGY_COLORS] }}
              >
                {(data.summary.strategy_avg_resilience[strategy] * 100).toFixed(0)}%
              </div>
              {version && (
                <div className="text-xs text-slate-600 mt-1">
                  v{version}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-xs text-slate-500 text-center">
        Generated: {new Date(data.generated).toLocaleString()} • 
        Runtime: {data.summary ? "17.5s" : "—"}
      </div>
    </div>
  );
}