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
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";

// ============ INTERFACES ============

interface FGComponent {
  name: string;
  score: number;
  signal: string;
  description: string;
  raw_value: number;
}

interface FGBreakdown {
  aggregate_score: number;
  rating: string;
  components: FGComponent[];
  methodology: string;
  sources: { name: string; used_for: string }[];
}

interface FearGreedData {
  current: number;
  rating: string;
  is_fear: boolean;
  is_extreme_fear: boolean;
  is_greed: boolean;
  is_extreme_greed: boolean;
  source: string;
  history: { date: string; score: number; vix: number }[];
  breakdown?: FGBreakdown;
}

interface FibonacciLevels {
  symbol: string;
  current_price: number;
  swing_high: number;
  swing_low: number;
  trend: string;
  retracements: { [key: string]: number };
  extensions: { [key: string]: number };
  nearest_support: number;
  nearest_resistance: number;
  entry_zone: string;
  profit_targets: number[];
  error?: string;
}

interface RegimeData {
  regime: string;
  price?: number;
  ema_20?: number;
  ema_50?: number;
  ema_200?: number;
  regime_days?: number;
  regime_stage?: string;
  predicted_remaining_days?: number;
  confidence?: number;
  momentum_20d?: number;
}

interface Outlier {
  symbol: string;
  asset_regime: string;
  market_regime: string;
  reason: string;
  action: string;
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
  fibonacci?: FibonacciLevels;
  regime_details?: RegimeData;
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
  last_updated_unix: number;
  fear_greed: FearGreedData;
  regime: {
    spy: RegimeData;
    qqq: RegimeData;
    global: string;
    outliers?: Outlier[];
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
    features?: string[];
  };
}

// ============ COMPONENTS ============

// Live Timer Component
function LiveTimer({ lastUpdatedUnix }: { lastUpdatedUnix: number }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = now - lastUpdatedUnix;
      
      if (diff < 60) {
        setElapsed(`${diff}s ago`);
      } else if (diff < 3600) {
        setElapsed(`${Math.floor(diff / 60)}m ago`);
      } else {
        setElapsed(`${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m ago`);
      }
    };
    
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [lastUpdatedUnix]);

  const isStale = (Date.now() / 1000 - lastUpdatedUnix) > 3600; // Over 1 hour old

  return (
    <div className={`flex items-center gap-2 text-sm ${isStale ? 'text-red-400' : 'text-gray-400'}`}>
      <Clock className="w-4 h-4" />
      <span>Updated: {elapsed}</span>
      {isStale && <AlertTriangle className="w-4 h-4 text-red-400" />}
    </div>
  );
}

// Fear & Greed Gauge Component
function FearGreedGauge({ value, rating }: { value: number; rating: string }) {
  const getColor = (val: number) => {
    if (val <= 25) return "#ef4444";
    if (val <= 45) return "#f97316";
    if (val <= 55) return "#eab308";
    if (val <= 75) return "#84cc16";
    return "#22c55e";
  };

  const rotation = (value / 100) * 180 - 90;

  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-between w-56 mb-1">
        <span className="text-xs text-red-500 font-medium">Fear</span>
        <span className="text-xs text-green-500 font-medium">Greed</span>
      </div>
      
      <div className="relative w-56 h-28">
        <svg viewBox="0 0 200 110" className="w-full h-full">
          <path d="M 20 100 A 80 80 0 0 1 55 30" fill="none" stroke="#ef4444" strokeWidth="16" strokeLinecap="round" />
          <path d="M 55 30 A 80 80 0 0 1 100 20" fill="none" stroke="#f97316" strokeWidth="16" />
          <path d="M 100 20 A 80 80 0 0 1 145 30" fill="none" stroke="#eab308" strokeWidth="16" />
          <path d="M 145 30 A 80 80 0 0 1 180 100" fill="none" stroke="#22c55e" strokeWidth="16" strokeLinecap="round" />
          <line x1="100" y1="100" x2="100" y2="35" stroke={getColor(value)} strokeWidth="3" strokeLinecap="round" transform={`rotate(${rotation}, 100, 100)`} />
          <circle cx="100" cy="100" r="6" fill={getColor(value)} />
        </svg>
      </div>
      
      <div className="text-center -mt-2">
        <div className="text-4xl font-bold" style={{ color: getColor(value) }}>
          {Math.round(value)}
        </div>
        <div className="text-sm text-gray-400 capitalize">{rating}</div>
      </div>
    </div>
  );
}

// F&G Component Breakdown
function FGBreakdownSection({ breakdown }: { breakdown: FGBreakdown }) {
  const [expanded, setExpanded] = useState(false);

  const getSignalColor = (signal: string) => {
    if (signal === "GREED") return "text-green-400";
    if (signal === "FEAR") return "text-red-400";
    return "text-gray-400";
  };

  return (
    <div className="mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
      >
        <Info className="w-4 h-4" />
        How is this calculated?
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      
      {expanded && (
        <div className="mt-3 p-4 bg-gray-700/50 rounded-lg">
          <div className="text-xs text-gray-400 mb-3">{breakdown.methodology}</div>
          
          <div className="space-y-2">
            {breakdown.components.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-sm">
                <div className="flex-1">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-gray-500">{c.description}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-mono ${getSignalColor(c.signal)}`}>{c.score.toFixed(0)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${getSignalColor(c.signal)} bg-gray-800`}>
                    {c.signal}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-600">
            <div className="text-xs text-gray-400">Data Sources:</div>
            <div className="flex flex-wrap gap-2 mt-1">
              {breakdown.sources.map((s) => (
                <span key={s.name} className="text-xs bg-gray-800 px-2 py-1 rounded">
                  {s.name}: {s.used_for}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Regime Badge Component
function RegimeBadge({ regime, compact = false }: { regime: string; compact?: boolean }) {
  const config = {
    bull: { color: "bg-green-500/20 text-green-400 border-green-500/50", icon: TrendingUp },
    bear: { color: "bg-red-500/20 text-red-400 border-red-500/50", icon: TrendingDown },
    sideways: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50", icon: Minus },
    unknown: { color: "bg-gray-500/20 text-gray-400 border-gray-500/50", icon: Activity },
  };

  const { color, icon: Icon } = config[regime as keyof typeof config] || config.unknown;

  return (
    <span className={`inline-flex items-center gap-1 ${compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'} rounded-full border whitespace-nowrap ${color}`}>
      <Icon className={compact ? "w-3 h-3" : "w-4 h-4"} />
      {regime.toUpperCase()}
    </span>
  );
}

// Regime Card with Predictions
function RegimeCard({ label, data }: { label: string; data: RegimeData }) {
  return (
    <div className="p-4 bg-gray-700/50 rounded-lg">
      <div className="flex justify-between items-center mb-3">
        <span className="font-medium">{label}</span>
        <RegimeBadge regime={data.regime} />
      </div>
      
      {data.regime_days !== undefined && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-gray-400 text-xs">Duration</div>
            <div className="font-mono">{data.regime_days} days</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs">Stage</div>
            <div className="font-mono capitalize">{data.regime_stage}</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs">Est. Remaining</div>
            <div className="font-mono">{data.predicted_remaining_days}d</div>
          </div>
          <div>
            <div className="text-gray-400 text-xs">Confidence</div>
            <div className={`font-mono ${(data.confidence || 0) >= 70 ? 'text-green-400' : (data.confidence || 0) >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
              {data.confidence}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Outliers Section
function OutliersSection({ outliers }: { outliers: Outlier[] }) {
  if (!outliers || outliers.length === 0) return null;

  return (
    <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
      <div className="flex items-center gap-2 text-yellow-400 font-semibold mb-2">
        <AlertTriangle className="w-5 h-5" />
        Assets Bucking the Trend
      </div>
      <div className="space-y-2">
        {outliers.map((o) => (
          <div key={o.symbol} className="flex items-center justify-between text-sm">
            <div>
              <span className="font-mono font-semibold">{o.symbol}</span>
              <span className="text-gray-400 ml-2">{o.reason}</span>
            </div>
            <span className="text-yellow-400 text-xs">{o.action}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Signal Card with Fibonacci
function SignalCard({ signal }: { signal: AssetSignal }) {
  const [showFib, setShowFib] = useState(false);
  
  const signalConfig = {
    BUY: { color: "border-green-500 bg-green-500/10", textColor: "text-green-400", icon: CheckCircle },
    HOLD: { color: "border-gray-500 bg-gray-500/10", textColor: "text-gray-400", icon: Clock },
    WATCH: { color: "border-yellow-500 bg-yellow-500/10", textColor: "text-yellow-400", icon: AlertTriangle },
  };

  const config = signalConfig[signal.signal as keyof typeof signalConfig] || signalConfig.HOLD;
  const Icon = config.icon;
  const fib = signal.fibonacci;

  return (
    <div className={`p-4 rounded-lg border-2 ${config.color}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="text-lg font-semibold flex items-center gap-2">
            {signal.symbol}
            <span className={`text-xs px-2 py-0.5 rounded ${config.textColor} bg-gray-800`}>
              {signal.signal}
            </span>
          </div>
          <div className="text-xs text-gray-400 capitalize">{signal.asset_class.replace("_", " ")}</div>
        </div>
        <Icon className={`w-6 h-6 ${config.textColor} flex-shrink-0`} />
      </div>
      
      <div className="mb-3">
        <RegimeBadge regime={signal.regime} compact />
      </div>
      
      <div className="grid grid-cols-3 gap-3 text-sm mb-3">
        <div>
          <div className="text-gray-400 text-xs">Price</div>
          <div className="font-mono">${signal.price.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-gray-400 text-xs">Sharpe</div>
          <div className="font-mono">{signal.expected_sharpe.toFixed(1)}</div>
        </div>
        <div>
          <div className="text-gray-400 text-xs">Accuracy</div>
          <div className="font-mono">{signal.expected_accuracy}%</div>
        </div>
      </div>

      {/* Fibonacci Section */}
      {fib && !fib.error && (
        <>
          <button
            onClick={() => setShowFib(!showFib)}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mb-2"
          >
            📐 Fibonacci Levels
            {showFib ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          
          {showFib && (
            <div className="p-3 bg-gray-800/50 rounded text-xs space-y-3">
              {/* Quick Summary */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Support:</span>
                  <span className="font-mono text-green-400">${fib.nearest_support.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Resistance:</span>
                  <span className="font-mono text-red-400">${fib.nearest_resistance.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Trend:</span>
                <span className={`font-mono ${fib.trend === 'uptrend' ? 'text-green-400' : 'text-red-400'}`}>
                  {fib.trend?.toUpperCase()}
                </span>
              </div>
              
              {/* Retracements - Buy zones in pullbacks */}
              <div className="pt-2 border-t border-gray-700">
                <div className="text-gray-400 mb-2 flex items-center gap-1">
                  📉 Retracements <span className="text-gray-500">(pullback buy zones)</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(fib.retracements)
                    .filter(([level]) => ['23.6', '38.2', '50.0', '61.8', '78.6'].includes(level))
                    .map(([level, price]) => (
                    <div key={level} className="text-center bg-gray-900/50 p-1 rounded">
                      <div className="text-gray-500">{level}%</div>
                      <div className="font-mono text-yellow-400">${Number(price).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-gray-500">
                  Entry Zone: <span className="text-yellow-400 font-mono">{fib.entry_zone}</span>
                </div>
              </div>
              
              {/* Extensions - Profit targets */}
              <div className="pt-2 border-t border-gray-700">
                <div className="text-gray-400 mb-2 flex items-center gap-1">
                  📈 Extensions <span className="text-gray-500">(profit targets)</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(fib.extensions).map(([level, price]) => (
                    <div key={level} className="text-center bg-gray-900/50 p-1 rounded">
                      <div className="text-gray-500">{level}%</div>
                      <div className="font-mono text-green-400">${Number(price).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Swing points for reference */}
              <div className="pt-2 border-t border-gray-700 text-gray-500">
                <div className="flex justify-between">
                  <span>Swing High:</span>
                  <span className="font-mono">${fib.swing_high.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Swing Low:</span>
                  <span className="font-mono">${fib.swing_low.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      
      {signal.signal === "BUY" && (
        <div className="mt-3 p-2 bg-green-500/20 rounded text-sm">
          <span className="text-green-400">🎯 Buy Signal</span>
          <span className="text-gray-400 ml-2">Hold {signal.hold_days} days</span>
        </div>
      )}
    </div>
  );
}

// Pair Card
function PairCard({ pair }: { pair: PairData }) {
  return (
    <div className={`p-4 rounded-lg border ${pair.is_diverged ? 'border-yellow-500 bg-yellow-500/10' : 'border-gray-700 bg-gray-800/50'}`}>
      <div className="flex justify-between items-center mb-3">
        <div className="font-semibold text-base">{pair.symbol1}/{pair.symbol2}</div>
        {pair.is_diverged && <Zap className="w-5 h-5 text-yellow-500 flex-shrink-0" />}
      </div>
      
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-gray-400 text-xs mb-1">Z-Score</div>
          <div className={`font-mono ${Math.abs(pair.z_score) > 2 ? 'text-yellow-400' : 'text-white'}`}>
            {pair.z_score.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-gray-400 text-xs mb-1">Reverter</div>
          <div className="font-mono text-white">{pair.reverter}</div>
        </div>
        <div>
          <div className="text-gray-400 text-xs mb-1">Prob</div>
          <div className="font-mono text-white">{(pair.probability * 100).toFixed(0)}%</div>
        </div>
      </div>
      
      {pair.is_diverged && (
        <div className="mt-3 p-2 bg-yellow-500/20 rounded text-sm">
          <span className="text-yellow-400">🔄 Diverged!</span>
          <span className="text-gray-400 ml-2">Buy {pair.reverter}</span>
        </div>
      )}
    </div>
  );
}

// History Chart
function FGHistoryChart({ history }: { history: { date: string; score: number }[] }) {
  if (!history || history.length === 0) return null;

  const width = 200;
  const height = 60;
  const padding = 5;
  
  const points = history.map((d, i) => {
    const x = padding + (i / (history.length - 1)) * (width - padding * 2);
    const y = padding + (height - padding * 2) - ((d.score) / 100) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-20" preserveAspectRatio="xMidYMid meet">
      <rect x={padding} y={height - padding - (height - padding * 2) * 0.3} width={width - padding * 2} height={(height - padding * 2) * 0.3} fill="rgba(239, 68, 68, 0.1)" />
      <rect x={padding} y={padding} width={width - padding * 2} height={(height - padding * 2) * 0.3} fill="rgba(34, 197, 94, 0.1)" />
      <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
      <line x1={padding} y1={height - padding - (height - padding * 2) * 0.3} x2={width - padding} y2={height - padding - (height - padding * 2) * 0.3} stroke="#ef4444" strokeDasharray="4,4" strokeWidth="1" opacity="0.5" />
      <line x1={padding} y1={padding + (height - padding * 2) * 0.3} x2={width - padding} y2={padding + (height - padding * 2) * 0.3} stroke="#22c55e" strokeDasharray="4,4" strokeWidth="1" opacity="0.5" />
    </svg>
  );
}

// ============ MAIN COMPONENT ============

export default function MREDashboard() {
  const [data, setData] = useState<MRESignals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/data/trading/mre-signals.json?" + Date.now());
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
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
    const interval = setInterval(fetchData, 60000);
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
          <button onClick={fetchData} className="mt-4 px-4 py-2 bg-blue-600 rounded">Retry</button>
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
        {/* Header with Live Timer */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Gauge className="w-8 h-8 text-blue-500" />
              MRE {data.meta?.version} Dashboard
            </h1>
            <p className="text-gray-400 mt-1">Market Regime Ensemble — Real-time Signals</p>
          </div>
          <div className="text-right">
            <button 
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 mb-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <LiveTimer lastUpdatedUnix={data.last_updated_unix || 0} />
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
                <span className="mr-4">🎯 Buy: {buySignals.map(s => s.symbol).join(", ")}</span>
              )}
              {divergedPairs.length > 0 && (
                <span>🔄 Pairs: {divergedPairs.map(p => `${p.symbol1}/${p.symbol2}`).join(", ")}</span>
              )}
            </div>
          </div>
        )}

        {/* Top Row: Fear & Greed + Regime */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Fear & Greed with Breakdown */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Fear & Greed Index
            </h2>
            <FearGreedGauge value={data.fear_greed.current} rating={data.fear_greed.rating} />
            
            <div className="mt-6">
              <div className="text-sm text-gray-400 mb-2">30-Day History</div>
              <FGHistoryChart history={data.fear_greed.history} />
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-gray-700/50 rounded">
                <div className="text-gray-400 text-xs mb-1">Buy Threshold</div>
                <div className="font-mono text-green-400">&lt; {data.thresholds.fear_buy}</div>
              </div>
              <div className="p-3 bg-gray-700/50 rounded">
                <div className="text-gray-400 text-xs mb-1">Source</div>
                <div className="font-mono uppercase">{data.fear_greed.source}</div>
              </div>
            </div>

            {/* F&G Breakdown */}
            {data.fear_greed.breakdown && (
              <FGBreakdownSection breakdown={data.fear_greed.breakdown} />
            )}
          </div>

          {/* Regime with Predictions */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Market Regime
            </h2>
            
            <div className="space-y-4">
              <RegimeCard label="SPY (S&P 500)" data={data.regime.spy} />
              <RegimeCard label="QQQ (Nasdaq)" data={data.regime.qqq} />
            </div>
            
            {/* Outliers */}
            <OutliersSection outliers={data.regime.outliers || []} />
            
            {/* Signal Summary */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-green-500/20 rounded-lg">
                <div className="text-2xl font-bold text-green-400">{data.signals.summary.total_buy}</div>
                <div className="text-xs text-gray-400 mt-1">Buy Signals</div>
              </div>
              <div className="text-center p-3 bg-gray-500/20 rounded-lg">
                <div className="text-2xl font-bold text-white">{data.signals.summary.total_hold}</div>
                <div className="text-xs text-gray-400 mt-1">Hold</div>
              </div>
              <div className="text-center p-3 bg-yellow-500/20 rounded-lg">
                <div className="text-2xl font-bold text-yellow-400">{data.pairs.diverged_count}</div>
                <div className="text-xs text-gray-400 mt-1">Divergences</div>
              </div>
            </div>
          </div>
        </div>

        {/* Asset Class Signals */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            Signals by Asset Class
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.signals.by_asset_class
              .sort((a, b) => {
                // Sort BUY first, then by Sharpe
                if (a.signal === "BUY" && b.signal !== "BUY") return -1;
                if (b.signal === "BUY" && a.signal !== "BUY") return 1;
                return b.expected_sharpe - a.expected_sharpe;
              })
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
          MRE {data.meta?.version} — Based on {data.meta?.backtests?.toLocaleString()} backtests
          <br />
          {data.meta?.key_insight}
          {data.meta?.features && (
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {data.meta.features.map((f) => (
                <span key={f} className="text-xs bg-gray-800 px-2 py-1 rounded">✓ {f}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
