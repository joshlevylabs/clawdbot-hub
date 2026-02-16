"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Cpu,
  Activity,
  Zap,
  DollarSign,
  BarChart3,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FleetSummary {
  today: number;
  week: number;
  month: number;
  tokens_today: number;
}

interface ModelEntry {
  cost_today: number;
  cost_week: number;
  cost_month: number;
  tokens_today: number;
  tokens_week: number;
  tokens_month: number;
  calls_today: number;
}

interface AgentEntry {
  cost_today: number;
  cost_week: number;
  cost_month: number;
  tokens_today: number;
  primary_model: string;
  department: string;
}

interface FleetData {
  generated_at: string;
  active_sessions: number;
  summary: FleetSummary;
  by_model: Record<string, ModelEntry>;
  by_agent: Record<string, AgentEntry>;
  daily_costs: Record<string, number>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTokens(count: number): string {
  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B`;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
  return count.toString();
}

function formatCost(n: number): string {
  return n.toFixed(2);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const DEPT_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  engineering: { text: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30" },
  marketing:   { text: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/30" },
  revenue:     { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  executive:   { text: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/30" },
  other:       { text: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/30" },
};

function deptStyle(dept: string) {
  return DEPT_COLORS[dept] ?? DEPT_COLORS.other;
}

function barColor(cost: number): string {
  if (cost > 80) return "#ef4444";   // red-500
  if (cost >= 30) return "#f59e0b";  // amber-500
  return "#22c55e";                   // green-500
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SummaryCard({
  icon,
  label,
  value,
  sub,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  iconColor?: string;
}) {
  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={iconColor}>{icon}</span>
        <span className="text-xs text-slate-500 font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-100">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function CostTrendChart({ dailyCosts }: { dailyCosts: Record<string, number> }) {
  const entries = Object.entries(dailyCosts)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14);

  if (entries.length === 0) return null;

  const maxCost = Math.max(...entries.map(([, c]) => c), 1);

  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-teal-400" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold text-slate-200">Daily Cost Trend</h2>
        <span className="ml-auto text-xs text-slate-500">Last {entries.length} days</span>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-green-500 inline-block" /> &lt;$30
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" /> $30–80
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-red-500 inline-block" /> &gt;$80
        </span>
      </div>

      {/* Bar chart (SVG) */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${entries.length * 50} 180`}
          className="w-full min-w-[400px]"
          preserveAspectRatio="xMidYMid meet"
        >
          {entries.map(([date, cost], i) => {
            const barH = Math.max((cost / maxCost) * 140, 2);
            const x = i * 50 + 10;
            const y = 150 - barH;
            const label = date.slice(5); // MM-DD
            return (
              <g key={date}>
                <rect
                  x={x}
                  y={y}
                  width={30}
                  height={barH}
                  rx={4}
                  fill={barColor(cost)}
                  opacity={0.85}
                />
                <text
                  x={x + 15}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#94a3b8"
                >
                  ${Math.round(cost)}
                </text>
                <text
                  x={x + 15}
                  y={168}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#64748b"
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function ModelBreakdown({ byModel }: { byModel: Record<string, ModelEntry> }) {
  const providerFromName = (name: string): string => {
    if (/claude/i.test(name) || /opus/i.test(name) || /sonnet/i.test(name) || /haiku/i.test(name))
      return "Anthropic";
    if (/gpt/i.test(name) || /codex/i.test(name)) return "OpenAI";
    if (/gemini/i.test(name)) return "Google";
    if (/llama/i.test(name)) return "Meta";
    return "Other";
  };

  const providerBadge: Record<string, string> = {
    Anthropic: "text-violet-400 bg-violet-600/10 border-violet-600/20",
    OpenAI:    "text-emerald-400 bg-emerald-600/10 border-emerald-600/20",
    Google:    "text-blue-400 bg-blue-600/10 border-blue-600/20",
    Meta:      "text-indigo-400 bg-indigo-600/10 border-indigo-600/20",
    Other:     "text-slate-400 bg-slate-600/10 border-slate-600/20",
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Cpu className="w-4 h-4 text-violet-400" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold text-slate-200">Model Breakdown</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(byModel).map(([name, m]) => {
          const provider = providerFromName(name);
          const pctOfMonthCap = Math.min((m.tokens_month / 5_000_000_000) * 100, 100);
          return (
            <div
              key={name}
              className="bg-slate-900/50 rounded-xl border border-slate-800 p-5 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-slate-100 text-sm">{name}</h3>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium border ${providerBadge[provider]}`}
                >
                  {provider}
                </span>
              </div>

              {/* Cost grid */}
              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div>
                  <p className="text-xs text-slate-500">Today</p>
                  <p className="text-sm font-semibold text-slate-200">
                    ${formatCost(m.cost_today)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Week</p>
                  <p className="text-sm font-semibold text-slate-200">
                    ${formatCost(m.cost_week)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Month</p>
                  <p className="text-sm font-semibold text-slate-200">
                    ${formatCost(m.cost_month)}
                  </p>
                </div>
              </div>

              {/* Tokens & calls */}
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>{formatTokens(m.tokens_today)} tokens today</span>
                <span>{m.calls_today.toLocaleString()} calls</span>
              </div>

              {/* Token usage bar */}
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(pctOfMonthCap, 1)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-600 mt-1">
                {formatTokens(m.tokens_month)} tokens this month
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgentBreakdown({ byAgent }: { byAgent: Record<string, AgentEntry> }) {
  // Group by department for subtotals
  const deptTotals: Record<string, { cost_today: number; cost_week: number; cost_month: number }> = {};
  Object.values(byAgent).forEach((a) => {
    const d = a.department || "other";
    if (!deptTotals[d]) deptTotals[d] = { cost_today: 0, cost_week: 0, cost_month: 0 };
    deptTotals[d].cost_today += a.cost_today;
    deptTotals[d].cost_week += a.cost_week;
    deptTotals[d].cost_month += a.cost_month;
  });

  const sorted = Object.entries(byAgent).sort(([, a], [, b]) => b.cost_today - a.cost_today);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-teal-400" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold text-slate-200">Agent Breakdown</h2>
      </div>

      {/* Agent cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {sorted.map(([name, a]) => {
          const ds = deptStyle(a.department);
          return (
            <div
              key={name}
              className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-slate-100">
                    {capitalize(name)}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${ds.text} ${ds.bg} ${ds.border}`}
                  >
                    {a.department}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-500 mb-3">
                Model: <span className="text-slate-400">{a.primary_model}</span>
              </p>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-slate-500">Today</p>
                  <p className="text-sm font-semibold text-slate-200">${formatCost(a.cost_today)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Week</p>
                  <p className="text-sm font-semibold text-slate-200">${formatCost(a.cost_week)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Month</p>
                  <p className="text-sm font-semibold text-slate-200">${formatCost(a.cost_month)}</p>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/50 text-xs text-slate-500">
                {formatTokens(a.tokens_today)} tokens today
              </div>
            </div>
          );
        })}
      </div>

      {/* Department subtotals */}
      <div className="bg-slate-900/30 rounded-xl border border-slate-800 p-4">
        <h3 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
          Department Subtotals
        </h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(deptTotals)
            .sort(([, a], [, b]) => b.cost_month - a.cost_month)
            .map(([dept, t]) => {
              const ds = deptStyle(dept);
              return (
                <div key={dept} className={`rounded-lg border ${ds.border} ${ds.bg} px-3 py-2`}>
                  <span className={`text-xs font-medium ${ds.text}`}>{capitalize(dept)}</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-sm font-bold text-slate-200">
                      ${formatCost(t.cost_today)}
                    </span>
                    <span className="text-[10px] text-slate-500">today</span>
                    <span className="text-[10px] text-slate-600">·</span>
                    <span className="text-[10px] text-slate-500">
                      ${formatCost(t.cost_month)} mo
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function CostInsights({ data }: { data: FleetData }) {
  const insights: { icon: string; text: string }[] = [];

  // Check Opus concentration
  const opusEntry = Object.entries(data.by_model).find(([name]) => /opus/i.test(name));
  if (opusEntry) {
    const [opusName, opusModel] = opusEntry;
    const totalMonth = data.summary.month;
    if (totalMonth > 0) {
      const pct = Math.round((opusModel.cost_month / totalMonth) * 100);
      if (pct > 70) {
        insights.push({
          icon: "⚡",
          text: `${pct}% of monthly spend ($${formatCost(opusModel.cost_month)}) is on ${opusName} — consider delegating routine tasks to Sonnet/Haiku`,
        });
      }
    }
  }

  // Check cron cost
  const cronAgent = data.by_agent["cron"];
  if (cronAgent && cronAgent.cost_today > 2) {
    insights.push({
      icon: "🔄",
      text: `Cron jobs spent $${formatCost(cronAgent.cost_today)} today on ${cronAgent.primary_model} — consider switching batch jobs to Haiku for ~90% savings`,
    });
  }

  // Check "unknown" agent
  const unknownAgent = data.by_agent["unknown"];
  if (unknownAgent && unknownAgent.cost_today > 5) {
    const totalToday = data.summary.today;
    const pct = totalToday > 0 ? Math.round((unknownAgent.cost_today / totalToday) * 100) : 0;
    insights.push({
      icon: "🔍",
      text: `${pct}% of today's spend ($${formatCost(unknownAgent.cost_today)}) is from untagged sessions — tag agents for better cost attribution`,
    });
  }

  // High daily spend
  const dailyEntries = Object.values(data.daily_costs);
  if (dailyEntries.length >= 7) {
    const last7 = dailyEntries.slice(-7);
    const avg7 = last7.reduce((s, c) => s + c, 0) / last7.length;
    if (avg7 > 100) {
      insights.push({
        icon: "📈",
        text: `7-day avg is $${Math.round(avg7)}/day (~$${Math.round(avg7 * 30)}/mo projected) — review high-cost days for optimization`,
      });
    }
  }

  if (insights.length === 0) return null;

  return (
    <div className="bg-slate-900/50 rounded-xl border border-amber-900/30 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-amber-400" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold text-slate-200">Cost Optimization Insights</h2>
      </div>
      <div className="space-y-2">
        {insights.map((ins, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-slate-400">
            <span className="text-base leading-5">{ins.icon}</span>
            <span>{ins.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function FleetPage() {
  const [data, setData] = useState<FleetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/data/fleet-usage.json?t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: FleetData = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load fleet data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* Loading state */
  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-600/20 rounded-lg flex items-center justify-center">
            <Cpu className="w-5 h-5 text-violet-400 animate-pulse" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Model Fleet</h1>
            <p className="text-slate-500 text-sm">Loading usage data…</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 h-24 animate-pulse"
            />
          ))}
        </div>
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 h-48 animate-pulse" />
      </div>
    );
  }

  /* Error state */
  if (error || !data) {
    return (
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600/20 rounded-lg flex items-center justify-center">
            <Cpu className="w-5 h-5 text-red-400" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Model Fleet</h1>
            <p className="text-red-400 text-sm">Error: {error ?? "No data"}</p>
          </div>
        </div>
        <button
          onClick={() => fetchData()}
          className="btn btn-secondary flex items-center gap-2 text-sm"
        >
          <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
          Retry
        </button>
      </div>
    );
  }

  /* Computed values */
  const modelCount = Object.keys(data.by_model).length;
  const agentCount = Object.keys(data.by_agent).length;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-600/20 rounded-lg flex items-center justify-center">
            <Cpu className="w-5 h-5 text-violet-400" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Model Fleet</h1>
            <p className="text-slate-500 text-sm">
              Real usage data · {modelCount} model{modelCount !== 1 ? "s" : ""} · {agentCount} agent{agentCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 hidden sm:inline">
            Updated {relativeTime(data.generated_at)}
          </span>
          <button
            onClick={() => fetchData(true)}
            className="btn btn-secondary flex items-center gap-2 text-sm"
            disabled={refreshing}
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              strokeWidth={1.5}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Activity className="w-4 h-4" strokeWidth={1.5} />}
          iconColor="text-emerald-400"
          label="Active Sessions"
          value={String(data.active_sessions)}
          sub={`${modelCount} model${modelCount !== 1 ? "s" : ""} in fleet`}
        />
        <SummaryCard
          icon={<DollarSign className="w-4 h-4" strokeWidth={1.5} />}
          iconColor="text-amber-400"
          label="Cost Today"
          value={`$${formatCost(data.summary.today)}`}
          sub={`${formatTokens(data.summary.tokens_today)} tokens`}
        />
        <SummaryCard
          icon={<BarChart3 className="w-4 h-4" strokeWidth={1.5} />}
          iconColor="text-violet-400"
          label="Cost This Week"
          value={`$${formatCost(data.summary.week)}`}
          sub={`~$${Math.round(data.summary.week / 7)}/day avg`}
        />
        <SummaryCard
          icon={<TrendingUp className="w-4 h-4" strokeWidth={1.5} />}
          iconColor="text-teal-400"
          label="Cost This Month"
          value={`$${formatCost(data.summary.month)}`}
          sub={`~$${Math.round((data.summary.month / new Date().getDate()) * 30)}/mo projected`}
        />
      </div>

      {/* Cost Trend Chart */}
      <CostTrendChart dailyCosts={data.daily_costs} />

      {/* Cost Optimization Insights */}
      <CostInsights data={data} />

      {/* Model Breakdown */}
      <ModelBreakdown byModel={data.by_model} />

      {/* Agent Breakdown */}
      <AgentBreakdown byAgent={data.by_agent} />

      {/* Footer timestamp */}
      <div className="text-center text-xs text-slate-600 pb-4">
        Data generated {new Date(data.generated_at).toLocaleString()} ·{" "}
        <button
          onClick={() => fetchData(true)}
          className="text-slate-500 hover:text-slate-300 underline underline-offset-2"
        >
          refresh
        </button>
      </div>
    </div>
  );
}
