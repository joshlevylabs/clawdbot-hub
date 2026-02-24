"use client";

import { useState, useEffect } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface PBOScore {
  pbo_score: number;
  is_overfit: boolean;
  strategy: string;
  path_consistency: number;
}

interface PBOData {
  generated: string;
  n_groups: number;
  n_paths: number;
  embargo_days: number;
  summary: {
    avg_pbo: number;
    median_pbo: number;
    overfit_fraction: number;
  };
  scores: Record<string, PBOScore>;
}

interface PlateauScore {
  strategy: string;
  plateau_score: number;
  fragile_params: string[];
  optimal_performance: number;
  total_variations: number;
  sector: string;
  asset_class: string;
}

interface PlateauData {
  generated: string;
  performance_threshold: number;
  runtime_seconds: number;
  tickers_scored: number;
  summary: {
    avg_plateau: number;
    median_plateau: number;
    robust_fraction: number;
    fragile_fraction: number;
  };
  results: Record<string, PlateauScore>;
}

interface CombinedTickerData {
  ticker: string;
  pbo_score: number;
  plateau_score: number;
  is_overfit: boolean;
  has_fragile_params: boolean;
  strategy: string;
  risk_category: 'safe' | 'moderate' | 'dangerous';
  sector: string;
}

export default function PBOPlateauSummary() {
  const [pboData, setPboData] = useState<PBOData | null>(null);
  const [plateauData, setPlateauData] = useState<PlateauData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const ts = Date.now();
      const [pboRes, plateauRes] = await Promise.all([
        fetch(`/data/trading/optimization/pbo_scores.json?${ts}`),
        fetch(`/data/trading/optimization/plateau_scores.json?${ts}`)
      ]);
      
      if (!pboRes.ok || !plateauRes.ok) {
        throw new Error("Failed to load PBO or plateau data");
      }
      
      setPboData(await pboRes.json());
      setPlateauData(await plateauRes.json());
    } catch (e) {
      setError("Failed to load overfitting analysis data");
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

  if (error || !pboData || !plateauData) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          PBO & Plateau Risk Analysis
        </h3>
        <div className="text-center py-8 text-red-400">
          {error || "Failed to load data"}
        </div>
      </div>
    );
  }

  // Combine PBO and plateau data for tickers that appear in both
  const combinedData: CombinedTickerData[] = [];
  
  Object.entries(pboData.scores).forEach(([ticker, pboScore]) => {
    const plateauScore = plateauData.results[ticker];
    if (plateauScore) {
      // Determine risk category based on PBO (high = bad) and plateau (low = bad)
      let riskCategory: 'safe' | 'moderate' | 'dangerous' = 'moderate';
      
      if (pboScore.pbo_score <= 0.3 && plateauScore.plateau_score >= 0.6) {
        riskCategory = 'safe'; // Low overfitting, high plateau
      } else if (pboScore.pbo_score >= 0.7 || plateauScore.plateau_score <= 0.3) {
        riskCategory = 'dangerous'; // High overfitting OR low plateau
      }

      combinedData.push({
        ticker,
        pbo_score: pboScore.pbo_score,
        plateau_score: plateauScore.plateau_score,
        is_overfit: pboScore.is_overfit,
        has_fragile_params: plateauScore.fragile_params.length > 0,
        strategy: pboScore.strategy,
        risk_category: riskCategory,
        sector: plateauScore.sector
      });
    }
  });

  // Count risk categories
  const riskCounts = {
    safe: combinedData.filter(d => d.risk_category === 'safe').length,
    moderate: combinedData.filter(d => d.risk_category === 'moderate').length,
    dangerous: combinedData.filter(d => d.risk_category === 'dangerous').length
  };

  // Color coding for scatter plot
  const getRiskColor = (category: string): string => {
    switch (category) {
      case 'safe': return '#10B981';      // Green
      case 'moderate': return '#F59E0B';  // Orange
      case 'dangerous': return '#EF4444'; // Red
      default: return '#6B7280';          // Gray
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) {
      return null;
    }

    const data = payload[0].payload as CombinedTickerData;
    
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
        <p className="text-slate-200 font-semibold font-mono">{data.ticker}</p>
        <p className="text-slate-300 text-sm capitalize">{data.strategy.replace(/_/g, " ")}</p>
        <p className="text-slate-400 text-xs">{data.sector}</p>
        <div className="mt-2 space-y-1">
          <p className="text-xs">
            <span className="text-slate-400">PBO Score:</span>{" "}
            <span className={data.is_overfit ? 'text-red-400' : 'text-emerald-400'}>
              {(data.pbo_score * 100).toFixed(0)}%
            </span>
          </p>
          <p className="text-xs">
            <span className="text-slate-400">Plateau Score:</span>{" "}
            <span className={data.plateau_score >= 0.6 ? 'text-emerald-400' : 'text-red-400'}>
              {(data.plateau_score * 100).toFixed(0)}%
            </span>
          </p>
          <p className="text-xs">
            <span className="text-slate-400">Risk:</span>{" "}
            <span style={{ color: getRiskColor(data.risk_category) }}>
              {data.risk_category.toUpperCase()}
            </span>
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          PBO & Plateau Risk Analysis ({combinedData.length} tickers)
        </h3>
        <button
          onClick={fetchData}
          className="p-1 rounded hover:bg-slate-700/50 transition-colors"
        >
          <RefreshCw className="w-3 h-3 text-slate-400" />
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-5 gap-3 mb-4">
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">Avg PBO</div>
          <div className="text-lg font-bold text-orange-400">
            {(pboData.summary.avg_pbo * 100).toFixed(0)}%
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">Avg Plateau</div>
          <div className="text-lg font-bold text-cyan-400">
            {(plateauData.summary.avg_plateau * 100).toFixed(0)}%
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">Safe</div>
          <div className="text-lg font-bold text-emerald-400">{riskCounts.safe}</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">Moderate</div>
          <div className="text-lg font-bold text-amber-400">{riskCounts.moderate}</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">Dangerous</div>
          <div className="text-lg font-bold text-red-400">{riskCounts.dangerous}</div>
        </div>
      </div>

      {/* Scatter plot */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart 
            data={combinedData} 
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              type="number"
              dataKey="pbo_score" 
              domain={[0, 1]}
              tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              tickLine={{ stroke: '#9CA3AF' }}
              label={{ value: 'PBO Score (Higher = More Overfit)', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              type="number"
              dataKey="plateau_score"
              domain={[0, 1]}
              tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
              stroke="#9CA3AF"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              tickLine={{ stroke: '#9CA3AF' }}
              label={{ value: 'Plateau Score (Higher = More Robust)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Scatter dataKey="plateau_score" fill="#8884d8">
              {combinedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getRiskColor(entry.risk_category)} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Risk zone legend */}
      <div className="mt-4 bg-slate-900/30 rounded-lg p-3">
        <h4 className="text-sm font-semibold text-slate-300 mb-2">Risk Zones</h4>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
            <div>
              <span className="text-emerald-400 font-semibold">Safe:</span>
              <span className="text-slate-400 ml-1">Low PBO (&lt;30%), High plateau (&gt;60%)</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
            <div>
              <span className="text-amber-400 font-semibold">Moderate:</span>
              <span className="text-slate-400 ml-1">Mixed risk profile</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div>
              <span className="text-red-400 font-semibold">Dangerous:</span>
              <span className="text-slate-400 ml-1">High PBO (&gt;70%) OR Low plateau (&lt;30%)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-500 text-center">
        PBO: {new Date(pboData.generated).toLocaleString()} • 
        Plateau: {new Date(plateauData.generated).toLocaleString()}
      </div>
    </div>
  );
}