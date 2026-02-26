"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Users, RefreshCw } from "lucide-react";

interface EnsembleResult {
  ensemble_signal: string;
  agreement_score: number;
  strategies_agreeing: number;
  strategies_total: number;
  is_unanimous: boolean;
  confidence: number;
  asset_class: string;
  regime: string;
}

interface EnsembleData {
  generated: string;
  min_agreement_threshold: number;
  summary: {
    total_tickers: number;
    unanimous_buy: number;
    majority_buy: number;
    no_consensus: number;
    total_buy: number;
    avg_agreement_score: number;
  };
  results: Record<string, EnsembleResult>;
}

interface AgreementBin {
  strategies_agreeing: string;
  count: number;
  percentage: number;
  label: string;
}

export default function EnsembleAgreementChart() {
  const [data, setData] = useState<EnsembleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const ts = Date.now();
      const response = await fetch(`/data/trading/optimization/ensemble_results.json?${ts}`);
      
      if (!response.ok) {
        throw new Error("Failed to load ensemble results");
      }
      
      setData(await response.json());
    } catch (e) {
      setError("Failed to load ensemble data");
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
          <Users className="w-4 h-4 text-blue-400" />
          Ensemble Agreement Distribution
        </h3>
        <div className="text-center py-8 text-red-400">
          {error || "Failed to load data"}
        </div>
      </div>
    );
  }

  // Get the maximum number of strategies from the data
  const maxStrategies = Math.max(...Object.values(data.results).map(result => result.strategies_total));
  
  // Create histogram data for strategies agreeing (0 to maxStrategies)
  const agreementCounts: Record<number, number> = {};
  for (let i = 0; i <= maxStrategies; i++) {
    agreementCounts[i] = 0;
  }
  
  Object.values(data.results).forEach(result => {
    const agreeing = Math.min(maxStrategies, Math.max(0, result.strategies_agreeing));
    agreementCounts[agreeing]++;
  });

  const histogramData: AgreementBin[] = Object.entries(agreementCounts).map(([strategies, count]) => ({
    strategies_agreeing: strategies,
    count: count,
    percentage: (count / data.summary.total_tickers) * 100,
    label: strategies === maxStrategies.toString() ? `${strategies} (Unanimous)` : `${strategies} strategies`,
  }));

  const threshold = data.min_agreement_threshold;
  const thresholdLine = Math.round(threshold * maxStrategies); // Scale threshold to strategy count

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-400" />
          Ensemble Agreement Distribution ({data.summary.total_tickers} tickers)
        </h3>
        <button
          onClick={fetchData}
          className="p-1 rounded hover:bg-slate-700/50 transition-colors"
        >
          <RefreshCw className="w-3 h-3 text-slate-400" />
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">Unanimous BUY</div>
          <div className="text-lg font-bold text-emerald-400">{data.summary.unanimous_buy}</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">Majority BUY</div>
          <div className="text-lg font-bold text-amber-400">{data.summary.majority_buy}</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">No Consensus</div>
          <div className="text-lg font-bold text-slate-400">{data.summary.no_consensus}</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">Avg Agreement</div>
          <div className="text-lg font-bold text-cyan-400">
            {(data.summary.avg_agreement_score * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={histogramData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1A1A24" />
            <XAxis 
              dataKey="strategies_agreeing" 
              stroke="#8B8B80"
              tick={{ fill: '#8B8B80', fontSize: 12 }}
              tickLine={{ stroke: '#8B8B80' }}
            />
            <YAxis 
              stroke="#8B8B80"
              tick={{ fill: '#8B8B80', fontSize: 12 }}
              tickLine={{ stroke: '#8B8B80' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F5F5F0'
              }}
              formatter={(value: any, name?: string) => [
                name === 'count' ? `${value} tickers` : `${value.toFixed(1)}%`,
                name === 'count' ? 'Count' : 'Percentage'
              ]}
              labelFormatter={(label) => `${label} strategies agreeing`}
            />
            <Bar dataKey="count" fill="#D4A020" opacity={0.85} />
            {/* Threshold line for minimum BUY agreement */}
            <ReferenceLine 
              x={thresholdLine.toString()} 
              stroke="#D4A020" 
              strokeDasharray="6 4"
              strokeWidth={2}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-3 text-xs text-slate-400 text-center">
        <span className="inline-flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-600 rounded" style={{ backgroundColor: "#D4A020" }}></div>
          Ticker distribution
        </span>
        <span className="mx-4">•</span>
        <span className="inline-flex items-center gap-1">
          <div className="w-3 h-1 bg-yellow-600 rounded" style={{ backgroundColor: "#D4A020" }}></div>
          BUY threshold ({(threshold * 100).toFixed(0)}% agreement)
        </span>
      </div>

      <div className="mt-2 text-xs text-slate-500 text-center">
        Generated: {new Date(data.generated).toLocaleString()}
      </div>
    </div>
  );
}