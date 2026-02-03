"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Wallet,
  BarChart3,
  Target,
  Activity,
  Clock,
  DollarSign,
  Percent,
  AlertCircle,
} from "lucide-react";

interface Position {
  symbol: string;
  quantity: number;
  entry_price: number;
  entry_time: string;
  strategy: string;
  current_price: number;
  unrealized_pnl: number;
}

interface Trade {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  timestamp: string;
  strategy: string;
  pnl: number;
  fees: number;
  notes: string;
}

interface PortfolioState {
  cash: number;
  positions: Record<string, Position>;
  trade_counter: number;
  last_updated: string;
}

interface TradingStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  bestTrade: number;
  worstTrade: number;
}

const INITIAL_CAPITAL = 10000;

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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
  const trendColor =
    trend === "up"
      ? "text-emerald-400"
      : trend === "down"
      ? "text-red-400"
      : "text-slate-400";

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${trendColor}`} />
        <span className="text-xs text-slate-500 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className={`text-2xl font-bold ${trendColor}`}>{value}</p>
      {subValue && <p className="text-sm text-slate-500 mt-1">{subValue}</p>}
    </div>
  );
}

function PositionCard({ position }: { position: Position }) {
  const pnl = (position.current_price - position.entry_price) * position.quantity;
  const pnlPercent =
    ((position.current_price - position.entry_price) / position.entry_price) *
    100;
  const isProfit = pnl >= 0;

  return (
    <div
      className={`rounded-xl p-4 border ${
        isProfit
          ? "bg-emerald-900/20 border-emerald-500/30"
          : "bg-red-900/20 border-red-500/30"
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-lg text-slate-100">{position.symbol}</h3>
          <p className="text-xs text-slate-500">{position.strategy}</p>
        </div>
        <div className={`text-right ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
          <p className="font-bold">{isProfit ? "+" : ""}${formatCurrency(pnl)}</p>
          <p className="text-sm">{formatPercent(pnlPercent)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-slate-500">Quantity</p>
          <p className="text-slate-200 font-mono">{position.quantity.toFixed(6)}</p>
        </div>
        <div>
          <p className="text-slate-500">Entry</p>
          <p className="text-slate-200 font-mono">${formatCurrency(position.entry_price)}</p>
        </div>
        <div>
          <p className="text-slate-500">Current</p>
          <p className="text-slate-200 font-mono">${formatCurrency(position.current_price)}</p>
        </div>
        <div>
          <p className="text-slate-500">Entered</p>
          <p className="text-slate-400 text-xs">{formatTime(position.entry_time)}</p>
        </div>
      </div>
    </div>
  );
}

function TradeRow({ trade }: { trade: Trade }) {
  const isBuy = trade.side === "buy";
  const hasPnl = trade.pnl !== 0;
  const isProfit = trade.pnl > 0;

  return (
    <tr className="border-b border-slate-800 hover:bg-slate-800/50">
      <td className="py-3 px-2 text-sm text-slate-400">
        {formatTime(trade.timestamp)}
      </td>
      <td className="py-3 px-2 font-medium text-slate-200">{trade.symbol}</td>
      <td className="py-3 px-2">
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            isBuy
              ? "bg-emerald-900/50 text-emerald-400"
              : "bg-red-900/50 text-red-400"
          }`}
        >
          {trade.side.toUpperCase()}
        </span>
      </td>
      <td className="py-3 px-2 text-right font-mono text-slate-300">
        {trade.quantity.toFixed(6)}
      </td>
      <td className="py-3 px-2 text-right font-mono text-slate-300">
        ${formatCurrency(trade.price)}
      </td>
      <td
        className={`py-3 px-2 text-right font-mono ${
          hasPnl
            ? isProfit
              ? "text-emerald-400"
              : "text-red-400"
            : "text-slate-600"
        }`}
      >
        {hasPnl
          ? `${isProfit ? "+" : ""}$${formatCurrency(trade.pnl)}`
          : "—"}
      </td>
      <td className="py-3 px-2 text-sm text-slate-500">{trade.strategy}</td>
    </tr>
  );
}

export default function TradingPage() {
  const [portfolio, setPortfolio] = useState<PortfolioState | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [portfolioRes, tradesRes] = await Promise.all([
        fetch("/data/trading/portfolio.json"),
        fetch("/data/trading/trades.json"),
      ]);

      if (portfolioRes.ok) {
        const portfolioData = await portfolioRes.json();
        setPortfolio(portfolioData);
      } else {
        // Default state if no data
        setPortfolio({
          cash: INITIAL_CAPITAL,
          positions: {},
          trade_counter: 0,
          last_updated: new Date().toISOString(),
        });
      }

      if (tradesRes.ok) {
        const tradesData = await tradesRes.json();
        setTrades(tradesData);
      } else {
        setTrades([]);
      }

      setLastRefresh(new Date());
    } catch (err) {
      setError("Failed to load trading data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate stats
  const calculateStats = (): TradingStats => {
    const closedTrades = trades.filter((t) => t.side === "sell" && t.pnl !== 0);
    const winningTrades = closedTrades.filter((t) => t.pnl > 0);
    const losingTrades = closedTrades.filter((t) => t.pnl < 0);
    const totalPnl = closedTrades.reduce((sum, t) => sum + t.pnl, 0);

    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate:
        closedTrades.length > 0
          ? (winningTrades.length / closedTrades.length) * 100
          : 0,
      totalPnl,
      avgPnl: closedTrades.length > 0 ? totalPnl / closedTrades.length : 0,
      bestTrade:
        closedTrades.length > 0 ? Math.max(...closedTrades.map((t) => t.pnl)) : 0,
      worstTrade:
        closedTrades.length > 0 ? Math.min(...closedTrades.map((t) => t.pnl)) : 0,
    };
  };

  const stats = calculateStats();
  const positions = portfolio ? Object.values(portfolio.positions) : [];
  const positionsValue = positions.reduce(
    (sum, p) => sum + p.current_price * p.quantity,
    0
  );
  const totalEquity = (portfolio?.cash || INITIAL_CAPITAL) + positionsValue;
  const totalPnl = totalEquity - INITIAL_CAPITAL;
  const totalPnlPercent = (totalPnl / INITIAL_CAPITAL) * 100;

  if (loading && !portfolio) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary-400" />
              Paper Trading
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              MoonDev Strategies • Simulated Trading
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
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

        {error && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-300">{error}</span>
          </div>
        )}

        {/* Main Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Wallet}
            label="Total Equity"
            value={`$${formatCurrency(totalEquity)}`}
            subValue={`Started: $${formatCurrency(INITIAL_CAPITAL)}`}
            trend={totalPnl >= 0 ? "up" : "down"}
          />
          <StatCard
            icon={totalPnl >= 0 ? TrendingUp : TrendingDown}
            label="Total P/L"
            value={`${totalPnl >= 0 ? "+" : ""}$${formatCurrency(totalPnl)}`}
            subValue={formatPercent(totalPnlPercent)}
            trend={totalPnl >= 0 ? "up" : "down"}
          />
          <StatCard
            icon={DollarSign}
            label="Cash Available"
            value={`$${formatCurrency(portfolio?.cash || 0)}`}
            trend="neutral"
          />
          <StatCard
            icon={Target}
            label="Win Rate"
            value={`${stats.winRate.toFixed(1)}%`}
            subValue={`${stats.winningTrades}W / ${stats.losingTrades}L`}
            trend={stats.winRate >= 50 ? "up" : "down"}
          />
        </div>

        {/* Positions and Stats Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Open Positions */}
          <div className="lg:col-span-2 bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
            <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-400" />
              Open Positions ({positions.length})
            </h2>
            {positions.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No open positions</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {positions.map((position) => (
                  <PositionCard key={position.symbol} position={position} />
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
            <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Percent className="w-5 h-5 text-amber-400" />
              Performance
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                <span className="text-slate-400">Total Trades</span>
                <span className="font-semibold text-slate-200">
                  {stats.totalTrades}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                <span className="text-slate-400">Avg Trade P/L</span>
                <span
                  className={`font-semibold ${
                    stats.avgPnl >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  ${formatCurrency(stats.avgPnl)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                <span className="text-slate-400">Best Trade</span>
                <span className="font-semibold text-emerald-400">
                  +${formatCurrency(stats.bestTrade)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                <span className="text-slate-400">Worst Trade</span>
                <span className="font-semibold text-red-400">
                  ${formatCurrency(stats.worstTrade)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-400">Positions Value</span>
                <span className="font-semibold text-slate-200">
                  ${formatCurrency(positionsValue)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Trade History */}
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
          <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            Trade History
          </h2>
          {trades.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No trades yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-slate-400 text-sm border-b border-slate-700">
                    <th className="text-left py-3 px-2">Time</th>
                    <th className="text-left py-3 px-2">Symbol</th>
                    <th className="text-left py-3 px-2">Side</th>
                    <th className="text-right py-3 px-2">Qty</th>
                    <th className="text-right py-3 px-2">Price</th>
                    <th className="text-right py-3 px-2">P/L</th>
                    <th className="text-left py-3 px-2">Strategy</th>
                  </tr>
                </thead>
                <tbody>
                  {trades
                    .slice()
                    .reverse()
                    .slice(0, 20)
                    .map((trade) => (
                      <TradeRow key={trade.id} trade={trade} />
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Strategies Info */}
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">
            Active Strategies
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-slate-900/50 rounded-lg p-4">
              <h3 className="font-medium text-emerald-400 mb-2">Buy The Dip</h3>
              <p className="text-sm text-slate-400">
                Buys when price dips 5%+ from recent high. Exits at 3% profit or
                3% stop loss.
              </p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <h3 className="font-medium text-blue-400 mb-2">Trend Following</h3>
              <p className="text-sm text-slate-400">
                SMA crossover strategy with ATR-based trailing stops. Rides
                momentum trends.
              </p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <h3 className="font-medium text-purple-400 mb-2">Breakout Wick</h3>
              <p className="text-sm text-slate-400">
                Volume + wick pattern analysis. Enters on confirmed breakouts
                above resistance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
