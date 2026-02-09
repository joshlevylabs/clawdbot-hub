"use client";

import { useMemo } from "react";
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
  /** Compact mode for embedding in smaller spaces (ActionsDashboard, Lever) */
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
  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!snapshots || snapshots.length === 0) return [];

    const startEquity = snapshots[0].equity || startingCapital;
    const startSpy = snapshots[0].spy_baseline || snapshots[0].spy_price || 1;

    return snapshots.map((s) => {
      const portfolioReturn = ((s.equity - startEquity) / startEquity) * 100;
      const spyReturn = s.spy_price
        ? ((s.spy_price - startSpy) / startSpy) * 100
        : 0;

      return {
        date: s.date,
        dateLabel: new Date(s.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        portfolio: Math.round(portfolioReturn * 100) / 100,
        spy: Math.round(spyReturn * 100) / 100,
        alpha: Math.round((portfolioReturn - spyReturn) * 100) / 100,
      };
    });
  }, [snapshots, startingCapital]);

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
              Performance chart appears after 2+ daily snapshots
            </p>
            <p className="text-slate-600 text-xs mt-1">
              Snapshots are captured every 5 minutes during market hours
            </p>
          </div>
        </div>
      </div>
    );
  }

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
      </div>

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
      <div className={compact ? "h-40" : "h-64"}>
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

      {/* Footer — days tracking */}
      <div className="flex items-center justify-between mt-2 text-xs text-slate-600">
        <span>{chartData.length} days tracked</span>
        <span>
          {chartData[0]?.dateLabel} → {latestData?.dateLabel}
        </span>
      </div>
    </div>
  );
}
