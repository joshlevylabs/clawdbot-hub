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
  LineChart,
  Download,
  Target,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  Database,
} from "lucide-react";
import ActionsDashboard from "@/components/ActionsDashboard";
import PerformanceChart from "@/components/PerformanceChart";

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

interface PaperTradingData {
  positions: PaperPosition[];
  trades: PaperTrade[];
  snapshots: PortfolioSnapshot[];
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

// ===== Main Page =====

export default function TradingPage() {
  const [data, setData] = useState<PaperTradingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<"supabase" | "static">("supabase");
  const [marketStatus] = useState(getMarketStatus());
  const [activeTab, setActiveTab] = useState<"overview" | "trades" | "signals">("overview");

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 p-6 flex items-center justify-center">
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-300">{error}</p>
          <button onClick={loadData} className="mt-4 px-4 py-2 bg-primary-600 rounded-lg text-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const config = data?.config;
  const positions = data?.positions || [];
  const trades = data?.trades || [];
  const snapshots = data?.snapshots || [];
  const signalStats = data?.signalStats;
  const startingCapital = config?.starting_capital || 100000;
  const cash = config?.current_cash || 100000;
  const positionsValue = positions.reduce((sum, p) => sum + p.qty * (p.current_price || p.entry_price), 0);
  const equity = cash + positionsValue;
  const totalPnl = equity - startingCapital;
  const totalPnlPct = (totalPnl / startingCapital) * 100;

  // Trade stats
  const winningTrades = trades.filter((t) => t.pnl > 0);
  const losingTrades = trades.filter((t) => t.pnl < 0);
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
  const totalRealizedPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const avgWin = winningTrades.length > 0 ? winningTrades.reduce((s, t) => s + t.pnl, 0) / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((s, t) => s + t.pnl, 0) / losingTrades.length) : 0;
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;

  return (
    <div className="min-h-screen bg-slate-900 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary-400" />
              Paper Trading Dashboard
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                dataSource === "supabase"
                  ? "bg-emerald-900/50 text-emerald-400"
                  : "bg-amber-900/50 text-amber-400"
              }`}>
                <Database className="w-3 h-3" />
                {dataSource === "supabase" ? "Live (Supabase)" : "Static (JSON)"}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                marketStatus.open
                  ? "bg-emerald-900/50 text-emerald-400"
                  : "bg-amber-900/50 text-amber-400"
              }`}>
                {marketStatus.open ? "🟢 " : "🔴 "}{marketStatus.message}
              </span>
              {config?.auto_trade && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary-900/50 text-primary-400">
                  <Zap className="w-3 h-3 inline" /> Auto-Trade ON
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tab Nav */}
        <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 w-fit">
          {(["overview", "trades", "signals"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                activeTab === tab
                  ? "bg-primary-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ===== OVERVIEW TAB ===== */}
        {activeTab === "overview" && (
          <>
            {/* Portfolio Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={Wallet}
                label="Total Equity"
                value={`$${formatCurrency(equity)}`}
                subValue={`Started: $${formatCurrency(startingCapital)}`}
                trend={totalPnl >= 0 ? "up" : "down"}
              />
              <StatCard
                icon={totalPnl >= 0 ? TrendingUp : TrendingDown}
                label="Total P/L"
                value={`${totalPnl >= 0 ? "+" : ""}$${formatCurrency(totalPnl)}`}
                subValue={formatPercent(totalPnlPct)}
                trend={totalPnl >= 0 ? "up" : "down"}
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

            {/* Actions Dashboard (MRE Signals) */}
            <ActionsDashboard
              positions={legacyPositions}
              cash={cash}
              tradingEnabled={true}
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

            {/* Open Positions */}
            {positions.length > 0 && (
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
                        <th className="text-right py-2 px-2">Qty</th>
                        <th className="text-right py-2 px-2">Entry</th>
                        <th className="text-right py-2 px-2">Current</th>
                        <th className="text-right py-2 px-2">P/L</th>
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

                        return (
                          <tr key={pos.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                            <td className="py-3 px-2">
                              <span className="font-bold text-slate-100">{pos.symbol}</span>
                              {pos.signal_regime && (
                                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                                  pos.signal_regime === "bull" ? "bg-emerald-900/50 text-emerald-400" :
                                  pos.signal_regime === "bear" ? "bg-red-900/50 text-red-400" :
                                  "bg-slate-700 text-slate-400"
                                }`}>
                                  {pos.signal_regime}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-right font-mono text-slate-300">{pos.qty}</td>
                            <td className="py-3 px-2 text-right font-mono text-slate-400">${formatCurrency(pos.entry_price)}</td>
                            <td className="py-3 px-2 text-right font-mono text-slate-300">${formatCurrency(currentPrice)}</td>
                            <td className={`py-3 px-2 text-right font-mono ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                              {isProfit ? "+" : ""}${formatCurrency(unrealizedPnl)}
                              <br /><span className="text-xs">{formatPercent(unrealizedPnlPct)}</span>
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
                              {pos.auto_tracked ? (
                                <Zap className="w-4 h-4 text-primary-400 mx-auto" />
                              ) : (
                                <span className="text-xs text-slate-600">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Signal Accuracy */}
            {signalStats && <SignalAccuracyPanel stats={signalStats} />}
          </>
        )}

        {/* ===== TRADES TAB ===== */}
        {activeTab === "trades" && (
          <>
            {trades.length === 0 ? (
              <div className="bg-slate-800/50 rounded-xl p-12 border border-slate-700/50 text-center">
                <Clock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-lg">No closed trades yet</p>
                <p className="text-sm text-slate-600 mt-1">
                  Trades will appear here once positions are opened and closed
                </p>
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
        {activeTab === "signals" && (
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
      </div>
    </div>
  );
}
