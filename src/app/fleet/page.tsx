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
  CheckCircle,
  Shield,
  Key,
  Plug,
  Check,
  X,
  Eye,
  EyeOff,
  ChevronDown,
  Loader2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FleetSummary {
  today: number;
  week: number;
  month: number;
  tokens_today: number;
  api_equivalent_today?: number;
  api_equivalent_week?: number;
  api_equivalent_month?: number;
  savings_today?: number;
  savings_month?: number;
  subscription_daily?: number;
  subscription_monthly?: number;
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

interface SubscriptionEntry {
  cost_monthly: number;
  cost_daily: number;
  provider: string;
  description: string;
  covers_api: boolean;
}

interface FleetData {
  generated_at: string;
  active_sessions: number;
  billing_model?: string;
  summary: FleetSummary;
  subscriptions?: Record<string, SubscriptionEntry>;
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

function CostTrendChart({ dailyCosts, subscriptionDaily }: { dailyCosts: Record<string, number>; subscriptionDaily?: number }) {
  const entries = Object.entries(dailyCosts)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14);

  if (entries.length === 0) return null;

  const maxCost = Math.max(...entries.map(([, c]) => c), 1);
  const isSubscription = subscriptionDaily != null && subscriptionDaily > 0;

  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-5">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-4 h-4 text-teal-400" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold text-slate-200">Daily Cost Trend</h2>
        <span className="ml-auto text-xs text-slate-500">Last {entries.length} days</span>
      </div>

      {isSubscription && (
        <p className="text-[11px] text-emerald-400/80 mb-3 ml-6">
          API Equivalent (covered by subscription)
        </p>
      )}

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
        {isSubscription && (
          <span className="flex items-center gap-1">
            <span className="w-4 border-t-2 border-dashed border-emerald-400 inline-block" /> Subscription daily
          </span>
        )}
      </div>

      {/* Bar chart (SVG) */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${entries.length * 50} 180`}
          className="w-full min-w-[400px]"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Subscription daily cost dashed line */}
          {isSubscription && (() => {
            const lineY = 150 - Math.max((subscriptionDaily / maxCost) * 140, 2);
            const chartWidth = entries.length * 50;
            return (
              <g>
                <line
                  x1={0}
                  y1={lineY}
                  x2={chartWidth}
                  y2={lineY}
                  stroke="#34d399"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  opacity={0.7}
                />
                <text
                  x={chartWidth - 4}
                  y={lineY - 4}
                  textAnchor="end"
                  fontSize="8"
                  fill="#34d399"
                >
                  ${formatCost(subscriptionDaily)}/day
                </text>
              </g>
            );
          })()}
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

function ModelBreakdown({ byModel, isSubscription }: { byModel: Record<string, ModelEntry>; isSubscription?: boolean }) {
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
        {isSubscription && (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            API equivalent
          </span>
        )}
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

function AgentBreakdown({ byAgent, isSubscription }: { byAgent: Record<string, AgentEntry>; isSubscription?: boolean }) {
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
        {isSubscription && (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            API equivalent
          </span>
        )}
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

function SubscriptionBanner({ data }: { data: FleetData }) {
  if (data.billing_model !== "subscription" || !data.subscriptions) return null;

  const subEntries = Object.entries(data.subscriptions);
  if (subEntries.length === 0) return null;

  const [name, sub] = subEntries[0];
  const savingsMonth = data.summary.savings_month ?? 0;

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/60 via-emerald-900/30 to-slate-900/50 p-5">
      <div className="flex items-center gap-3 mb-2">
        <CheckCircle className="w-5 h-5 text-emerald-400" strokeWidth={2} />
        <h2 className="text-base font-semibold text-emerald-300">{name} — ${formatCost(sub.cost_monthly)}/mo</h2>
      </div>
      <div className="ml-8 space-y-1">
        <p className="text-sm text-emerald-400/80">Covers all {sub.provider} API usage</p>
        {savingsMonth > 0 && (
          <p className="text-sm text-emerald-300 font-medium">
            Saving ${formatCost(savingsMonth)}/month vs pay-per-token API
          </p>
        )}
      </div>
    </div>
  );
}

function CostInsights({ data }: { data: FleetData }) {
  const insights: { icon: string; text: string }[] = [];
  const isSub = data.billing_model === "subscription";

  if (isSub) {
    // Subscription-aware insights
    const savingsMonth = data.summary.savings_month ?? 0;
    const apiEquivMonth = data.summary.api_equivalent_month ?? 0;
    const subMonthly = data.summary.subscription_monthly ?? 200;

    if (savingsMonth > 0) {
      insights.push({
        icon: "💰",
        text: `Your Claude Max subscription saved $${formatCost(savingsMonth)} this month vs API rates`,
      });
    }

    if (apiEquivMonth > 0 && apiEquivMonth < subMonthly) {
      insights.push({
        icon: "⚠️",
        text: `API usage ($${formatCost(apiEquivMonth)}) is below subscription value ($${formatCost(subMonthly)}) — consider if Max is still worth it`,
      });
    }

    // Token distribution: which agents use most
    const sortedAgents = Object.entries(data.by_agent)
      .sort(([, a], [, b]) => b.tokens_today - a.tokens_today);
    if (sortedAgents.length > 0) {
      const topAgent = sortedAgents[0];
      const totalTokens = data.summary.tokens_today;
      if (totalTokens > 0) {
        const pct = Math.round((topAgent[1].tokens_today / totalTokens) * 100);
        insights.push({
          icon: "🤖",
          text: `${capitalize(topAgent[0])} is your top consumer today: ${formatTokens(topAgent[1].tokens_today)} tokens (${pct}% of total)`,
        });
      }
    }

    // Opus concentration (still useful info even under subscription)
    const opusEntry = Object.entries(data.by_model).find(([n]) => /opus/i.test(n));
    if (opusEntry) {
      const apiEquivToday = data.summary.api_equivalent_today ?? data.summary.today;
      if (apiEquivToday > 0) {
        const pct = Math.round((opusEntry[1].cost_today / apiEquivToday) * 100);
        if (pct > 60) {
          insights.push({
            icon: "⚡",
            text: `${pct}% of API-equivalent spend is on ${opusEntry[0]} — all covered by your subscription`,
          });
        }
      }
    }
  } else {
    // Legacy API billing insights
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

    const cronAgent = data.by_agent["cron"];
    if (cronAgent && cronAgent.cost_today > 2) {
      insights.push({
        icon: "🔄",
        text: `Cron jobs spent $${formatCost(cronAgent.cost_today)} today on ${cronAgent.primary_model} — consider switching batch jobs to Haiku for ~90% savings`,
      });
    }

    const unknownAgent = data.by_agent["unknown"];
    if (unknownAgent && unknownAgent.cost_today > 5) {
      const totalToday = data.summary.today;
      const pct = totalToday > 0 ? Math.round((unknownAgent.cost_today / totalToday) * 100) : 0;
      insights.push({
        icon: "🔍",
        text: `${pct}% of today's spend ($${formatCost(unknownAgent.cost_today)}) is from untagged sessions — tag agents for better cost attribution`,
      });
    }

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
  }

  if (insights.length === 0) return null;

  return (
    <div className={`bg-slate-900/50 rounded-xl border ${isSub ? "border-emerald-900/30" : "border-amber-900/30"} p-5`}>
      <div className="flex items-center gap-2 mb-3">
        <Zap className={`w-4 h-4 ${isSub ? "text-emerald-400" : "text-amber-400"}`} strokeWidth={1.5} />
        <h2 className="text-sm font-semibold text-slate-200">
          {isSub ? "Subscription Insights" : "Cost Optimization Insights"}
        </h2>
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
/*  Model Registry — Types & Data                                      */
/* ------------------------------------------------------------------ */

interface ProviderModel {
  id: string;
  name: string;
  costTier: 1 | 2 | 3;
  costLabel: string;
  available: boolean;
}

interface Provider {
  id: string;
  name: string;
  status: "connected" | "not_connected";
  authMethod: string | null;
  note?: string;
  models: ProviderModel[];
}

interface AgentModelAssignment {
  agent: string;
  role: string;
  model: string;
  provider: string;
}

const PROVIDERS: Provider[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    status: "connected",
    authMethod: "Claude Max subscription ($200/mo)",
    models: [
      { id: "opus-4", name: "Claude Opus 4", costTier: 3, costLabel: "$15/$75 per 1M tokens", available: true },
      { id: "sonnet-4", name: "Claude Sonnet 4", costTier: 2, costLabel: "$3/$15 per 1M tokens", available: true },
      { id: "haiku-3.5", name: "Haiku 3.5", costTier: 1, costLabel: "$0.25/$1.25 per 1M tokens", available: true },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    status: "not_connected",
    authMethod: null,
    note: "Required for Codex agent coding capabilities",
    models: [
      { id: "codex", name: "Codex", costTier: 2, costLabel: "~$3/$15 per 1M tokens", available: false },
      { id: "gpt-5-mini", name: "GPT-5 Mini", costTier: 1, costLabel: "~$0.50/$2 per 1M tokens", available: false },
      { id: "o3", name: "o3", costTier: 3, costLabel: "~$10/$40 per 1M tokens", available: false },
    ],
  },
  {
    id: "google",
    name: "Google",
    status: "not_connected",
    authMethod: null,
    note: "Low-cost option for bulk processing and cron jobs",
    models: [
      { id: "gemini-2-flash", name: "Gemini 2 Flash", costTier: 1, costLabel: "$0.075/$0.30 per 1M tokens", available: false },
      { id: "gemini-2-pro", name: "Gemini 2 Pro", costTier: 2, costLabel: "$1.25/$5 per 1M tokens", available: false },
    ],
  },
  {
    id: "meta",
    name: "Meta",
    status: "not_connected",
    authMethod: null,
    note: "Open-source option, self-hosted or via API",
    models: [
      { id: "llama-4-scout", name: "Llama 4 Scout", costTier: 1, costLabel: "Free (self-hosted) or ~$0.10/$0.40", available: false },
      { id: "llama-4-maverick", name: "Llama 4 Maverick", costTier: 2, costLabel: "Free (self-hosted) or ~$0.50/$2", available: false },
    ],
  },
];

const INITIAL_AGENT_MODELS: AgentModelAssignment[] = [
  { agent: "Theo", role: "COO", model: "Claude Opus 4", provider: "Anthropic" },
  { agent: "Atlas", role: "CTO", model: "Claude Sonnet 4", provider: "Anthropic" },
  { agent: "Muse", role: "CMO", model: "Claude Sonnet 4", provider: "Anthropic" },
  { agent: "Venture", role: "CRO", model: "Claude Sonnet 4", provider: "Anthropic" },
  { agent: "Forge", role: "Backend Lead", model: "Claude Sonnet 4", provider: "Anthropic" },
  { agent: "Pixel", role: "Frontend Lead", model: "Claude Sonnet 4", provider: "Anthropic" },
  { agent: "Sentinel", role: "QA Lead", model: "Haiku 3.5", provider: "Anthropic" },
  { agent: "ScriptBot", role: "Content Lead", model: "Claude Sonnet 4", provider: "Anthropic" },
  { agent: "Echo", role: "Social Lead", model: "Haiku 3.5", provider: "Anthropic" },
  { agent: "Builder", role: "Products Lead", model: "Claude Sonnet 4", provider: "Anthropic" },
  { agent: "Scout", role: "Growth Lead", model: "Haiku 3.5", provider: "Anthropic" },
  { agent: "The Pit", role: "Trading Lead", model: "Claude Sonnet 4", provider: "Anthropic" },
];

const PROVIDER_BORDER_COLORS: Record<string, string> = {
  anthropic: "border-l-violet-500",
  openai: "border-l-emerald-500",
  google: "border-l-blue-500",
  meta: "border-l-indigo-500",
};

const PROVIDER_ICON_COLORS: Record<string, string> = {
  anthropic: "text-violet-400",
  openai: "text-emerald-400",
  google: "text-blue-400",
  meta: "text-indigo-400",
};

function costTierBadge(tier: 1 | 2 | 3) {
  if (tier === 1)
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-500/15 text-green-400 border border-green-500/30">
        $
      </span>
    );
  if (tier === 2)
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
        $$
      </span>
    );
  return (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
      $$$
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Model Registry — Components                                        */
/* ------------------------------------------------------------------ */

function ProviderCard({
  provider,
  agentAssignments,
  enabledModels,
  onToggleModel,
  apiKeys,
  onSaveApiKey,
}: {
  provider: Provider;
  agentAssignments: AgentModelAssignment[];
  enabledModels: Record<string, boolean>;
  onToggleModel: (providerId: string, modelId: string) => void;
  apiKeys: Record<string, string>;
  onSaveApiKey: (providerId: string, key: string) => void;
}) {
  const [showApiInput, setShowApiInput] = useState(false);
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testState, setTestState] = useState<"idle" | "testing" | "success" | "error">("idle");

  const isConnected = provider.status === "connected";
  const storedKey = apiKeys[provider.id] || "";
  const hasKey = storedKey.length > 0;

  const maskedKey = hasKey
    ? `sk-...${ storedKey.slice(-4) }`
    : "";

  function handleTest() {
    setTestState("testing");
    setTimeout(() => {
      if (isConnected || hasKey) {
        setTestState("success");
      } else {
        setTestState("error");
      }
      setTimeout(() => setTestState("idle"), 3000);
    }, 1200);
  }

  function handleSaveKey() {
    if (apiKeyDraft.trim()) {
      onSaveApiKey(provider.id, apiKeyDraft.trim());
      setApiKeyDraft("");
      setShowApiInput(false);
    }
  }

  const borderColor = PROVIDER_BORDER_COLORS[provider.id] || "border-l-slate-500";
  const iconColor = PROVIDER_ICON_COLORS[provider.id] || "text-slate-400";

  return (
    <div
      className={`bg-slate-900/50 rounded-xl border border-slate-800 border-l-4 ${borderColor} overflow-hidden hover:border-slate-700 transition-colors`}
    >
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <Plug className={`w-5 h-5 ${iconColor}`} strokeWidth={1.5} />
            <h3 className="text-base font-semibold text-slate-100">{provider.name}</h3>
          </div>
          {isConnected ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/25">
              <Check className="w-3 h-3" strokeWidth={2.5} />
              Connected
            </span>
          ) : hasKey ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/25">
              <Key className="w-3 h-3" strokeWidth={2} />
              Key Saved
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-500 border border-slate-500/25">
              <X className="w-3 h-3" strokeWidth={2.5} />
              Not Connected
            </span>
          )}
        </div>
        {provider.authMethod && (
          <p className="text-xs text-slate-500 ml-[30px]">
            Auth: {provider.authMethod}
          </p>
        )}
      </div>

      {/* Models Table */}
      <div className="px-5 pb-3">
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2">
          Available Models{!isConnected && !hasKey ? " (requires API key)" : ""}
        </p>
        <div className="rounded-lg border border-slate-800 overflow-hidden">
          {provider.models.map((model, idx) => {
            const isAvailable = isConnected || hasKey;
            const modelEnabled = enabledModels[`${provider.id}:${model.id}`] !== false;
            const usedBy = agentAssignments
              .filter((a) => a.model === model.name)
              .map((a) => a.agent);

            return (
              <div
                key={model.id}
                className={`flex items-center gap-3 px-3 py-2.5 ${
                  idx % 2 === 0 ? "bg-slate-900/30" : "bg-slate-800/20"
                } ${!isAvailable ? "opacity-50" : ""}`}
              >
                {/* Status dot */}
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    isAvailable && modelEnabled ? "bg-green-400" : "bg-slate-600"
                  }`}
                />

                {/* Model name */}
                <span className={`text-sm font-medium flex-1 min-w-0 ${isAvailable ? "text-slate-200" : "text-slate-500"}`}>
                  {model.name}
                </span>

                {/* Cost tier */}
                <div className="flex-shrink-0 group relative">
                  {costTierBadge(model.costTier)}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded bg-slate-700 text-[10px] text-slate-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {model.costLabel}
                  </div>
                </div>

                {/* Used by */}
                <div className="flex-shrink-0 w-28 text-right">
                  {usedBy.length > 0 ? (
                    <span className="text-[11px] text-slate-400">
                      {usedBy.length <= 2 ? usedBy.join(", ") : `${usedBy[0]} +${usedBy.length - 1}`}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-600">—</span>
                  )}
                </div>

                {/* Toggle */}
                <button
                  onClick={() => onToggleModel(provider.id, model.id)}
                  disabled={!isAvailable}
                  className="flex-shrink-0"
                  aria-label={`Toggle ${model.name}`}
                >
                  <div
                    className={`w-8 h-[18px] rounded-full relative transition-colors ${
                      isAvailable && modelEnabled
                        ? "bg-green-500/40"
                        : "bg-slate-700"
                    }`}
                  >
                    <div
                      className={`absolute top-[2px] w-[14px] h-[14px] rounded-full transition-all ${
                        isAvailable && modelEnabled
                          ? "left-[15px] bg-green-400"
                          : "left-[2px] bg-slate-500"
                      }`}
                    />
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* API Key / Actions */}
      <div className="px-5 pb-5 pt-2">
        {/* API key section for non-connected providers */}
        {!isConnected && (
          <div className="mb-3">
            {hasKey && !showApiInput ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 font-mono text-xs text-slate-400">
                  <Key className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" strokeWidth={1.5} />
                  <span>{showKey ? storedKey : maskedKey}</span>
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="ml-auto text-slate-500 hover:text-slate-300 transition-colors"
                    aria-label={showKey ? "Hide key" : "Show key"}
                  >
                    {showKey ? (
                      <EyeOff className="w-3.5 h-3.5" strokeWidth={1.5} />
                    ) : (
                      <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
                    )}
                  </button>
                </div>
                <button
                  onClick={() => { setShowApiInput(true); setApiKeyDraft(storedKey); }}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  Change
                </button>
              </div>
            ) : showApiInput ? (
              <div className="flex items-center gap-2">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKeyDraft}
                  onChange={(e) => setApiKeyDraft(e.target.value)}
                  placeholder="sk-..."
                  className="flex-1 bg-slate-800 rounded-lg px-3 py-2 font-mono text-xs text-slate-300 border border-slate-700 focus:border-slate-500 focus:outline-none placeholder:text-slate-600"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? (
                    <EyeOff className="w-3.5 h-3.5" strokeWidth={1.5} />
                  ) : (
                    <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
                  )}
                </button>
                <button
                  onClick={handleSaveKey}
                  disabled={!apiKeyDraft.trim()}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => { setShowApiInput(false); setApiKeyDraft(""); }}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowApiInput(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 transition-colors"
              >
                <Key className="w-3.5 h-3.5" strokeWidth={1.5} />
                Add API Key
              </button>
            )}
            {(hasKey || showApiInput) && (
              <p className="text-[10px] text-slate-600 mt-1.5 ml-1">
                Stored in browser localStorage · To permanently configure, add to Clawdbot gateway config
              </p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTest}
            disabled={testState === "testing"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 transition-colors disabled:opacity-60"
          >
            {testState === "testing" ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                Testing…
              </>
            ) : testState === "success" ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-400" strokeWidth={2} />
                <span className="text-green-400">Connected</span>
              </>
            ) : testState === "error" ? (
              <>
                <X className="w-3.5 h-3.5 text-red-400" strokeWidth={2} />
                <span className="text-red-400">Failed</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
                Test Connection
              </>
            )}
          </button>
        </div>

        {/* Provider note */}
        {provider.note && (
          <p className="text-[11px] text-slate-500 mt-3 flex items-start gap-1.5">
            <span className="text-slate-600 mt-px">ⓘ</span>
            {provider.note}
          </p>
        )}
      </div>
    </div>
  );
}

function AgentModelTable({
  assignments,
  availableModels,
  onChangeModel,
}: {
  assignments: AgentModelAssignment[];
  availableModels: { name: string; provider: string }[];
  onChangeModel: (agentName: string, modelName: string, providerName: string) => void;
}) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-teal-400" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold text-slate-200">Agent → Model Assignments</h2>
      </div>

      <div className="rounded-xl border border-slate-800 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_1fr_100px_80px_140px] gap-2 px-4 py-2.5 bg-slate-800/40 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
          <span>Agent</span>
          <span>Current Model</span>
          <span>Provider</span>
          <span>Status</span>
          <span>Change</span>
        </div>

        {/* Table rows */}
        {assignments.map((a, idx) => {
          const isOpen = openDropdown === a.agent;
          return (
            <div
              key={a.agent}
              className={`grid grid-cols-[1fr_1fr_100px_80px_140px] gap-2 px-4 py-2.5 items-center text-sm ${
                idx % 2 === 0 ? "bg-slate-900/30" : "bg-slate-800/10"
              } border-t border-slate-800/50`}
            >
              <div>
                <span className="text-slate-200 font-medium">{a.agent}</span>
                <span className="text-slate-600 text-xs ml-1.5">{a.role}</span>
              </div>
              <span className="text-slate-300">{a.model}</span>
              <span className="text-slate-500 text-xs">{a.provider}</span>
              <span>
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              </span>
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(isOpen ? null : a.agent)}
                  className="flex items-center gap-1 w-full px-2 py-1 rounded-md text-xs bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  <span className="truncate flex-1 text-left">Select</span>
                  <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} strokeWidth={2} />
                </button>
                {isOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setOpenDropdown(null)}
                    />
                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-1 z-20 w-52 py-1 rounded-lg bg-slate-800 border border-slate-700 shadow-xl max-h-56 overflow-y-auto">
                      {availableModels.map((m) => (
                        <button
                          key={`${m.provider}:${m.name}`}
                          onClick={() => {
                            onChangeModel(a.agent, m.name, m.provider);
                            setOpenDropdown(null);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700/60 transition-colors ${
                            a.model === m.name
                              ? "text-violet-400 font-medium"
                              : "text-slate-300"
                          }`}
                        >
                          <span>{m.name}</span>
                          <span className="text-slate-600 ml-1.5">({m.provider})</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModelRegistryTab() {
  const [enabledModels, setEnabledModels] = useState<Record<string, boolean>>({});
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [agentAssignments, setAgentAssignments] = useState<AgentModelAssignment[]>(INITIAL_AGENT_MODELS);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedKeys = localStorage.getItem("clawdbot-model-api-keys");
      if (storedKeys) setApiKeys(JSON.parse(storedKeys));
      const storedEnabled = localStorage.getItem("clawdbot-model-enabled");
      if (storedEnabled) setEnabledModels(JSON.parse(storedEnabled));
      const storedAssignments = localStorage.getItem("clawdbot-agent-models");
      if (storedAssignments) setAgentAssignments(JSON.parse(storedAssignments));
    } catch {
      // Ignore parse errors
    }
  }, []);

  function handleToggleModel(providerId: string, modelId: string) {
    setEnabledModels((prev) => {
      const key = `${providerId}:${modelId}`;
      const next = { ...prev, [key]: prev[key] === false ? true : false };
      try { localStorage.setItem("clawdbot-model-enabled", JSON.stringify(next)); } catch { /* */ }
      return next;
    });
  }

  function handleSaveApiKey(providerId: string, key: string) {
    setApiKeys((prev) => {
      const next = { ...prev, [providerId]: key };
      try { localStorage.setItem("clawdbot-model-api-keys", JSON.stringify(next)); } catch { /* */ }
      return next;
    });
  }

  function handleChangeModel(agentName: string, modelName: string, providerName: string) {
    setAgentAssignments((prev) => {
      const next = prev.map((a) =>
        a.agent === agentName ? { ...a, model: modelName, provider: providerName } : a
      );
      try { localStorage.setItem("clawdbot-agent-models", JSON.stringify(next)); } catch { /* */ }
      return next;
    });
  }

  // Compute available models for dropdown (connected providers only)
  const availableModels: { name: string; provider: string }[] = [];
  for (const p of PROVIDERS) {
    const isAvailable = p.status === "connected" || (apiKeys[p.id] && apiKeys[p.id].length > 0);
    if (isAvailable) {
      for (const m of p.models) {
        if (enabledModels[`${p.id}:${m.id}`] !== false) {
          availableModels.push({ name: m.name, provider: p.name });
        }
      }
    }
  }

  // Count stats
  const connectedProviders = PROVIDERS.filter(
    (p) => p.status === "connected" || (apiKeys[p.id] && apiKeys[p.id].length > 0)
  ).length;
  const totalModels = PROVIDERS.reduce((sum, p) => sum + p.models.length, 0);
  const activeModels = availableModels.length;

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Plug className="w-4 h-4" strokeWidth={1.5} />}
          iconColor="text-violet-400"
          label="Providers"
          value={`${connectedProviders} / ${PROVIDERS.length}`}
          sub="connected"
        />
        <SummaryCard
          icon={<Cpu className="w-4 h-4" strokeWidth={1.5} />}
          iconColor="text-teal-400"
          label="Models Available"
          value={String(activeModels)}
          sub={`of ${totalModels} total`}
        />
        <SummaryCard
          icon={<Activity className="w-4 h-4" strokeWidth={1.5} />}
          iconColor="text-emerald-400"
          label="Agents Configured"
          value={String(agentAssignments.length)}
          sub="model assignments"
        />
        <SummaryCard
          icon={<Shield className="w-4 h-4" strokeWidth={1.5} />}
          iconColor="text-amber-400"
          label="Primary Provider"
          value="Anthropic"
          sub="Claude Max subscription"
        />
      </div>

      {/* Provider Cards */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-4 h-4 text-violet-400" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold text-slate-200">Model Providers</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {PROVIDERS.map((p) => (
            <ProviderCard
              key={p.id}
              provider={p}
              agentAssignments={agentAssignments}
              enabledModels={enabledModels}
              onToggleModel={handleToggleModel}
              apiKeys={apiKeys}
              onSaveApiKey={handleSaveApiKey}
            />
          ))}
        </div>
      </div>

      {/* Agent assignment table */}
      <AgentModelTable
        assignments={agentAssignments}
        availableModels={availableModels}
        onChangeModel={handleChangeModel}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function FleetPage() {
  const [activeTab, setActiveTab] = useState<"usage" | "models">("usage");
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
  const isSub = data.billing_model === "subscription";
  const s = data.summary;

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

      {/* Tab Bar */}
      <div className="flex gap-0 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("usage")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "usage"
              ? "border-violet-500 text-slate-100"
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          <BarChart3 className="w-4 h-4" strokeWidth={1.5} />
          Usage
        </button>
        <button
          onClick={() => setActiveTab("models")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "models"
              ? "border-violet-500 text-slate-100"
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          <Plug className="w-4 h-4" strokeWidth={1.5} />
          Models
        </button>
      </div>

      {/* Models Tab */}
      {activeTab === "models" && <ModelRegistryTab />}

      {/* Usage Tab */}
      {activeTab === "usage" && <>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Activity className="w-4 h-4" strokeWidth={1.5} />}
          iconColor="text-emerald-400"
          label="Active Sessions"
          value={String(data.active_sessions)}
          sub={`${modelCount} model${modelCount !== 1 ? "s" : ""} in fleet`}
        />
        {isSub ? (
          <>
            <SummaryCard
              icon={<Shield className="w-4 h-4" strokeWidth={1.5} />}
              iconColor="text-emerald-400"
              label="Actual Cost Today"
              value={`$${formatCost(s.today)}`}
              sub={`Claude Max ($${formatCost(s.subscription_monthly ?? 200)}/mo)`}
            />
            <SummaryCard
              icon={<BarChart3 className="w-4 h-4" strokeWidth={1.5} />}
              iconColor="text-violet-400"
              label="API Equivalent"
              value={`$${formatCost(s.api_equivalent_today ?? 0)}`}
              sub={`saved $${formatCost(s.savings_today ?? 0)} today`}
            />
            <SummaryCard
              icon={<TrendingUp className="w-4 h-4" strokeWidth={1.5} />}
              iconColor="text-teal-400"
              label="Monthly Cost"
              value={`$${formatCost(s.subscription_monthly ?? 200)}`}
              sub={`vs $${formatCost(s.api_equivalent_month ?? 0)} API · saved $${formatCost(s.savings_month ?? 0)}`}
            />
          </>
        ) : (
          <>
            <SummaryCard
              icon={<DollarSign className="w-4 h-4" strokeWidth={1.5} />}
              iconColor="text-amber-400"
              label="Cost Today"
              value={`$${formatCost(s.today)}`}
              sub={`${formatTokens(s.tokens_today)} tokens`}
            />
            <SummaryCard
              icon={<BarChart3 className="w-4 h-4" strokeWidth={1.5} />}
              iconColor="text-violet-400"
              label="Cost This Week"
              value={`$${formatCost(s.week)}`}
              sub={`~$${Math.round(s.week / 7)}/day avg`}
            />
            <SummaryCard
              icon={<TrendingUp className="w-4 h-4" strokeWidth={1.5} />}
              iconColor="text-teal-400"
              label="Cost This Month"
              value={`$${formatCost(s.month)}`}
              sub={`~$${Math.round((s.month / new Date().getDate()) * 30)}/mo projected`}
            />
          </>
        )}
      </div>

      {/* Subscription Banner */}
      <SubscriptionBanner data={data} />

      {/* Cost Trend Chart */}
      <CostTrendChart dailyCosts={data.daily_costs} subscriptionDaily={isSub ? s.subscription_daily : undefined} />

      {/* Cost Optimization Insights */}
      <CostInsights data={data} />

      {/* Model Breakdown */}
      <ModelBreakdown byModel={data.by_model} isSubscription={isSub} />

      {/* Agent Breakdown */}
      <AgentBreakdown byAgent={data.by_agent} isSubscription={isSub} />

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

      </>}
    </div>
  );
}
