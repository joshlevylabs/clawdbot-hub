"use client";

import { useState, useEffect } from "react";
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
  AlertCircle,
  ShieldAlert,
} from "lucide-react";

interface Position {
  symbol: string;
  qty: number;
  entry_price: number;
  current_price: number;
  market_value: number;
  cost_basis: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  side: string;
  is_inverse?: boolean;
  hedging?: string;
}

interface Trade {
  symbol: string;
  side: string;
  qty: number;
  price: number;
  filled_at: string;
  status: string;
}

interface AccountInfo {
  equity: number;
  cash: number;
  buying_power: number;
  portfolio_value: number;
  pnl_today: number;
  pnl_today_pct: number;
}

interface PortfolioData {
  updated_at: string;
  account: AccountInfo;
  positions: Position[];
  recent_trades: Trade[];
  strategy: string;
  summary: {
    total_positions: number;
    total_invested: number;
    total_unrealized_pnl: number;
    total_unrealized_pnl_pct: number;
    cash_remaining: number;
  };
}

const INITIAL_CAPITAL = 100000;

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
  const isProfit = position.unrealized_pnl >= 0;

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
          <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
            {position.symbol}
            {position.is_inverse && (
              <span className="text-xs bg-amber-600/30 text-amber-400 px-2 py-0.5 rounded">
                INVERSE
              </span>
            )}
          </h3>
          {position.hedging && (
            <p className="text-xs text-slate-500">Hedging {position.hedging}</p>
          )}
        </div>
        <div className={`text-right ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
          <p className="font-bold">
            {isProfit ? "+" : ""}${formatCurrency(position.unrealized_pnl)}
          </p>
          <p className="text-sm">{formatPercent(position.unrealized_pnl_pct)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-slate-500">Shares</p>
          <p className="text-slate-200 font-mono">{position.qty.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-slate-500">Avg Entry</p>
          <p className="text-slate-200 font-mono">${formatCurrency(position.entry_price)}</p>
        </div>
        <div>
          <p className="text-slate-500">Current</p>
          <p className="text-slate-200 font-mono">${formatCurrency(position.current_price)}</p>
        </div>
        <div>
          <p className="text-slate-500">Market Value</p>
          <p className="text-slate-200 font-mono">${formatCurrency(position.market_value)}</p>
        </div>
      </div>
    </div>
  );
}

function TradeRow({ trade }: { trade: Trade }) {
  const isBuy = trade.side === "buy";

  return (
    <tr className="border-b border-slate-800 hover:bg-slate-800/50">
      <td className="py-3 px-2 text-sm text-slate-400">
        {formatTime(trade.filled_at)}
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
        {trade.qty.toLocaleString()}
      </td>
      <td className="py-3 px-2 text-right font-mono text-slate-300">
        ${formatCurrency(trade.price)}
      </td>
      <td className="py-3 px-2">
        <span className={`text-xs px-2 py-1 rounded ${
          trade.status === 'filled' 
            ? 'bg-emerald-900/50 text-emerald-400' 
            : 'bg-slate-700 text-slate-400'
        }`}>
          {trade.status}
        </span>
      </td>
    </tr>
  );
}

export default function TradingPage() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/data/portfolio.json");

      if (res.ok) {
        const data = await res.json();
        setPortfolio(data);
      } else {
        setError("Portfolio data not found");
      }

      setLastRefresh(new Date());
    } catch (err) {
      setError("Failed to load portfolio data");
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

  if (loading && !portfolio) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  const account = portfolio?.account;
  const positions = portfolio?.positions || [];
  const trades = portfolio?.recent_trades || [];
  const summary = portfolio?.summary;

  const totalPnl = account ? account.equity - INITIAL_CAPITAL : 0;
  const totalPnlPercent = (totalPnl / INITIAL_CAPITAL) * 100;

  return (
    <div className="min-h-screen bg-slate-900 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary-400" />
              Paper Trading Portfolio
            </h1>
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              {portfolio?.strategy || "Alpaca Paper Trading"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              Updated {portfolio?.updated_at ? formatTime(portfolio.updated_at) : lastRefresh.toLocaleTimeString()}
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
            value={`$${formatCurrency(account?.equity || 0)}`}
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
            label="Today's P/L"
            value={`${(account?.pnl_today || 0) >= 0 ? "+" : ""}$${formatCurrency(account?.pnl_today || 0)}`}
            subValue={formatPercent(account?.pnl_today_pct || 0)}
            trend={(account?.pnl_today || 0) >= 0 ? "up" : "down"}
          />
          <StatCard
            icon={Percent}
            label="Buying Power"
            value={`$${formatCurrency(account?.buying_power || 0)}`}
            subValue={`Cash: $${formatCurrency(account?.cash || 0)}`}
            trend="neutral"
          />
        </div>

        {/* Strategy Banner */}
        <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-300">Inverse ETF Hedge Strategy</h3>
              <p className="text-sm text-amber-200/70 mt-1">
                Positions in inverse ETFs (GLL, SH, SQQQ) to hedge against market downturns. 
                These profit when their underlying indices decline.
              </p>
            </div>
          </div>
        </div>

        {/* Positions Grid */}
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
          <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary-400" />
            Open Positions ({positions.length})
          </h2>
          {positions.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No open positions</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {positions.map((position) => (
                <PositionCard key={position.symbol} position={position} />
              ))}
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
            <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Percent className="w-5 h-5 text-cyan-400" />
              Position Summary
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-xs text-slate-500 uppercase">Total Invested</p>
                <p className="text-lg font-bold text-slate-200">${formatCurrency(summary.total_invested)}</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-xs text-slate-500 uppercase">Unrealized P/L</p>
                <p className={`text-lg font-bold ${summary.total_unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {summary.total_unrealized_pnl >= 0 ? '+' : ''}${formatCurrency(summary.total_unrealized_pnl)}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-xs text-slate-500 uppercase">Unrealized %</p>
                <p className={`text-lg font-bold ${summary.total_unrealized_pnl_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatPercent(summary.total_unrealized_pnl_pct)}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-xs text-slate-500 uppercase">Cash Balance</p>
                <p className={`text-lg font-bold ${summary.cash_remaining >= 0 ? 'text-slate-200' : 'text-amber-400'}`}>
                  ${formatCurrency(summary.cash_remaining)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recent Trades */}
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
          <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            Recent Trades
          </h2>
          {trades.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No recent trades</p>
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
                    <th className="text-left py-3 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.slice(0, 20).map((trade, idx) => (
                    <TradeRow key={`${trade.symbol}-${trade.filled_at}-${idx}`} trade={trade} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ETF Info */}
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">
            Inverse ETF Reference
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-slate-900/50 rounded-lg p-4">
              <h3 className="font-medium text-amber-400 mb-2">GLL — Gold Short</h3>
              <p className="text-sm text-slate-400">
                2x inverse gold ETF. Profits when gold prices decline. Hedges GLD exposure.
              </p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <h3 className="font-medium text-amber-400 mb-2">SH — S&P 500 Short</h3>
              <p className="text-sm text-slate-400">
                1x inverse S&P 500 ETF. Profits when SPY declines. Direct hedge against market.
              </p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <h3 className="font-medium text-amber-400 mb-2">SQQQ — Nasdaq 3x Short</h3>
              <p className="text-sm text-slate-400">
                3x inverse Nasdaq-100 ETF. Profits when QQQ/tech declines. High leverage.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
