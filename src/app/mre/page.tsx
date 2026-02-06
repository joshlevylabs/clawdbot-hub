"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Activity,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Gauge,
  GitCompare,
  Zap,
} from "lucide-react";

interface FearGreedData {
  current: number;
  rating: string;
  is_fear: boolean;
  is_extreme_fear: boolean;
  is_greed: boolean;
  is_extreme_greed: boolean;
  source: string;
  history: { date: string; score: number; vix: number }[];
}

interface RegimeData {
  regime: string;
  price?: number;
  ema_20?: number;
  ema_50?: number;
  ema_200?: number;
}

interface AssetSignal {
  asset_class: string;
  symbol: string;
  signal: string;
  signal_strength: number;
  fear_threshold: number;
  current_fg: number;
  regime: string;
  regime_weight: number;
  hold_days: number;
  expected_sharpe: number;
  expected_accuracy: number;
  price: number;
}

interface PairData {
  symbol1: string;
  symbol2: string;
  reverter: string;
  probability: number;
  z_score: number;
  is_diverged: boolean;
  divergence_direction: string;
  current_spread: number;
  mean_spread: number;
}

interface MRESignals {
  timestamp: string;
  last_updated: string;
  fear_greed: FearGreedData;
  regime: {
    spy: RegimeData;
    qqq: RegimeData;
    global: string;
  };
  signals: {
    summary: {
      total_buy: number;
      total_hold: number;
      total_watch: number;
    };
    by_asset_class: AssetSignal[];
  };
  pairs: {
    diverged_count: number;
    pairs: PairData[];
  };
  thresholds: {
    fear_buy: number;
    greed_sell: number;
    optimal_hold: number;
  };
  meta?: {
    version: string;
    backtests: number;
    key_insight: string;
  };
}

// Fear & Greed Gauge Component
function FearGreedGauge({ value, rating }: { value: number; rating: string }) {
  const getColor = (val: number) => {
    if (val <= 25) return "#ef4444"; // red - extreme fear
    if (val <= 45) return "#f97316"; // orange - fear
    if (val <= 55) return "#eab308"; // yellow - neutral
    if (val <= 75) return "#84cc16"; // lime - greed
    return "#22c55e"; // green - extreme greed
  };

  const rotation = (value / 100) * 180 - 90;

  return (
    <div className="relative w-64 h-32 mx-auto">
      {/* Gauge background */}
      <svg viewBox="0 0 200 100" className="w-full h-full">
        {/* Gauge arc segments */}
        <path
          d="M 10 100 A 90 90 0 0 1 50 19"
          fill="none"
          stroke="#ef4444"
          strokeWidth="20"
          strokeLinecap="round"
        />
        <path
          d="M 50 19 A 90 90 0 0 1 100 10"
          fill="none"
          stroke="#f97316"
          strokeWidth="20"
        />
        <path
          d="M 100 10 A 90 90 0 0 1 150 19"
          fill="none"
          stroke="#eab308"
          strokeWidth="20"
        />
        <path
          d="M 150 19 A 90 90 0 0 1 190 100"
          fill="none"
          stroke="#22c55e"
          strokeWidth="20"
          strokeLinecap="round"
        />
        
        {/* Needle */}
        <line
          x1="100"
          y1="100"
          x2="100"
          y2="25"
          stroke={getColor(value)}
          strokeWidth="4"
          strokeLinecap="round"
          transform={`rotate(${rotation}, 100, 100)`}
        />
        <circle cx="100" cy="100" r="8" fill={getColor(value)} />
      </svg>
      
      {/* Value display */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-center">
        <div className="text-4xl font-bold" style={{ color: getColor(value) }}>
          {value}
        </div>
        <div className="text-sm text-gray-400">{rating}</div>
      </div>
      
      {/* Labels */}
      <div className="absolute top-0 left-0 text-xs text-red-500">Fear</div>
      <div className="absolute top-0 right-0 text-xs text-green-500">Greed</div>
    </div>
  );
}

// Regime Badge Component
function RegimeBadge({ regime }: { regime: string }) {
  const config = {
    bull: { color: "bg-green-500/20 text-green-400 border-green-500/50", icon: TrendingUp },
    bear: { color: "bg-red-500/20 text-red-400 border-red-500/50", icon: TrendingDown },
    sideways: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50", icon: Minus },
    unknown: { color: "bg-gray-500/20 text-gray-400 border-gray-500/50", icon: Activity },
  };

  const { color, icon: Icon } = config[regime as keyof typeof config] || config.unknown;

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border ${color}`}>
      <Icon className="w-4 h-4" />
      {regime.toUpperCase()}
    </span>
  );
}

// Signal Card Component
function SignalCard({ signal }: { signal: AssetSignal }) {
  const signalConfig = {
    BUY: { color: "border-green-500 bg-green-500/10", icon: CheckCircle, iconColor: "text-green-500" },
    HOLD: { color: "border-gray-500 bg-gray-500/10", icon: Clock, iconColor: "text-gray-400" },
    WATCH: { color: "border-yellow-500 bg-yellow-500/10", icon: AlertTriangle, iconColor: "text-yellow-500" },
  };

  const config = signalConfig[signal.signal as keyof typeof signalConfig] || signalConfig.HOLD;
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-lg border ${config.color}`}>
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="text-lg font-semibold">{signal.symbol}</div>
          <div className="text-xs text-gray-400 capitalize">{signal.asset_class.replace("_", " ")}</div>
        </div>
        <Icon className={`w-6 h-6 ${config.iconColor}`} />
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-gray-400">Price</div>
          <div className="font-mono">${signal.price.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-gray-400">Regime</div>
          <RegimeBadge regime={signal.regime} />
        </div>
        <div>
          <div className="text-gray-400">Sharpe</div>
          <div className="font-mono">{signal.expected_sharpe.toFixed(1)}</div>
        </div>
        <div>
          <div className="text-gray-400">Accuracy</div>
          <div className="font-mono">{signal.expected_accuracy}%</div>
        </div>
      </div>
      
      {signal.signal === "BUY" && (
        <div className="mt-3 p-2 bg-green-500/20 rounded text-sm">
          <span className="text-green-400">🎯 Buy Signal</span>
          <span className="text-gray-400 ml-2">Hold {signal.hold_days} days</span>
        </div>
      )}
    </div>
  );
}

// Pair Divergence Card
function PairCard({ pair }: { pair: PairData }) {
  return (
    <div className={`p-4 rounded-lg border ${pair.is_diverged ? 'border-yellow-500 bg-yellow-500/10' : 'border-gray-700 bg-gray-800/50'}`}>
      <div className="flex justify-between items-center mb-2">
        <div className="font-semibold">{pair.symbol1}/{pair.symbol2}</div>
        {pair.is_diverged && <Zap className="w-5 h-5 text-yellow-500" />}
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <div className="text-gray-400">Z-Score</div>
          <div className={`font-mono ${Math.abs(pair.z_score) > 2 ? 'text-yellow-400' : ''}`}>
            {pair.z_score.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-gray-400">Reverter</div>
          <div className="font-mono">{pair.reverter}</div>
        </div>
        <div>
          <div className="text-gray-400">Prob</div>
          <div className="font-mono">{(pair.probability * 100).toFixed(0)}%</div>
        </div>
      </div>
      
      {pair.is_diverged && (
        <div className="mt-2 p-2 bg-yellow-500/20 rounded text-sm">
          <span className="text-yellow-400">🔄 Diverged!</span>
          <span className="text-gray-400 ml-2">Buy {pair.reverter}</span>
        </div>
      )}
    </div>
  );
}

// Mini Chart for F&G History
function FGHistoryChart({ history }: { history: { date: string; score: number }[] }) {
  if (!history || history.length === 0) return null;

  const max = 100;
  const min = 0;
  const width = 100;
  const height = 40;
  
  const points = history.map((d, i) => {
    const x = (i / (history.length - 1)) * width;
    const y = height - ((d.score - min) / (max - min)) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16">
      {/* Fear zone */}
      <rect x="0" y={height * 0.7} width={width} height={height * 0.3} fill="rgba(239, 68, 68, 0.1)" />
      {/* Greed zone */}
      <rect x="0" y="0" width={width} height={height * 0.3} fill="rgba(34, 197, 94, 0.1)" />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
      />
      {/* Threshold lines */}
      <line x1="0" y1={height * 0.7} x2={width} y2={height * 0.7} stroke="#ef4444" strokeDasharray="2,2" strokeWidth="0.5" />
      <line x1="0" y1={height * 0.3} x2={width} y2={height * 0.3} stroke="#22c55e" strokeDasharray="2,2" strokeWidth="0.5" />
    </svg>
  );
}

export default function MREDashboard() {
  const [data, setData] = useState<MRESignals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/data/trading/mre-signals.json?" + Date.now());
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
      setError(null);
    } catch (e) {
      setError("Failed to load MRE signals");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p>{error}</p>
          <button onClick={fetchData} className="mt-4 px-4 py-2 bg-blue-600 rounded">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const buySignals = data.signals.by_asset_class.filter(s => s.signal === "BUY");
  const divergedPairs = data.pairs.pairs.filter(p => p.is_diverged);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Gauge className="w-8 h-8 text-blue-500" />
              MRE v3 Dashboard
            </h1>
            <p className="text-gray-400 mt-1">Market Regime Ensemble — Real-time Signals</p>
          </div>
          <div className="text-right">
            <button 
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <div className="text-xs text-gray-500 mt-1">
              Updated: {data.last_updated}
            </div>
          </div>
        </div>

        {/* Top Row: Fear & Greed + Regime */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Fear & Greed Gauge */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Fear & Greed Index
            </h2>
            <FearGreedGauge 
              value={data.fear_greed.current} 
              rating={data.fear_greed.rating} 
            />
            <div className="mt-4">
              <div className="text-sm text-gray-400 mb-2">30-Day History</div>
              <FGHistoryChart history={data.fear_greed.history} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="p-2 bg-gray-700/50 rounded">
                <div className="text-gray-400">Buy Threshold</div>
                <div className="font-mono text-green-400">&lt; {data.thresholds.fear_buy}</div>
              </div>
              <div className="p-2 bg-gray-700/50 rounded">
                <div className="text-gray-400">Source</div>
                <div className="font-mono">{data.fear_greed.source}</div>
              </div>
            </div>
          </div>

          {/* Regime Overview */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Market Regime
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                <span>SPY (S&P 500)</span>
                <RegimeBadge regime={data.regime.spy.regime} />
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                <span>QQQ (Nasdaq)</span>
                <RegimeBadge regime={data.regime.qqq.regime} />
              </div>
            </div>
            
            {/* Signal Summary */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-green-500/20 rounded-lg">
                <div className="text-2xl font-bold text-green-400">{data.signals.summary.total_buy}</div>
                <div className="text-xs text-gray-400">Buy Signals</div>
              </div>
              <div className="text-center p-3 bg-gray-500/20 rounded-lg">
                <div className="text-2xl font-bold">{data.signals.summary.total_hold}</div>
                <div className="text-xs text-gray-400">Hold</div>
              </div>
              <div className="text-center p-3 bg-yellow-500/20 rounded-lg">
                <div className="text-2xl font-bold text-yellow-400">{data.pairs.diverged_count}</div>
                <div className="text-xs text-gray-400">Pair Divergences</div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Signals Alert */}
        {(buySignals.length > 0 || divergedPairs.length > 0) && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 mb-8">
            <div className="flex items-center gap-2 text-green-400 font-semibold mb-2">
              <Zap className="w-5 h-5" />
              Active Signals!
            </div>
            <div className="text-sm">
              {buySignals.length > 0 && (
                <span className="mr-4">
                  🎯 Buy: {buySignals.map(s => s.symbol).join(", ")}
                </span>
              )}
              {divergedPairs.length > 0 && (
                <span>
                  🔄 Pairs: {divergedPairs.map(p => `${p.symbol1}/${p.symbol2}`).join(", ")}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Asset Class Signals */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            Signals by Asset Class
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.signals.by_asset_class
              .sort((a, b) => b.expected_sharpe - a.expected_sharpe)
              .map((signal) => (
                <SignalCard key={signal.asset_class} signal={signal} />
              ))}
          </div>
        </div>

        {/* Pair Divergences */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-blue-500" />
            Pair Mean Reversion
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.pairs.pairs.map((pair) => (
              <PairCard key={`${pair.symbol1}-${pair.symbol2}`} pair={pair} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          MRE v3 — Based on {data.meta?.backtests?.toLocaleString()} backtests
          <br />
          {data.meta?.key_insight}
        </div>
      </div>
    </div>
  );
}
// cache bust 1770398011
