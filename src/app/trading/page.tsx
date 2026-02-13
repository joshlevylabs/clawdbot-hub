"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Wallet,
  BarChart3,
  Activity,
  Clock,
  DollarSign,
  Percent,
  Target,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  Database,
  Shield,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ReferenceLine as ChartRefLine,
  ResponsiveContainer,
} from "recharts";
import ActionsDashboard from "@/components/ActionsDashboard";
import PerformanceChart from "@/components/PerformanceChart";
import MREDashboard from "./MREDashboard";
import UniverseTable from "./UniverseTable";
import MarketsOverview from "./MarketsOverview";
import OptimizerResults from "./OptimizerResults";
import PositionCharts from "@/components/PositionCharts";
import SignalAnalysisModal from "@/components/SignalAnalysisModal";

// ===== Types =====

interface PaperPosition {
  id: string;
  user_id: string | null;
  symbol: string;
  side: string;
  qty: number;
  entry_price: number;
  current_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  signal_confidence: number | null;
  signal_regime: string | null;
  opened_at: string;
  hold_days: number | null;
  notes: string | null;
  auto_tracked: boolean | null;
}

interface PaperTrade {
  id: string;
  symbol: string;
  side: string;
  qty: number;
  entry_price: number;
  exit_price: number;
  pnl: number;
  pnl_pct: number;
  hold_days_actual: number | null;
  signal_was_correct: boolean | null;
  signal_confidence: number | null;
  close_reason: string | null;
  opened_at: string;
  closed_at: string;
}

interface PortfolioSnapshot {
  id: string;
  date: string;
  equity: number;
  cash: number;
  positions_value: number;
  daily_pnl: number | null;
  daily_pnl_pct: number | null;
  total_pnl: number | null;
  total_pnl_pct: number | null;
  spy_price: number | null;
  spy_baseline: number | null;
  open_positions: number | null;
}

interface SignalRecord {
  id: string;
  symbol: string;
  signal: string;
  confidence: number | null;
  fear_greed: number | null;
  regime: string | null;
  price_at_signal: number;
  was_correct_5d: boolean | null;
  was_correct_10d: boolean | null;
  was_correct_20d: boolean | null;
  outcome_5d_pct: number | null;
  outcome_10d_pct: number | null;
  generated_at: string;
}

interface TradingConfig {
  starting_capital: number | null;
  current_cash: number | null;
  auto_trade: boolean | null;
  max_position_pct: number | null;
  default_stop_loss_pct: number | null;
  default_take_profit_pct: number | null;
}

interface SignalStats {
  overall: {
    total: number;
    correct_5d: number;
    correct_10d: number;
    correct_20d: number;
    accuracy_5d: number;
    accuracy_10d: number;
    accuracy_20d: number;
    avg_outcome_5d: number;
    avg_outcome_10d: number;
    avg_outcome_20d: number;
  };
  bySymbol: Record<string, {
    total: number;
    correct_5d: number;
    accuracy_5d: number;
    avg_outcome_5d: number;
    correct_10d: number;
    accuracy_10d: number;
    correct_20d: number;
    accuracy_20d: number;
  }>;
  bySignalType: Record<string, {
    total: number;
    correct_5d: number;
    accuracy_5d: number;
  }>;
}

interface IntradaySnapshot {
  id: string;
  timestamp: string;
  equity: number;
  cash: number;
  positions_value: number;
  daily_pnl: number | null;
  daily_pnl_pct: number | null;
  total_pnl: number | null;
  total_pnl_pct: number | null;
  spy_price: number | null;
  spy_baseline: number | null;
  open_positions: number | null;
}

interface PaperTradingData {
  positions: PaperPosition[];
  trades: PaperTrade[];
  snapshots: PortfolioSnapshot[];
  intradaySnapshots: IntradaySnapshot[];
  signals: SignalRecord[];
  config: TradingConfig | null;
  signalStats: SignalStats;
  timestamp: string;
}

// ===== Market Status =====

function getMarketStatus(): { open: boolean; message: string } {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay();
  const hours = et.getHours();
  const minutes = et.getMinutes();

  if (day === 0 || day === 6) return { open: false, message: "Market closed (weekend)" };

  const timeInMinutes = hours * 60 + minutes;
  const marketOpen = 9 * 60 + 30;
  const marketClose = 16 * 60;

  if (timeInMinutes < marketOpen) {
    const minsUntil = marketOpen - timeInMinutes;
    const h = Math.floor(minsUntil / 60);
    const m = minsUntil % 60;
    return { open: false, message: `Pre-market (opens in ${h}h ${m}m)` };
  }
  if (timeInMinutes >= marketClose) return { open: false, message: "After hours (closed)" };
  return { open: true, message: "Market open" };
}

// ===== Formatting =====

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

// ===== Components =====

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
}) {
  const trendColor = trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-slate-400";
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${trendColor}`} />
        <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${trendColor}`}>{value}</p>
      {subValue && <p className="text-sm text-slate-500 mt-1">{subValue}</p>}
    </div>
  );
}

function SignalAccuracyPanel({ stats }: { stats: SignalStats }) {
  const { overall, bySymbol, bySignalType } = stats;

  if (overall.total === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 text-center">
        <Target className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-slate-400">Signal accuracy data will appear once signals are tracked</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <h3 className="font-semibold text-slate-100 flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-primary-400" />
        Signal Accuracy
      </h3>

      {/* Overall accuracy */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500">5-Day</p>
          <p className={`text-xl font-bold ${overall.accuracy_5d >= 55 ? "text-emerald-400" : overall.accuracy_5d >= 45 ? "text-amber-400" : "text-red-400"}`}>
            {overall.accuracy_5d.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-600">{overall.correct_5d}/{overall.total} signals</p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500">10-Day</p>
          <p className={`text-xl font-bold ${overall.accuracy_10d >= 55 ? "text-emerald-400" : overall.accuracy_10d >= 45 ? "text-amber-400" : "text-red-400"}`}>
            {overall.accuracy_10d.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-600">{overall.correct_10d}/{overall.total}</p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500">20-Day</p>
          <p className={`text-xl font-bold ${overall.accuracy_20d >= 55 ? "text-emerald-400" : overall.accuracy_20d >= 45 ? "text-amber-400" : "text-red-400"}`}>
            {overall.accuracy_20d.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-600">{overall.correct_20d}/{overall.total}</p>
        </div>
      </div>

      {/* By signal type */}
      {Object.keys(bySignalType).length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">By Signal Type</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(bySignalType).map(([type, s]) => (
              <div key={type} className={`px-3 py-1.5 rounded-lg border text-xs ${
                type === "BUY" ? "bg-emerald-900/30 border-emerald-700/50 text-emerald-400" :
                type === "SELL" ? "bg-red-900/30 border-red-700/50 text-red-400" :
                "bg-slate-800 border-slate-700 text-slate-400"
              }`}>
                {type}: {s.accuracy_5d.toFixed(0)}% ({s.correct_5d}/{s.total})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By symbol */}
      {Object.keys(bySymbol).length > 0 && (
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">By Symbol (5-Day)</p>
          <div className="space-y-1.5">
            {Object.entries(bySymbol)
              .sort((a, b) => b[1].total - a[1].total)
              .slice(0, 8)
              .map(([symbol, s]) => (
                <div key={symbol} className="flex items-center justify-between">
                  <span className="text-sm font-mono text-slate-300">{symbol}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.accuracy_5d >= 55 ? "bg-emerald-500" : s.accuracy_5d >= 45 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${Math.min(100, s.accuracy_5d)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 w-16 text-right">
                      {s.accuracy_5d.toFixed(0)}% ({s.total})
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Unified Trading Page with Single Tab Bar =====

type ActiveTab = "overview" | "plays" | "positions" | "trades" | "signals" | "mre" | "universe" | "optimizer" | "markets" | "validation";

export default function TradingPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [data, setData] = useState<PaperTradingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<"supabase" | "static">("supabase");
  const [marketStatus] = useState(getMarketStatus());

  // Analyze feature: open signal analysis modal
  const [analyzeModalSymbol, setAnalyzeModalSymbol] = useState<string | null>(null);

  // Legacy: still support passing symbol to markets tab
  const [analyzeSymbol, setAnalyzeSymbol] = useState<string | null>(null);

  const handleAnalyze = (symbol: string) => {
    setAnalyzeModalSymbol(symbol);
  };

  // Clear analyzeSymbol after MarketsOverview consumes it
  const handleAnalyzeConsumed = () => {
    setAnalyzeSymbol(null);
  };

  // Legacy state for ActionsDashboard compatibility
  const [legacyPositions, setLegacyPositions] = useState<{ symbol: string; qty: number; entry_price: number }[]>([]);

  const loadFromSupabase = useCallback(async () => {
    try {
      const res = await fetch("/api/paper-trading");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: PaperTradingData = await res.json();
      setData(json);
      setDataSource("supabase");

      // Map positions for ActionsDashboard compatibility
      setLegacyPositions(
        json.positions.map((p) => ({
          symbol: p.symbol,
          qty: p.qty,
          entry_price: p.entry_price,
        }))
      );
    } catch (err) {
      console.error("Supabase fetch failed, falling back to static:", err);
      await loadFromStatic();
    }
  }, []);

  const loadFromStatic = useCallback(async () => {
    try {
      const res = await fetch("/data/paper-portfolio.json");
      if (!res.ok) throw new Error("Static file not found");
      const portfolio = await res.json();

      // Convert static format to new format
      setData({
        positions: portfolio.positions || [],
        trades: portfolio.trades || [],
        snapshots: (portfolio.performance || []).map((p: any) => ({
          id: p.date,
          date: p.date,
          equity: p.equity,
          cash: p.cash,
          positions_value: p.equity - p.cash,
          spy_price: p.spy_price,
          spy_baseline: p.spy_baseline,
        })),
        intradaySnapshots: [],
        signals: [],
        config: {
          starting_capital: portfolio.account?.starting_capital || 100000,
          current_cash: portfolio.account?.cash || 100000,
          auto_trade: false,
          max_position_pct: 10,
          default_stop_loss_pct: 5,
          default_take_profit_pct: 10,
        },
        signalStats: {
          overall: { total: 0, correct_5d: 0, correct_10d: 0, correct_20d: 0, accuracy_5d: 0, accuracy_10d: 0, accuracy_20d: 0, avg_outcome_5d: 0, avg_outcome_10d: 0, avg_outcome_20d: 0 },
          bySymbol: {},
          bySignalType: {},
        },
        timestamp: portfolio.updated_at || new Date().toISOString(),
      });
      setDataSource("static");
      setLegacyPositions(portfolio.positions?.map((p: any) => ({ symbol: p.symbol, qty: p.qty, entry_price: p.entry_price })) || []);
    } catch (err) {
      setError("Failed to load trading data");
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    await loadFromSupabase();
    setLoading(false);
  }, [loadFromSupabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      loadFromSupabase(); // Silent refresh, don't set loading state
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadFromSupabase]);

  // Derived portfolio data
  const config = data?.config;
  const positions = data?.positions || [];
  const trades = data?.trades || [];
  const snapshots = data?.snapshots || [];
  const intradaySnapshots = data?.intradaySnapshots || [];
  const signalStats = data?.signalStats;
  const startingCapital = config?.starting_capital || 100000;
  const cash = config?.current_cash || 100000;
  const positionsValue = positions.reduce((sum, p) => sum + p.qty * (p.current_price || p.entry_price), 0);
  const equity = cash + positionsValue;
  const totalPnl = equity - startingCapital;
  const totalPnlPct = (totalPnl / startingCapital) * 100;

  // Today's return: find previous day's close equity from snapshots
  const todayReturn = (() => {
    if (snapshots.length < 2) return { pnl: 0, pct: 0 };
    // Daily snapshots don't have "T", intraday do
    const dailySnapshots = snapshots.filter((s) => !s.date.includes("T"));
    const prevDayEquity = dailySnapshots.length > 0
      ? dailySnapshots[dailySnapshots.length - 1].equity
      : startingCapital;
    const pnl = equity - prevDayEquity;
    const pct = prevDayEquity > 0 ? (pnl / prevDayEquity) * 100 : 0;
    return { pnl, pct };
  })();

  // Trade stats
  const winningTrades = trades.filter((t) => t.pnl > 0);
  const losingTrades = trades.filter((t) => t.pnl < 0);
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
  const totalRealizedPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const avgWin = winningTrades.length > 0 ? winningTrades.reduce((s, t) => s + t.pnl, 0) / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((s, t) => s + t.pnl, 0) / losingTrades.length) : 0;
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;

  const isPortfolioTab = activeTab === "overview" || activeTab === "plays" || activeTab === "positions" || activeTab === "trades" || activeTab === "signals";

  const tabConfig: { key: ActiveTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "plays", label: "Today's Plays" },
    { key: "positions", label: "Positions" },
    { key: "trades", label: "Trades" },
    { key: "signals", label: "Signals" },
    { key: "mre", label: "MRE" },
    { key: "universe", label: "Universe" },
    { key: "optimizer", label: "Optimizer" },
    { key: "markets", label: "Markets" },
    { key: "validation", label: "Validation" },
  ];

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Sticky Header with Unified Tab Bar */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 px-4 lg:px-6 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary-400" />
                Trading
              </h1>
              {isPortfolioTab && (
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    dataSource === "supabase"
                      ? "bg-emerald-900/50 text-emerald-400"
                      : "bg-amber-900/50 text-amber-400"
                  }`}>
                    <Database className="w-3 h-3" />
                    {dataSource === "supabase" ? "Live" : "Static"}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    marketStatus.open
                      ? "bg-emerald-900/50 text-emerald-400"
                      : "bg-amber-900/50 text-amber-400"
                  }`}>
                    {marketStatus.open ? "🟢" : "🔴"} {marketStatus.message}
                  </span>
                  {config?.auto_trade && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary-900/50 text-primary-400">
                      <Zap className="w-3 h-3 inline" /> Auto
                    </span>
                  )}
                </div>
              )}
            </div>
            {isPortfolioTab && (
              <button
                onClick={loadData}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 text-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            )}
          </div>
          <div className="flex gap-1 bg-slate-800/60 rounded-lg p-1 overflow-x-auto">
            {tabConfig.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-primary-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4 lg:p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Loading state for portfolio tabs */}
          {isPortfolioTab && loading && (
            <div className="flex items-center justify-center py-24">
              <RefreshCw className="w-8 h-8 text-primary-400 animate-spin" />
            </div>
          )}

          {/* Error state for portfolio tabs */}
          {isPortfolioTab && !loading && error && (
            <div className="flex items-center justify-center py-24">
              <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
                <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                <p className="text-red-300">{error}</p>
                <button onClick={loadData} className="mt-4 px-4 py-2 bg-primary-600 rounded-lg text-sm">
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* ===== OVERVIEW TAB ===== */}
          {activeTab === "overview" && !loading && !error && (
            <>
              {/* Portfolio Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard
                  icon={Wallet}
                  label="Total Equity"
                  value={`$${formatCurrency(equity)}`}
                  subValue={`Started: $${formatCurrency(startingCapital)}`}
                  trend={totalPnl >= 0 ? "up" : "down"}
                />
                <StatCard
                  icon={totalPnl >= 0 ? TrendingUp : TrendingDown}
                  label="All-Time Return"
                  value={`${totalPnl >= 0 ? "+" : ""}$${formatCurrency(totalPnl)}`}
                  subValue={formatPercent(totalPnlPct)}
                  trend={totalPnl >= 0 ? "up" : "down"}
                />
                <StatCard
                  icon={todayReturn.pnl >= 0 ? TrendingUp : TrendingDown}
                  label="Today's Return"
                  value={`${todayReturn.pnl >= 0 ? "+" : ""}$${formatCurrency(todayReturn.pnl)}`}
                  subValue={formatPercent(todayReturn.pct)}
                  trend={todayReturn.pnl >= 0 ? "up" : "down"}
                />
                <StatCard
                  icon={DollarSign}
                  label="Cash Available"
                  value={`$${formatCurrency(cash)}`}
                  subValue={`${equity > 0 ? ((cash / equity) * 100).toFixed(0) : 100}% of portfolio`}
                  trend="neutral"
                />
                <StatCard
                  icon={Activity}
                  label="Open Positions"
                  value={positions.length.toString()}
                  subValue={`$${formatCurrency(positionsValue)} invested`}
                  trend="neutral"
                />
              </div>

              {/* Trade Performance Stats */}
              {trades.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    icon={CheckCircle}
                    label="Win Rate"
                    value={`${winRate.toFixed(1)}%`}
                    subValue={`${winningTrades.length}W / ${losingTrades.length}L of ${trades.length}`}
                    trend={winRate >= 50 ? "up" : "down"}
                  />
                  <StatCard
                    icon={DollarSign}
                    label="Realized P/L"
                    value={`${totalRealizedPnl >= 0 ? "+" : ""}$${formatCurrency(totalRealizedPnl)}`}
                    subValue={`${trades.length} closed trades`}
                    trend={totalRealizedPnl >= 0 ? "up" : "down"}
                  />
                  <StatCard
                    icon={Percent}
                    label="Profit Factor"
                    value={profitFactor === Infinity ? "∞" : profitFactor.toFixed(2)}
                    subValue={`Avg Win: $${formatCurrency(avgWin)}`}
                    trend={profitFactor >= 1.5 ? "up" : profitFactor >= 1 ? "neutral" : "down"}
                  />
                  <StatCard
                    icon={Clock}
                    label="Avg Hold"
                    value={`${trades.length > 0 ? (trades.reduce((s, t) => s + (t.hold_days_actual || 0), 0) / trades.length).toFixed(1) : "0"} days`}
                    subValue="Average hold time"
                    trend="neutral"
                  />
                </div>
              )}

              {/* Performance vs S&P 500 — PROMINENT */}
              <PerformanceChart
                snapshots={snapshots}
                startingCapital={startingCapital}
              />

              {/* Signal Accuracy */}
              {signalStats && <SignalAccuracyPanel stats={signalStats} />}
            </>
          )}

          {/* ===== TODAY'S PLAYS TAB ===== */}
          {activeTab === "plays" && !loading && !error && (
            <ActionsDashboard
              positions={legacyPositions}
              cash={cash}
              tradingEnabled={true}
              onAnalyze={handleAnalyze}
              onTrade={async (symbol, side, qty, price, target, stop) => {
                try {
                  const res = await fetch("/api/paper-trading", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ symbol, side, qty, price, target, stop }),
                  });
                  if (!res.ok) {
                    const err = await res.json();
                    alert(`Trade failed: ${err.error}`);
                    return;
                  }
                  // Refresh data after trade
                  loadFromSupabase();
                } catch (err) {
                  alert(`Trade error: ${err}`);
                }
              }}
            />
          )}

          {/* ===== POSITIONS TAB ===== */}
          {activeTab === "positions" && !loading && !error && (
            <>
              {/* Position Charts */}
              {positions.length > 0 && (
                <PositionCharts positions={positions} />
              )}

              {positions.length === 0 ? (
                <div className="bg-slate-800/50 rounded-xl p-12 border border-slate-700/50 text-center">
                  <Database className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No open positions</p>
                </div>
              ) : (
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary-400" />
                    Open Positions ({positions.length})
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-slate-500 uppercase border-b border-slate-700">
                          <th className="text-left py-2 px-2">Symbol</th>
                          <th className="text-left py-2 px-2">Regime</th>
                          <th className="text-right py-2 px-2">Qty</th>
                          <th className="text-right py-2 px-2">Entry</th>
                          <th className="text-right py-2 px-2">Current</th>
                          <th className="text-right py-2 px-2">P/L ($)</th>
                          <th className="text-right py-2 px-2">P/L (%)</th>
                          <th className="text-right py-2 px-2">Value</th>
                          <th className="text-right py-2 px-2">% of Portfolio</th>
                          <th className="text-right py-2 px-2">Confidence</th>
                          <th className="text-right py-2 px-2">Pos Score</th>
                          <th className="text-right py-2 px-2">Stop</th>
                          <th className="text-right py-2 px-2">Target</th>
                          <th className="text-right py-2 px-2">Days</th>
                          <th className="text-center py-2 px-2">Auto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {positions.map((pos) => {
                          const currentPrice = pos.current_price || pos.entry_price;
                          const unrealizedPnl = pos.qty * (currentPrice - pos.entry_price);
                          const unrealizedPnlPct = ((currentPrice - pos.entry_price) / pos.entry_price) * 100;
                          const isProfit = unrealizedPnl >= 0;
                          const holdDays = daysSince(pos.opened_at);
                          const posValue = pos.qty * currentPrice;
                          const portfolioPct = equity > 0 ? (posValue / equity) * 100 : 0;

                          return (
                            <tr key={pos.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                              <td className="py-3 px-2">
                                <span className="font-bold text-slate-100">{pos.symbol}</span>
                                {pos.notes && <p className="text-[10px] text-slate-600 mt-0.5 truncate max-w-[120px]">{pos.notes}</p>}
                              </td>
                              <td className="py-3 px-2">
                                {pos.signal_regime && (
                                  <span className={`text-xs px-2 py-0.5 rounded-lg border font-medium capitalize ${
                                    pos.signal_regime === "bull" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" :
                                    pos.signal_regime === "bear" ? "bg-red-500/20 text-red-400 border-red-500/40" :
                                    "bg-amber-500/20 text-amber-400 border-amber-500/40"
                                  }`}>
                                    {pos.signal_regime === "bull" ? "🟢" : pos.signal_regime === "bear" ? "🔴" : "🟡"} {pos.signal_regime}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-2 text-right font-mono text-slate-300">{pos.qty}</td>
                              <td className="py-3 px-2 text-right font-mono text-slate-400">${formatCurrency(pos.entry_price)}</td>
                              <td className="py-3 px-2 text-right font-mono text-slate-300">${formatCurrency(currentPrice)}</td>
                              <td className={`py-3 px-2 text-right font-mono font-bold ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                                {isProfit ? "+" : ""}${formatCurrency(unrealizedPnl)}
                              </td>
                              <td className={`py-3 px-2 text-right font-mono ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                                {formatPercent(unrealizedPnlPct)}
                              </td>
                              <td className="py-3 px-2 text-right font-mono text-slate-300">${formatCurrency(posValue)}</td>
                              <td className="py-3 px-2 text-right font-mono text-slate-400">{portfolioPct.toFixed(1)}%</td>
                              <td className="py-3 px-2 text-right">
                                {pos.signal_confidence ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full ${pos.signal_confidence >= 70 ? "bg-emerald-500" : pos.signal_confidence >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                                        style={{ width: `${pos.signal_confidence}%` }} />
                                    </div>
                                    <span className="text-xs text-slate-400">{pos.signal_confidence}%</span>
                                  </div>
                                ) : <span className="text-xs text-slate-600">—</span>}
                              </td>
                              {/* Position Score — same formula as _score_existing_position in mre_signal_exporter.py */}
                              <td className="py-3 px-2 text-right">
                                {(() => {
                                  const conf = pos.signal_confidence || 50;
                                  const pnlPct = unrealizedPnlPct;
                                  const pnlScore = Math.max(0, Math.min(100, 50 + pnlPct * 5));
                                  const holdTarget = pos.hold_days || 10;
                                  const daysRemaining = Math.max(0, (holdTarget - holdDays) / holdTarget);
                                  const regimeStr = (pos.signal_regime || "sideways").toLowerCase();
                                  const regimeScore = regimeStr === "bull" ? 100 : regimeStr === "bear" ? 0 : 50;
                                  const posScore = Math.round(
                                    conf * 0.40 +
                                    pnlScore * 0.20 +
                                    daysRemaining * 100 * 0.20 +
                                    regimeScore * 0.20
                                  );
                                  return (
                                    <span className={`font-mono text-xs font-bold ${
                                      posScore >= 65 ? "text-emerald-400" :
                                      posScore >= 45 ? "text-amber-400" :
                                      "text-red-400"
                                    }`}>
                                      {posScore}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="py-3 px-2 text-right font-mono text-red-400/70">
                                {pos.stop_loss ? `$${formatCurrency(pos.stop_loss)}` : "—"}
                              </td>
                              <td className="py-3 px-2 text-right font-mono text-emerald-400/70">
                                {pos.take_profit ? `$${formatCurrency(pos.take_profit)}` : "—"}
                              </td>
                              <td className="py-3 px-2 text-right text-sm text-slate-400">
                                {holdDays}d
                                {pos.hold_days && <span className="text-xs text-slate-600">/{pos.hold_days}</span>}
                              </td>
                              <td className="py-3 px-2 text-center">
                                {pos.auto_tracked ? <Zap className="w-4 h-4 text-primary-400 mx-auto" /> : <span className="text-xs text-slate-600">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-600 bg-slate-800/80 font-bold">
                          <td className="py-3 px-2 text-slate-100">Total</td>
                          <td></td>
                          <td></td>
                          <td className="py-3 px-2 text-right font-mono text-slate-400">
                            ${formatCurrency(positions.reduce((s, p) => s + p.entry_price * p.qty, 0))}
                          </td>
                          <td></td>
                          <td className={`py-3 px-2 text-right font-mono ${totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {totalPnl >= 0 ? "+" : ""}${formatCurrency(totalPnl)}
                          </td>
                          <td className={`py-3 px-2 text-right font-mono ${totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {formatPercent(totalPnlPct)}
                          </td>
                          <td className="py-3 px-2 text-right font-mono text-slate-200">${formatCurrency(positionsValue)}</td>
                          <td className="py-3 px-2 text-right font-mono text-slate-400">
                            {equity > 0 ? ((positionsValue / equity) * 100).toFixed(1) : "0"}%
                          </td>
                          <td colSpan={6} className="py-3 px-2 text-right text-sm text-slate-500">
                            Cash: ${formatCurrency(cash)} ({equity > 0 ? ((cash / equity) * 100).toFixed(1) : 100}%)
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ===== TRADES TAB ===== */}
          {activeTab === "trades" && !loading && !error && (
            <>
              {/* Active Trades (from open positions) */}
              {positions.length > 0 && (
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 mb-4">
                  <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    Active Trades ({positions.length})
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-slate-500 uppercase border-b border-slate-700">
                          <th className="text-left py-2 px-2">Opened</th>
                          <th className="text-left py-2 px-2">Symbol</th>
                          <th className="text-right py-2 px-2">Qty</th>
                          <th className="text-right py-2 px-2">Entry</th>
                          <th className="text-right py-2 px-2">Current</th>
                          <th className="text-right py-2 px-2">Unrealized P/L</th>
                          <th className="text-right py-2 px-2">P/L %</th>
                          <th className="text-right py-2 px-2">Days Held</th>
                          <th className="text-right py-2 px-2">Hold Target</th>
                          <th className="text-left py-2 px-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {positions
                          .sort((a, b) => {
                            const pnlA = ((a.current_price || a.entry_price) - a.entry_price) * a.qty;
                            const pnlB = ((b.current_price || b.entry_price) - b.entry_price) * b.qty;
                            return pnlA - pnlB;
                          })
                          .map((pos) => {
                            const curPrice = pos.current_price || pos.entry_price;
                            const unrealizedPnl = (curPrice - pos.entry_price) * pos.qty;
                            const unrealizedPct = ((curPrice - pos.entry_price) / pos.entry_price) * 100;
                            const isProfit = unrealizedPnl >= 0;
                            const openedDate = new Date(pos.opened_at);
                            const daysHeld = Math.floor((Date.now() - openedDate.getTime()) / (1000 * 60 * 60 * 24));
                            const holdTarget = pos.hold_days || 10;
                            const holdProgress = Math.min(daysHeld / holdTarget, 1);
                            const isNearExpiry = daysHeld >= holdTarget - 1;
                            const isPastExpiry = daysHeld >= holdTarget;
                            return (
                              <tr key={pos.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                <td className="py-2 px-2 text-sm text-slate-400">{formatDate(pos.opened_at)}</td>
                                <td className="py-2 px-2 font-medium text-slate-200">{pos.symbol}</td>
                                <td className="py-2 px-2 text-right font-mono text-slate-300">{pos.qty}</td>
                                <td className="py-2 px-2 text-right font-mono text-slate-400">${formatCurrency(pos.entry_price)}</td>
                                <td className="py-2 px-2 text-right font-mono text-slate-300">${formatCurrency(curPrice)}</td>
                                <td className={`py-2 px-2 text-right font-mono font-bold ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                                  {isProfit ? "+" : ""}${formatCurrency(unrealizedPnl)}
                                </td>
                                <td className={`py-2 px-2 text-right font-mono ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                                  {isProfit ? "+" : ""}{unrealizedPct.toFixed(2)}%
                                </td>
                                <td className="py-2 px-2 text-right text-sm text-slate-400">
                                  <div className="flex items-center justify-end gap-2">
                                    <span>{daysHeld}d</span>
                                    <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          isPastExpiry ? "bg-red-400" : isNearExpiry ? "bg-amber-400" : "bg-emerald-400"
                                        }`}
                                        style={{ width: `${holdProgress * 100}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2 px-2 text-right font-mono text-slate-500">{holdTarget}d</td>
                                <td className="py-2 px-2 text-sm">
                                  {isPastExpiry ? (
                                    <span className="px-2 py-0.5 rounded text-xs bg-red-900/30 text-red-400">Past Hold</span>
                                  ) : isNearExpiry ? (
                                    <span className="px-2 py-0.5 rounded text-xs bg-amber-900/30 text-amber-400">Expiring</span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-xs bg-emerald-900/30 text-emerald-400">Holding</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                  {/* Summary row */}
                  <div className="mt-3 pt-3 border-t border-slate-700/50 flex gap-6 text-xs">
                    <div>
                      <span className="text-slate-500">Total Unrealized:</span>
                      <span className={`ml-2 font-mono font-bold ${
                        positions.reduce((s, p) => s + ((p.current_price || p.entry_price) - p.entry_price) * p.qty, 0) >= 0
                          ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {positions.reduce((s, p) => s + ((p.current_price || p.entry_price) - p.entry_price) * p.qty, 0) >= 0 ? "+" : ""}
                        ${formatCurrency(positions.reduce((s, p) => s + ((p.current_price || p.entry_price) - p.entry_price) * p.qty, 0))}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Deployed:</span>
                      <span className="ml-2 font-mono text-slate-300">
                        ${formatCurrency(positions.reduce((s, p) => s + p.entry_price * p.qty, 0))}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Winners:</span>
                      <span className="ml-2 font-mono text-emerald-400">
                        {positions.filter(p => (p.current_price || p.entry_price) >= p.entry_price).length}
                      </span>
                      <span className="text-slate-600 mx-1">/</span>
                      <span className="text-slate-500">Losers:</span>
                      <span className="ml-2 font-mono text-red-400">
                        {positions.filter(p => (p.current_price || 0) < p.entry_price).length}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Closed Trade History */}
              {trades.length === 0 ? (
                <div className="bg-slate-800/50 rounded-xl p-8 border border-slate-700/50 text-center">
                  <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No closed trades yet — positions will move here when sold</p>
                </div>
              ) : (
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-cyan-400" />
                    Trade History ({trades.length})
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-slate-500 uppercase border-b border-slate-700">
                          <th className="text-left py-2 px-2">Closed</th>
                          <th className="text-left py-2 px-2">Symbol</th>
                          <th className="text-left py-2 px-2">Side</th>
                          <th className="text-right py-2 px-2">Qty</th>
                          <th className="text-right py-2 px-2">Entry</th>
                          <th className="text-right py-2 px-2">Exit</th>
                          <th className="text-right py-2 px-2">P/L</th>
                          <th className="text-right py-2 px-2">P/L %</th>
                          <th className="text-right py-2 px-2">Hold</th>
                          <th className="text-left py-2 px-2">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trades.map((trade) => {
                          const isProfit = trade.pnl >= 0;
                          return (
                            <tr key={trade.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                              <td className="py-2 px-2 text-sm text-slate-400">{formatDate(trade.closed_at)}</td>
                              <td className="py-2 px-2 font-medium text-slate-200">{trade.symbol}</td>
                              <td className="py-2 px-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  trade.side === "long" ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"
                                }`}>
                                  {trade.side.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-right font-mono text-slate-300">{trade.qty}</td>
                              <td className="py-2 px-2 text-right font-mono text-slate-400">${formatCurrency(trade.entry_price)}</td>
                              <td className="py-2 px-2 text-right font-mono text-slate-300">${formatCurrency(trade.exit_price)}</td>
                              <td className={`py-2 px-2 text-right font-mono font-bold ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                                {isProfit ? "+" : ""}${formatCurrency(trade.pnl)}
                              </td>
                              <td className={`py-2 px-2 text-right font-mono ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                                {formatPercent(trade.pnl_pct)}
                              </td>
                              <td className="py-2 px-2 text-right text-sm text-slate-400">
                                {trade.hold_days_actual || "—"}d
                              </td>
                              <td className="py-2 px-2 text-sm text-slate-500">
                                {trade.close_reason ? (
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    trade.close_reason === "take_profit" ? "bg-emerald-900/30 text-emerald-400" :
                                    trade.close_reason === "stop_loss" ? "bg-red-900/30 text-red-400" :
                                    trade.close_reason === "signal_flip" ? "bg-amber-900/30 text-amber-400" :
                                    "bg-slate-700 text-slate-400"
                                  }`}>
                                    {trade.close_reason.replace(/_/g, " ")}
                                  </span>
                                ) : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ===== SIGNALS TAB ===== */}
          {activeTab === "signals" && !loading && !error && (
            <>
              {/* Signal Accuracy */}
              {signalStats && <SignalAccuracyPanel stats={signalStats} />}

              {/* Recent Signals Table */}
              {data?.signals && data.signals.length > 0 ? (
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary-400" />
                    Signal History ({data.signals.length})
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-slate-500 uppercase border-b border-slate-700">
                          <th className="text-left py-2 px-2">Date</th>
                          <th className="text-left py-2 px-2">Symbol</th>
                          <th className="text-left py-2 px-2">Signal</th>
                          <th className="text-right py-2 px-2">Price</th>
                          <th className="text-right py-2 px-2">Confidence</th>
                          <th className="text-left py-2 px-2">Regime</th>
                          <th className="text-center py-2 px-2">5D</th>
                          <th className="text-center py-2 px-2">10D</th>
                          <th className="text-center py-2 px-2">20D</th>
                          <th className="text-right py-2 px-2">5D %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.signals.slice(0, 50).map((sig) => (
                          <tr key={sig.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                            <td className="py-2 px-2 text-sm text-slate-400">{formatDate(sig.generated_at)}</td>
                            <td className="py-2 px-2 font-medium text-slate-200">{sig.symbol}</td>
                            <td className="py-2 px-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                sig.signal === "BUY" ? "bg-emerald-900/50 text-emerald-400" :
                                sig.signal === "SELL" ? "bg-red-900/50 text-red-400" :
                                "bg-slate-700 text-slate-400"
                              }`}>
                                {sig.signal}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-300">${formatCurrency(sig.price_at_signal)}</td>
                            <td className="py-2 px-2 text-right text-sm text-slate-400">
                              {sig.confidence ? `${sig.confidence}%` : "—"}
                            </td>
                            <td className="py-2 px-2 text-sm">
                              <span className={`px-1.5 py-0.5 rounded text-xs ${
                                sig.regime === "bull" ? "bg-emerald-900/30 text-emerald-400" :
                                sig.regime === "bear" ? "bg-red-900/30 text-red-400" :
                                "bg-slate-700 text-slate-400"
                              }`}>
                                {sig.regime || "—"}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              {sig.was_correct_5d === null ? (
                                <Clock className="w-3.5 h-3.5 text-slate-600 mx-auto" />
                              ) : sig.was_correct_5d ? (
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mx-auto" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-red-400 mx-auto" />
                              )}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {sig.was_correct_10d === null ? (
                                <Clock className="w-3.5 h-3.5 text-slate-600 mx-auto" />
                              ) : sig.was_correct_10d ? (
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mx-auto" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-red-400 mx-auto" />
                              )}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {sig.was_correct_20d === null ? (
                                <Clock className="w-3.5 h-3.5 text-slate-600 mx-auto" />
                              ) : sig.was_correct_20d ? (
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mx-auto" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-red-400 mx-auto" />
                              )}
                            </td>
                            <td className={`py-2 px-2 text-right font-mono text-sm ${
                              sig.outcome_5d_pct !== null
                                ? sig.outcome_5d_pct >= 0 ? "text-emerald-400" : "text-red-400"
                                : "text-slate-600"
                            }`}>
                              {sig.outcome_5d_pct !== null ? formatPercent(sig.outcome_5d_pct) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800/50 rounded-xl p-12 border border-slate-700/50 text-center">
                  <Target className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-lg">No signal history yet</p>
                  <p className="text-sm text-slate-600 mt-1">
                    Signals will be recorded by the auto-tracker service
                  </p>
                </div>
              )}
            </>
          )}

          {/* ===== MRE TAB ===== */}
          {activeTab === "mre" && <MREDashboard />}

          {/* ===== UNIVERSE TAB ===== */}
          {activeTab === "universe" && <UniverseTable />}

          {/* ===== OPTIMIZER TAB ===== */}
          {activeTab === "optimizer" && <OptimizerResults />}

          {/* ===== MARKETS TAB ===== */}
          {activeTab === "markets" && (
            <MarketsOverview
              initialSymbol={analyzeSymbol}
              onSymbolConsumed={handleAnalyzeConsumed}
            />
          )}

          {activeTab === "validation" && <ValidationTab />}

        </div>
      </div>

      {/* Signal Analysis Modal */}
      {analyzeModalSymbol && (
        <SignalAnalysisModal
          symbol={analyzeModalSymbol}
          onClose={() => setAnalyzeModalSymbol(null)}
        />
      )}
    </div>
  );
}

// ===== VALIDATION TAB =====

function ValidationTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>("");

  const fetchValidation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/alpaca-validation");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchValidation();
  }, [fetchValidation]);

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-12 border border-slate-700/50 text-center">
        <div className="w-8 h-8 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Fetching Alpaca & Hub positions…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 rounded-xl p-6 border border-red-500/30 text-center">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-red-400 font-medium">Validation Error</p>
        <p className="text-sm text-red-400/70 mt-1">{error}</p>
        <button onClick={fetchValidation} className="mt-3 px-4 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30">
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const syncOk = data.sync_status === "IN_SYNC";
  const accts = data.accounts;
  const comps = data.comparisons || [];

  return (
    <div className="space-y-4">
      {/* Sync Status Banner */}
      <div className={`rounded-xl p-4 border flex items-center justify-between ${
        syncOk
          ? "bg-emerald-900/20 border-emerald-500/30"
          : "bg-red-900/20 border-red-500/30"
      }`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{syncOk ? "✅" : "⚠️"}</span>
          <div>
            <h3 className={`font-bold ${syncOk ? "text-emerald-400" : "text-red-400"}`}>
              {syncOk ? "Positions In Sync" : "Position Mismatch Detected"}
            </h3>
            <p className="text-sm text-slate-400">
              {data.summary.in_both} symbols matched
              {data.summary.only_alpaca > 0 && ` • ${data.summary.only_alpaca} only in Alpaca`}
              {data.summary.only_hub > 0 && ` • ${data.summary.only_hub} only in Hub`}
              {data.summary.qty_mismatches > 0 && ` • ${data.summary.qty_mismatches} qty mismatches`}
              {data.summary.entry_price_diffs > 0 && ` • ${data.summary.entry_price_diffs} entry price diffs`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">Last: {lastRefresh}</span>
          <button onClick={fetchValidation} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs border border-slate-600">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Account Comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-2">Alpaca Account</h4>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Equity</span>
              <span className="font-mono text-slate-200">${accts.alpaca.equity.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cash</span>
              <span className="font-mono text-slate-300">${accts.alpaca.cash.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status</span>
              <span className={`font-medium ${accts.alpaca.status === "ACTIVE" ? "text-emerald-400" : "text-amber-400"}`}>
                {accts.alpaca.status}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-2">Hub Account</h4>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Equity</span>
              <span className="font-mono text-slate-200">${accts.hub.equity.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cash</span>
              <span className="font-mono text-slate-300">${accts.hub.cash.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Baseline</span>
              <span className="font-mono text-slate-300">${accts.hub.starting_capital.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-2">Variance</h4>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Equity Δ</span>
              <span className={`font-mono font-bold ${Math.abs(accts.equity_diff) < 50 ? "text-emerald-400" : "text-amber-400"}`}>
                {accts.equity_diff >= 0 ? "+" : ""}${accts.equity_diff.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Equity Δ %</span>
              <span className={`font-mono ${Math.abs(accts.equity_diff_pct) < 0.1 ? "text-emerald-400" : "text-amber-400"}`}>
                {accts.equity_diff_pct >= 0 ? "+" : ""}{accts.equity_diff_pct.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cash Δ</span>
              <span className="font-mono text-slate-300">
                ${(accts.alpaca.cash - accts.hub.cash).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Position-by-Position Comparison */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
        <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary-400" />
          Position Comparison ({comps.length} symbols)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 uppercase border-b border-slate-700">
                <th className="text-left py-2 px-2">Symbol</th>
                <th className="text-center py-2 px-2">Status</th>
                <th className="text-right py-2 px-2">Alpaca Qty</th>
                <th className="text-right py-2 px-2">Hub Qty</th>
                <th className="text-right py-2 px-2">Alpaca Entry</th>
                <th className="text-right py-2 px-2">Hub Entry</th>
                <th className="text-right py-2 px-2">Alpaca Price</th>
                <th className="text-right py-2 px-2">Hub Price</th>
                <th className="text-right py-2 px-2">Alpaca P/L</th>
                <th className="text-right py-2 px-2">Hub P/L</th>
                <th className="text-right py-2 px-2">P/L Δ</th>
              </tr>
            </thead>
            <tbody>
              {comps.map((c: any) => {
                const pnlDiff = Math.abs(c.alpaca.unrealized_pnl - c.hub.unrealized_pnl);
                const isOk = c.inBoth && c.qtyMatch;
                return (
                  <tr key={c.symbol} className={`border-b border-slate-800 ${!isOk ? "bg-red-900/10" : "hover:bg-slate-800/50"}`}>
                    <td className="py-2 px-2 font-bold text-slate-200">{c.symbol}</td>
                    <td className="py-2 px-2 text-center">
                      {c.onlyAlpaca && <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30">ALPACA ONLY</span>}
                      {c.onlyHub && <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30">HUB ONLY</span>}
                      {c.inBoth && c.qtyMatch && <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">✓ MATCH</span>}
                      {c.inBoth && !c.qtyMatch && <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/20 text-red-400 border border-red-500/30">QTY MISMATCH</span>}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-slate-300">{c.alpaca.qty || "—"}</td>
                    <td className={`py-2 px-2 text-right font-mono ${c.qtyMatch ? "text-slate-300" : "text-red-400 font-bold"}`}>{c.hub.qty || "—"}</td>
                    <td className="py-2 px-2 text-right font-mono text-slate-400">${c.alpaca.entry_price ? c.alpaca.entry_price.toFixed(2) : "—"}</td>
                    <td className={`py-2 px-2 text-right font-mono ${c.entryMatch ? "text-slate-400" : "text-amber-400"}`}>${c.hub.entry_price ? c.hub.entry_price.toFixed(2) : "—"}</td>
                    <td className="py-2 px-2 text-right font-mono text-slate-300">${c.alpaca.current_price ? c.alpaca.current_price.toFixed(2) : "—"}</td>
                    <td className="py-2 px-2 text-right font-mono text-slate-300">${c.hub.current_price ? c.hub.current_price.toFixed(2) : "—"}</td>
                    <td className={`py-2 px-2 text-right font-mono ${c.alpaca.unrealized_pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {c.alpaca.unrealized_pnl >= 0 ? "+" : ""}${c.alpaca.unrealized_pnl.toFixed(2)}
                    </td>
                    <td className={`py-2 px-2 text-right font-mono ${c.hub.unrealized_pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {c.hub.unrealized_pnl >= 0 ? "+" : ""}${c.hub.unrealized_pnl.toFixed(2)}
                    </td>
                    <td className={`py-2 px-2 text-right font-mono font-bold ${pnlDiff < 10 ? "text-emerald-400" : pnlDiff < 50 ? "text-amber-400" : "text-red-400"}`}>
                      ${pnlDiff.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-600 bg-slate-800/80 font-bold">
                <td className="py-2 px-2 text-slate-100">Total</td>
                <td></td>
                <td className="py-2 px-2 text-right font-mono text-slate-300">
                  {comps.reduce((s: number, c: any) => s + c.alpaca.qty, 0)}
                </td>
                <td className="py-2 px-2 text-right font-mono text-slate-300">
                  {comps.reduce((s: number, c: any) => s + c.hub.qty, 0)}
                </td>
                <td></td><td></td><td></td><td></td>
                <td className={`py-2 px-2 text-right font-mono ${comps.reduce((s: number, c: any) => s + c.alpaca.unrealized_pnl, 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {comps.reduce((s: number, c: any) => s + c.alpaca.unrealized_pnl, 0) >= 0 ? "+" : ""}
                  ${comps.reduce((s: number, c: any) => s + c.alpaca.unrealized_pnl, 0).toFixed(2)}
                </td>
                <td className={`py-2 px-2 text-right font-mono ${comps.reduce((s: number, c: any) => s + c.hub.unrealized_pnl, 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {comps.reduce((s: number, c: any) => s + c.hub.unrealized_pnl, 0) >= 0 ? "+" : ""}
                  ${comps.reduce((s: number, c: any) => s + c.hub.unrealized_pnl, 0).toFixed(2)}
                </td>
                <td className="py-2 px-2 text-right font-mono text-slate-400">
                  ${Math.abs(comps.reduce((s: number, c: any) => s + c.alpaca.unrealized_pnl, 0) - comps.reduce((s: number, c: any) => s + c.hub.unrealized_pnl, 0)).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Equity History Chart */}
      {data.equity_history && data.equity_history.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-400" />
            Equity History — Hub vs Alpaca
          </h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.equity_history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => {
                    const dt = new Date(d + "T12:00:00");
                    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  }}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={{ stroke: "#334155" }}
                  tickLine={false}
                  minTickGap={40}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                  width={55}
                  domain={["auto", "auto"]}
                />
                <ChartTooltip
                  contentStyle={{ background: "#1e293b", border: "1px solid #475569", borderRadius: "8px", fontSize: "12px" }}
                  labelFormatter={(d: any) => {
                    const dt = new Date(String(d) + "T12:00:00");
                    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                  }}
                  formatter={(value: any, name: any) => [
                    `$${value?.toLocaleString("en-US", { minimumFractionDigits: 2 }) || "—"}`,
                    name === "alpaca_equity" ? "Alpaca" : "Hub"
                  ]}
                />
                <ChartRefLine y={100000} stroke="#64748b" strokeDasharray="6 4" strokeOpacity={0.5} />
                <Line
                  type="monotone"
                  dataKey="alpaca_equity"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                  name="alpaca_equity"
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="hub_equity"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  dot={false}
                  name="hub_equity"
                  connectNulls
                  strokeDasharray="4 2"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-2 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-sky-400 rounded" />
              <span className="text-slate-400">Alpaca</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-violet-400 rounded" style={{ borderBottom: "2px dashed" }} />
              <span className="text-slate-400">Hub</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-slate-500 rounded" />
              <span className="text-slate-400">$100K baseline</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Alpaca Orders */}
      {data.recent_orders && data.recent_orders.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            Recent Alpaca Orders ({data.recent_orders.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 uppercase border-b border-slate-700">
                  <th className="text-left py-2 px-2">Time</th>
                  <th className="text-left py-2 px-2">Symbol</th>
                  <th className="text-left py-2 px-2">Side</th>
                  <th className="text-right py-2 px-2">Qty</th>
                  <th className="text-right py-2 px-2">Fill Price</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_orders.map((order: any, idx: number) => (
                  <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="py-1.5 px-2 text-slate-400">
                      {order.filled_at ? new Date(order.filled_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="py-1.5 px-2 font-medium text-slate-200">{order.symbol}</td>
                    <td className="py-1.5 px-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        order.side === "buy" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                      }`}>
                        {order.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono text-slate-300">{order.qty}</td>
                    <td className="py-1.5 px-2 text-right font-mono text-slate-300">
                      {order.filled_price ? `$${order.filled_price.toFixed(2)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
