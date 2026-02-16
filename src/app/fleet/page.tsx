"use client";

import { useState } from "react";
import {
  Cpu,
  Activity,
  Zap,
  DollarSign,
  BarChart3,
  RefreshCw,
} from "lucide-react";

interface ModelData {
  id: string;
  name: string;
  provider: string;
  role: string;
  assignment: string;
  status: "active" | "idle";
  activeSessions: number;
  tokensToday: number;
  tokenLimit: number;
  costToday: number;
  avgLatency: string;
  uptime: string;
}

const mockModels: ModelData[] = [
  {
    id: "opus-4-6",
    name: "Claude Opus 4.6",
    provider: "Anthropic",
    role: "Primary reasoning",
    assignment: "Theo (COO), ScriptBot",
    status: "active",
    activeSessions: 3,
    tokensToday: 847_200,
    tokenLimit: 2_000_000,
    costToday: 12.71,
    avgLatency: "2.1s",
    uptime: "99.9%",
  },
  {
    id: "sonnet-4",
    name: "Claude Sonnet 4",
    provider: "Anthropic",
    role: "Code generation",
    assignment: "Atlas (CTO), Forge",
    status: "active",
    activeSessions: 2,
    tokensToday: 523_400,
    tokenLimit: 3_000_000,
    costToday: 4.19,
    avgLatency: "1.4s",
    uptime: "99.8%",
  },
  {
    id: "codex-5-3",
    name: "Codex 5.3",
    provider: "OpenAI",
    role: "Autonomous coding",
    assignment: "Pixel (Frontend Lead)",
    status: "idle",
    activeSessions: 0,
    tokensToday: 312_800,
    tokenLimit: 1_500_000,
    costToday: 3.13,
    avgLatency: "3.2s",
    uptime: "99.5%",
  },
  {
    id: "gemini-3-flash",
    name: "Gemini 3 Flash",
    provider: "Google",
    role: "Fast tasks & social",
    assignment: "Echo, Sentinel, Scout",
    status: "active",
    activeSessions: 1,
    tokensToday: 1_245_600,
    tokenLimit: 5_000_000,
    costToday: 1.87,
    avgLatency: "0.6s",
    uptime: "99.7%",
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    provider: "OpenAI",
    role: "Lightweight processing",
    assignment: "Cron jobs, monitoring",
    status: "idle",
    activeSessions: 0,
    tokensToday: 89_400,
    tokenLimit: 2_000_000,
    costToday: 0.27,
    avgLatency: "0.4s",
    uptime: "100%",
  },
  {
    id: "llama-4-scout",
    name: "Llama 4 Scout",
    provider: "Meta",
    role: "Research & analysis",
    assignment: "Venture (CRO)",
    status: "idle",
    activeSessions: 0,
    tokensToday: 156_200,
    tokenLimit: 3_000_000,
    costToday: 0.47,
    avgLatency: "1.8s",
    uptime: "98.9%",
  },
];

function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
  return count.toString();
}

function TokenBar({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min((used / limit) * 100, 100);
  const color =
    pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-primary-500";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-500 w-16 text-right">
        {formatTokens(used)}
      </span>
    </div>
  );
}

function ModelCard({ model }: { model: ModelData }) {
  const providerColors: Record<string, string> = {
    Anthropic: "text-primary-400 bg-primary-600/10 border-primary-600/20",
    OpenAI: "text-emerald-400 bg-emerald-600/10 border-emerald-600/20",
    Google: "text-blue-400 bg-blue-600/10 border-blue-600/20",
    Meta: "text-indigo-400 bg-indigo-600/10 border-indigo-600/20",
  };

  const providerGradients: Record<string, string> = {
    Anthropic: "from-primary-600/10 to-violet-600/5",
    OpenAI: "from-emerald-600/10 to-teal-600/5",
    Google: "from-blue-600/10 to-cyan-600/5",
    Meta: "from-indigo-600/10 to-purple-600/5",
  };

  return (
    <div
      className={`bg-gradient-to-br ${
        providerGradients[model.provider] || "from-slate-800/50 to-slate-900/50"
      } rounded-xl border border-slate-800 p-5 hover:border-slate-700 transition-colors`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-100 text-sm">{model.name}</h3>
          <span
            className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium border ${
              providerColors[model.provider] || "text-slate-400 bg-slate-800 border-slate-700"
            }`}
          >
            {model.provider}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              model.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-slate-500"
            }`}
          />
          <span className="text-xs text-slate-500">
            {model.status === "active" ? `${model.activeSessions} active` : "Idle"}
          </span>
        </div>
      </div>

      {/* Role & Assignment */}
      <div className="mb-4 space-y-1">
        <p className="text-xs text-slate-400">
          <span className="text-slate-500">Role:</span> {model.role}
        </p>
        <p className="text-xs text-slate-400">
          <span className="text-slate-500">Assigned:</span> {model.assignment}
        </p>
      </div>

      {/* Token Usage */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-500">Tokens today</span>
          <span className="text-xs text-slate-500">{formatTokens(model.tokenLimit)}</span>
        </div>
        <TokenBar used={model.tokensToday} limit={model.tokenLimit} />
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800/50">
        <div className="flex items-center gap-1">
          <DollarSign className="w-3 h-3 text-slate-500" />
          <span className="text-sm font-medium text-slate-300">${model.costToday.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>{model.avgLatency} avg</span>
          <span>{model.uptime}</span>
        </div>
      </div>
    </div>
  );
}

export default function FleetPage() {
  const [refreshing, setRefreshing] = useState(false);

  const totalSessions = mockModels.reduce((sum, m) => sum + m.activeSessions, 0);
  const totalTokens = mockModels.reduce((sum, m) => sum + m.tokensToday, 0);
  const totalCost = mockModels.reduce((sum, m) => sum + m.costToday, 0);
  const activeModels = mockModels.filter((m) => m.status === "active").length;

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600/20 rounded-lg flex items-center justify-center">
            <Cpu className="w-5 h-5 text-primary-400" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Model Fleet</h1>
            <p className="text-slate-500 text-sm">AI model assignments, usage & costs</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="btn btn-secondary flex items-center gap-2 text-sm"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            strokeWidth={1.5}
          />
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-emerald-400" strokeWidth={1.5} />
            <span className="text-xs text-slate-500 font-medium">Active Sessions</span>
          </div>
          <p className="text-2xl font-bold text-slate-100">{totalSessions}</p>
          <p className="text-xs text-slate-500 mt-1">{activeModels} models active</p>
        </div>

        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-primary-400" strokeWidth={1.5} />
            <span className="text-xs text-slate-500 font-medium">Tokens Today</span>
          </div>
          <p className="text-2xl font-bold text-slate-100">{formatTokens(totalTokens)}</p>
          <p className="text-xs text-slate-500 mt-1">across {mockModels.length} models</p>
        </div>

        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-amber-400" strokeWidth={1.5} />
            <span className="text-xs text-slate-500 font-medium">Est. Cost Today</span>
          </div>
          <p className="text-2xl font-bold text-slate-100">${totalCost.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-1">~${(totalCost * 30).toFixed(0)}/mo projected</p>
        </div>

        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-cyan-400" strokeWidth={1.5} />
            <span className="text-xs text-slate-500 font-medium">Avg Latency</span>
          </div>
          <p className="text-2xl font-bold text-slate-100">1.6s</p>
          <p className="text-xs text-slate-500 mt-1">weighted average</p>
        </div>
      </div>

      {/* Model Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockModels.map((model) => (
          <ModelCard key={model.id} model={model} />
        ))}
      </div>
    </div>
  );
}
