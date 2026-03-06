"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  LineChart,
  ComposedChart,
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

interface PerformanceChartProps {
  snapshots: PortfolioSnapshot[];
  /** Intraday snapshots for fine-grained 1D/1W views */
  intradaySnapshots?: IntradaySnapshot[];
  /** Agent portfolio snapshots for comparison lines */
  agentSnapshots?: Record<string, Array<{ date: string; return: number; equity?: number }>>;
  /** Compact mode for embedding in smaller spaces */
  compact?: boolean;
  /** Starting capital for % calculations */
  startingCapital?: number;
  /** Class name override */
  className?: string;
  /** Override the default time range (defaults to "1D") */
  defaultTimeRange?: TimeRange;
}

interface ChartDataPoint {
  date: string;
  dateLabel: string;
  portfolio: number;
  spy: number;
  alpha: number;
  chris?: number;
  buffett?: number;
  schiff?: number;
  pal?: number;
  lynch?: number;
  dalio?: number;
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

// Agent configuration with their theme colors
const AGENT_CONFIG = {
  chris: { key: 'chris', name: 'Chris', color: '#f59e0b' },
  buffett: { key: 'buffett', name: 'Buffett', color: '#10b981' },
  schiff: { key: 'schiff', name: 'Schiff', color: '#eab308' },
  pal: { key: 'pal', name: 'Pal', color: '#06b6d4' },
  lynch: { key: 'lynch', name: 'Lynch', color: '#8b5cf6' },
  dalio: { key: 'dalio', name: 'Dalio', color: '#f97316' },
} as const;

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const portfolio = payload.find((p: { dataKey: string }) => p.dataKey === "portfolio")?.value ?? 0;
  const spy = payload.find((p: { dataKey: string }) => p.dataKey === "spy")?.value ?? 0;
  const alpha = portfolio - spy;

  // Find agent data in payload
  const agentData: Array<{ key: string; name: string; value: number; color: string }> = [];
  for (const [agentId, config] of Object.entries(AGENT_CONFIG)) {
    const agentPayload = payload.find((p: { dataKey: string }) => p.dataKey === agentId);
    if (agentPayload && typeof agentPayload.value === 'number') {
      agentData.push({
        key: agentId,
        name: config.name,
        value: agentPayload.value,
        color: config.color,
      });
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl text-sm">
      <p className="text-slate-400 mb-2 font-medium">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#D4A020" }} />
            Portfolio
          </span>
          <span className={portfolio >= 0 ? "text-emerald-400 font-mono" : "text-red-400 font-mono"}>
            {formatPercent(portfolio)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#4F46E5" }} />
            S&P 500
          </span>
          <span className={spy >= 0 ? "text-emerald-400 font-mono" : "text-red-400 font-mono"}>
            {formatPercent(spy)}
          </span>
        </div>
        
        {/* Agent returns */}
        {agentData.length > 0 && (
          <>
            <div className="border-t border-slate-700 pt-1 mt-1" />
            {agentData.map((agent) => (
              <div key={agent.key} className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: agent.color }} />
                  {agent.name}
                </span>
                <span className={`font-mono text-xs ${agent.value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {formatPercent(agent.value)}
                </span>
              </div>
            ))}
          </>
        )}

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
  intradaySnapshots = [],
  agentSnapshots = {},
  compact = false,
  startingCapital = 100000,
  className = "",
  defaultTimeRange,
}: PerformanceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(defaultTimeRange || "1D");
  const [visibleAgents, setVisibleAgents] = useState<Record<string, boolean>>({
    chris: true,
    buffett: true,
    schiff: true,
    pal: true,
    lynch: true,
    dalio: true,
  });

  // Convert intraday snapshots to PortfolioSnapshot format for unified processing
  const intradayAsPortfolio = useMemo<PortfolioSnapshot[]>(() => {
    return intradaySnapshots.map((s) => ({
      date: s.timestamp, // timestamp has "T" so it's detected as intraday
      equity: s.equity,
      spy_price: s.spy_price,
      spy_baseline: s.spy_baseline,
      cash: s.cash,
      positions_value: s.positions_value,
      daily_pnl: s.daily_pnl,
      total_pnl: s.total_pnl,
      total_pnl_pct: s.total_pnl_pct,
    }));
  }, [intradaySnapshots]);

  // Detect if snapshot has intraday timestamp (contains "T")
  const isIntraday = (s: PortfolioSnapshot) => s.date.includes("T");

  // Merge daily + intraday snapshots for unified processing, deduplicating by timestamp.
  // The two source tables use different timestamp formats:
  //   paper_portfolio_snapshots: "2026-02-20T10:45" (local PT, no timezone)
  //   paper_portfolio_snapshots_intraday: "2026-02-20T18:45:00+00:00" (UTC with offset)
  // We must normalize to epoch ms for proper deduplication.
  const allSnapshots = useMemo(() => {
    const merged = [...snapshots, ...intradayAsPortfolio];
    // Round to nearest 5 minutes (300000ms) to match snapshots that represent the same interval
    const roundTo5Min = (ms: number) => Math.round(ms / 300000) * 300000;
    const seen = new Map<number, PortfolioSnapshot>();
    for (const s of merged) {
      const key = roundTo5Min(new Date(s.date).getTime());
      // Intraday table entries (from intradayAsPortfolio) come second, so they overwrite
      seen.set(key, s);
    }
    return Array.from(seen.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [snapshots, intradayAsPortfolio]);

  // Filter snapshots by selected time range
  const filteredSnapshots = useMemo(() => {
    if (!allSnapshots || allSnapshots.length === 0) return [];

    const cutoff = Date.now() - TIME_RANGE_MS[timeRange];
    
    // For 1D view, show only TODAY's intraday snapshots
    // Anchor to last intraday snapshot from yesterday (not daily summary, which may have stale equity)
    if (timeRange === "1D") {
      const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
      const todayOnly = allSnapshots
        .filter(isIntraday)
        .filter((s) => s.date.startsWith(todayStr));
      if (todayOnly.length >= 2) {
        // Use last intraday snapshot from yesterday as anchor (more accurate than daily summary)
        const yesterdayIntraday = allSnapshots
          .filter(isIntraday)
          .filter((s) => !s.date.startsWith(todayStr));
        const lastYesterdayIntraday = yesterdayIntraday.length > 0
          ? yesterdayIntraday[yesterdayIntraday.length - 1]
          : null;
        // Fall back to daily snapshot only if no yesterday intraday exists
        if (lastYesterdayIntraday) {
          return [lastYesterdayIntraday, ...todayOnly];
        }
        const dailySnapshots = allSnapshots.filter((s) => !isIntraday(s));
        const lastDaily = dailySnapshots.length > 0 ? dailySnapshots[dailySnapshots.length - 1] : null;
        return lastDaily ? [lastDaily, ...todayOnly] : todayOnly;
      }
      // If no today intraday data yet, fall back to last 24h of any intraday
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const recentIntraday = allSnapshots
        .filter(isIntraday)
        .filter((s) => new Date(s.date).getTime() >= oneDayAgo);
      if (recentIntraday.length >= 2) {
        return recentIntraday; // Already intraday-only, no daily summary anchor needed
      }
    }
    
    const filtered = allSnapshots.filter((s) => {
      const dateStr = s.date.includes("T") ? s.date : s.date + "T00:00";
      return new Date(dateStr).getTime() >= cutoff;
    });

    // For ranges with intraday data, exclude daily summary rows for dates that have
    // intraday coverage — daily summaries can have stale equity (synced at a different
    // time than the intraday snapshots), causing false spikes/drops in the chart.
    const intradayDates = new Set<string>();
    for (const s of filtered) {
      if (isIntraday(s)) {
        intradayDates.add(s.date.slice(0, 10));
      }
    }
    const deduped = filtered.filter((s) => {
      if (!isIntraday(s) && intradayDates.has(s.date.slice(0, 10))) {
        return false; // Skip daily summary if we have intraday for this date
      }
      return true;
    });

    return deduped.length >= 2 ? deduped : filtered.length >= 2 ? filtered : allSnapshots;
  }, [allSnapshots, timeRange]);

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
    // Always use the first snapshot's spy_price as the consistent baseline for the range.
    // Don't use spy_baseline — it resets on every intraday snapshot and causes incorrect returns.
    const startSpy = filteredSnapshots[0].spy_price || 1;

    // Pre-compute each agent's starting equity for the visible range
    // This ensures agent returns are relative to the same time window as the portfolio
    const agentStartEquity: Record<string, number> = {};
    const chartStartMs = new Date(filteredSnapshots[0].date.includes("T") ? filteredSnapshots[0].date : filteredSnapshots[0].date + "T00:00").getTime();
    for (const [agentId, agentSnaps] of Object.entries(agentSnapshots)) {
      // Find the agent's equity closest to (but not after) the chart start time
      const FIVE_MIN = 5 * 60 * 1000;
      let bestSnap: typeof agentSnaps[0] | undefined;
      for (const snap of agentSnaps) {
        if (!snap.equity) continue;
        const snapMs = new Date(snap.date.includes("T") ? snap.date : snap.date + "T00:00").getTime();
        if (snapMs <= chartStartMs + FIVE_MIN) {
          bestSnap = snap;
        }
      }
      agentStartEquity[agentId] = bestSnap?.equity || 100000;
    }

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

      // Get agent returns for this date — fuzzy match within 5 min, then carry forward last known value
      const agentReturns: Partial<{ chris: number; buffett: number; schiff: number; pal: number; lynch: number; dalio: number }> = {};
      const snapshotMs = new Date(s.date.includes("T") ? s.date : s.date + "T00:00").getTime();
      const FIVE_MIN = 5 * 60 * 1000;
      
      for (const [agentId, agentSnaps] of Object.entries(agentSnapshots)) {
        const agentKey = agentId === 'chris-vermeulen' ? 'chris' :
                       agentId === 'warren-buffett' ? 'buffett' :
                       agentId === 'peter-schiff' ? 'schiff' :
                       agentId === 'raoul-pal' ? 'pal' :
                       agentId === 'peter-lynch' ? 'lynch' :
                       agentId === 'ray-dalio' ? 'dalio' : null;
        if (!agentKey) continue;

        // Try exact match first
        let matched = agentSnaps.find(snap => snap.date === s.date);
        
        // Fuzzy: find closest within 5 minutes
        if (!matched) {
          let bestDiff = Infinity;
          for (const snap of agentSnaps) {
            const snapTime = new Date(snap.date.includes("T") ? snap.date : snap.date + "T00:00").getTime();
            const diff = Math.abs(snapTime - snapshotMs);
            if (diff <= FIVE_MIN && diff < bestDiff) {
              bestDiff = diff;
              matched = snap;
            }
          }
        }
        
        // Carry forward: use last agent snapshot at or before this time
        if (!matched) {
          let lastBefore: typeof agentSnaps[0] | undefined = undefined;
          for (const snap of agentSnaps) {
            const snapTime = new Date(snap.date.includes("T") ? snap.date : snap.date + "T00:00").getTime();
            if (snapTime <= snapshotMs) {
              lastBefore = snap;
            }
          }
          matched = lastBefore;
        }
        
        // Compute return relative to agent's start-of-range equity (same reference as portfolio)
        if (matched?.equity) {
          const startEq = agentStartEquity[agentId] || 100000;
          agentReturns[agentKey] = Math.round(((matched.equity - startEq) / startEq) * 10000) / 100;
        } else {
          agentReturns[agentKey] = matched ? matched.return : 0;
        }
      }

      return {
        date: s.date,
        dateLabel,
        portfolio: Math.round(portfolioReturn * 100) / 100,
        spy: Math.round(spyReturn * 100) / 100,
        alpha: Math.round((portfolioReturn - spyReturn) * 100) / 100,
        ...agentReturns,
      };
    });
  }, [filteredSnapshots, startingCapital, timeRange, agentSnapshots]);

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

      {/* Agent Legend Toggle */}
      {!compact && Object.keys(agentSnapshots).length > 0 && (
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500">Agent Lines:</span>
          {Object.entries(AGENT_CONFIG).map(([key, config]) => {
            const hasData = agentSnapshots[`${key === 'chris' ? 'chris-vermeulen' : key === 'buffett' ? 'warren-buffett' : key === 'schiff' ? 'peter-schiff' : key === 'pal' ? 'raoul-pal' : key === 'lynch' ? 'peter-lynch' : 'ray-dalio'}`];
            if (!hasData || hasData.length === 0) return null;
            
            return (
              <button
                key={key}
                onClick={() => setVisibleAgents(prev => ({ ...prev, [key]: !prev[key] }))}
                className={`px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
                  visibleAgents[key]
                    ? 'bg-slate-700 text-slate-100 border-slate-600'
                    : 'bg-slate-800/50 text-slate-500 border-slate-700'
                }`}
                style={{
                  borderColor: visibleAgents[key] ? config.color : undefined,
                  backgroundColor: visibleAgents[key] ? `${config.color}20` : undefined,
                }}
              >
                <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: config.color }} />
                {config.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Chart */}
      <div className={compact ? "h-40" : "h-64 lg:h-96"}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#D4A020" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#D4A020" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="spyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1A1A24" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fill: "#64748b", fontSize: compact ? 10 : 12 }}
              axisLine={{ stroke: "#2A2A38" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: compact ? 10 : 12 }}
              axisLine={{ stroke: "#2A2A38" }}
              tickLine={false}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#343444" strokeDasharray="4 4" />
            {!compact && (
              <Legend
                verticalAlign="top"
                height={30}
                formatter={(value: string) => (
                  <span className="text-xs text-slate-400">{value}</span>
                )}
              />
            )}
            
            {/* S&P 500 Area */}
            <Area
              type="monotone"
              dataKey="spy"
              name="S&P 500"
              stroke="#4F46E5"
              strokeWidth={2}
              fill="url(#spyGradient)"
              dot={false}
            />
            
            {/* Portfolio Area */}
            <Area
              type="monotone"
              dataKey="portfolio"
              name="Portfolio"
              stroke="#D4A020"
              strokeWidth={2}
              fill="url(#portfolioGradient)"
              dot={false}
            />

            {/* Agent Lines */}
            {Object.entries(AGENT_CONFIG).map(([key, config]) => {
              const agentId = key === 'chris' ? 'chris-vermeulen' :
                            key === 'buffett' ? 'warren-buffett' :
                            key === 'schiff' ? 'peter-schiff' :
                            key === 'pal' ? 'raoul-pal' :
                            key === 'lynch' ? 'peter-lynch' :
                            'ray-dalio';
              
              const hasData = agentSnapshots[agentId] && agentSnapshots[agentId].length > 0;
              if (!hasData || !visibleAgents[key]) return null;

              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={config.name}
                  stroke={config.color}
                  strokeWidth={1.5}
                  dot={false}
                  strokeOpacity={0.8}
                />
              );
            })}
          </ComposedChart>
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
