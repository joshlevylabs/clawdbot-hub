"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface PortfolioSnapshot {
  date: string;
  equity: number;
  spy_price: number | null;
  spy_baseline?: number | null;
  cash?: number;
  positions_value?: number;
  daily_pnl?: number | null;
  total_pnl?: number | null;
  total_pnl_pct?: number | null;
}

interface PerformanceChartProps {
  snapshots: PortfolioSnapshot[];
  /** Compact mode for embedding in smaller spaces */
  compact?: boolean;
  /** Starting capital for % calculations */
  startingCapital?: number;
  /** Class name override */
  className?: string;
}

interface ChartDataPoint {
  date: string;
  dateLabel: string;
  portfolio: number;
  spy: number;
  alpha: number;
}

type TimeRange = "1D" | "1W" | "1M" | "3M" | "1Y";

const TIME_RANGE_MS: Record<TimeRange, number> = {
  "1D": 1 * 24 * 60 * 60 * 1000,
  "1W": 7 * 24 * 60 * 60 * 1000,
  "1M": 30 * 24 * 60 * 60 * 1000,
  "3M": 90 * 24 * 60 * 60 * 1000,
  "1Y": 365 * 24 * 60 * 60 * 1000,
};

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  "1D": "1 day",
  "1W": "1 week",
  "1M": "1 month",
  "3M": "3 months",
  "1Y": "1 year",
};

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const portfolio = payload.find((p: { dataKey: string }) => p.dataKey === "portfolio")?.value ?? 0;
  const spy = payload.find((p: { dataKey: string }) => p.dataKey === "spy")?.value ?? 0;
  const alpha = portfolio - spy;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl text-sm">
      <p className="text-slate-400 mb-2 font-medium">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
            Portfolio
          </span>
          <span className={portfolio >= 0 ? "text-emerald-400 font-mono" : "text-red-400 font-mono"}>
            {formatPercent(portfolio)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            S&P 500
          </span>
          <span className={spy >= 0 ? "text-emerald-400 font-mono" : "text-red-400 font-mono"}>
            {formatPercent(spy)}
          </span>
        </div>
        <div className="border-t border-slate-700 pt-1 mt-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500">Alpha</span>
            <span className={`font-mono font-bold ${alpha >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatPercent(alpha)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PerformanceChart({
  snapshots,
  compact = false,
  startingCapital = 100000,
  className = "",
}: PerformanceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("1D");

  // Detect if snapshot has intraday timestamp (contains "T")
  const isIntraday = (s: PortfolioSnapshot) => s.date.includes("T");

  // Filter snapshots by selected time range
  const filteredSnapshots = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return [];

    const cutoff = Date.now() - TIME_RANGE_MS[timeRange];
    
    // For 1D view, show intraday snapshots but anchor to previous day's close
    if (timeRange === "1D") {
      const intradayOnly = snapshots.filter(isIntraday);
      if (intradayOnly.length >= 2) {
        // Find last non-intraday (daily) snapshot to use as starting anchor
        const dailySnapshots = snapshots.filter((s) => !isIntraday(s));
        const lastDaily = dailySnapshots.length > 0 ? dailySnapshots[dailySnapshots.length - 1] : null;
        // Prepend the previous day's close so chart starts from correct baseline
        return lastDaily ? [lastDaily, ...intradayOnly] : intradayOnly;
      }
    }
    
    const filtered = snapshots.filter((s) => {
      const dateStr = s.date.includes("T") ? s.date : s.date + "T00:00";
      return new Date(dateStr).getTime() >= cutoff;
    });

    return filtered.length >= 2 ? filtered : snapshots;
  }, [snapshots, timeRange]);

  // Whether we're showing all data because the range had insufficient data
  const isShowingAllData = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return false;
    const cutoff = Date.now() - TIME_RANGE_MS[timeRange];
    const filtered = snapshots.filter((s) => {
      const dateStr = s.date.includes("T") ? s.date : s.date + "T00:00";
      return new Date(dateStr).getTime() >= cutoff;
    });
    return filtered.length < 2 && snapshots.length >= 2;
  }, [snapshots, timeRange]);

  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!filteredSnapshots || filteredSnapshots.length === 0) return [];

    const startEquity = filteredSnapshots[0].equity || startingCapital;
    const startSpy = filteredSnapshots[0].spy_baseline || filteredSnapshots[0].spy_price || 1;

    return filteredSnapshots.map((s) => {
      const portfolioReturn = ((s.equity - startEquity) / startEquity) * 100;
      const spyReturn = s.spy_price
        ? ((s.spy_price - startSpy) / startSpy) * 100
        : 0;

      // Format label based on whether it's intraday
      let dateLabel: string;
      if (s.date.includes("T")) {
        const ts = new Date(s.date);
        if (timeRange === "1D") {
          dateLabel = ts.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        } else {
          dateLabel = `${ts.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${ts.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
        }
      } else {
        dateLabel = new Date(s.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }

      return {
        date: s.date,
        dateLabel,
        portfolio: Math.round(portfolioReturn * 100) / 100,
        spy: Math.round(spyReturn * 100) / 100,
        alpha: Math.round((portfolioReturn - spyReturn) * 100) / 100,
      };
    });
  }, [filteredSnapshots, startingCapital, timeRange]);

  // Summary stats
  const latestData = chartData[chartData.length - 1];
  const portfolioReturn = latestData?.portfolio ?? 0;
  const spyReturn = latestData?.spy ?? 0;
  const alpha = portfolioReturn - spyReturn;
  const beating = alpha >= 0;

  // Not enough data
  if (chartData.length < 2) {
    return (
      <div className={`bg-slate-800/50 rounded-xl border border-slate-700/50 ${compact ? "p-4" : "p-6"} ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-5 h-5 text-primary-400" />
          <h3 className={`font-semibold text-slate-100 ${compact ? "text-sm" : "text-base"}`}>
            Performance vs S&P 500
          </h3>
        </div>
        <div className="flex items-center justify-center py-8 text-center">
          <div>
            <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">
              Performance chart appears after 2+ snapshots
            </p>
            <p className="text-slate-600 text-xs mt-1">
              Snapshots are captured every 5 minutes during market hours
            </p>
          </div>
        </div>
      </div>
    );
  }

  const timeRanges: TimeRange[] = compact
    ? ["1W", "1M", "3M"]
    : ["1D", "1W", "1M", "3M", "1Y"];

  return (
    <div className={`bg-slate-800/50 rounded-xl border border-slate-700/50 ${compact ? "p-3" : "p-4"} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {beating ? (
            <TrendingUp className={`${compact ? "w-4 h-4" : "w-5 h-5"} text-emerald-400`} />
          ) : (
            <TrendingDown className={`${compact ? "w-4 h-4" : "w-5 h-5"} text-red-400`} />
          )}
          <h3 className={`font-semibold text-slate-100 ${compact ? "text-sm" : "text-base"}`}>
            Performance vs S&P 500
          </h3>
        </div>

        {/* Timeline selector */}
        <div className="flex gap-1 bg-slate-900/50 rounded-lg p-0.5">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                timeRange === range
                  ? "bg-primary-600 text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Insufficient data notice */}
      {isShowingAllData && (
        <div className="mb-3 px-3 py-1.5 bg-amber-900/20 border border-amber-700/30 rounded-lg text-xs text-amber-400">
          Not enough data for {TIME_RANGE_LABELS[timeRange]} — showing all available data
        </div>
      )}

      {/* Summary Stats Bar */}
      <div className={`grid grid-cols-3 gap-3 mb-3 ${compact ? "text-xs" : "text-sm"}`}>
        <div className="bg-slate-900/50 rounded-lg p-2 text-center">
          <p className="text-slate-500 text-xs">Portfolio</p>
          <p className={`font-bold font-mono ${portfolioReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatPercent(portfolioReturn)}
          </p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-2 text-center">
          <p className="text-slate-500 text-xs">S&P 500</p>
          <p className={`font-bold font-mono ${spyReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {formatPercent(spyReturn)}
          </p>
        </div>
        <div className={`rounded-lg p-2 text-center ${beating ? "bg-emerald-900/30" : "bg-red-900/30"}`}>
          <p className="text-slate-500 text-xs">Alpha</p>
          <p className={`font-bold font-mono ${beating ? "text-emerald-400" : "text-red-400"}`}>
            {formatPercent(alpha)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className={compact ? "h-40" : "h-64 lg:h-96"}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="spyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fill: "#64748b", fontSize: compact ? 10 : 12 }}
              axisLine={{ stroke: "#334155" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: compact ? 10 : 12 }}
              axisLine={{ stroke: "#334155" }}
              tickLine={false}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
            {!compact && (
              <Legend
                verticalAlign="top"
                height={30}
                formatter={(value: string) => (
                  <span className="text-xs text-slate-400">{value}</span>
                )}
              />
            )}
            <Area
              type="monotone"
              dataKey="spy"
              name="S&P 500"
              stroke="#fbbf24"
              strokeWidth={1.5}
              fill="url(#spyGradient)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="portfolio"
              name="Portfolio"
              stroke="#818cf8"
              strokeWidth={2.5}
              fill="url(#portfolioGradient)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 text-xs text-slate-600">
        <span>{chartData.length} snapshots ({TIME_RANGE_LABELS[timeRange]})</span>
        <span>
          {chartData[0]?.dateLabel} → {latestData?.dateLabel}
        </span>
      </div>
    </div>
  );
}
