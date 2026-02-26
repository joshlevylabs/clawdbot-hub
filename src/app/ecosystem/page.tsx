"use client";

import { useEffect, useState } from "react";
import {
  Globe, Monitor, Smartphone, Database, ArrowRight, AlertTriangle,
  CheckCircle, Circle, ChevronDown, ChevronRight, Package, Zap,
  DollarSign, Link2, RefreshCw, ExternalLink, Layers, GitBranch
} from "lucide-react";

// ---- Types ----
interface Route { path: string; name: string; status: string; detail?: string }
interface ApiEndpoint { path: string; purpose: string }
interface DataFile { file: string; source: string }
interface FlowStep { target: string; action: string }
interface Flow { name: string; emoji: string; steps: FlowStep[] }
interface SyncIssue { issue: string; programs: string[]; impact?: string }
interface Revenue { stream: string; platform: string; status: string; potential: string }

interface Program {
  name: string; emoji: string; description: string; repo: string;
  stack: string[]; deploy: string; url: string | null;
  routes: Route[]; apis?: ApiEndpoint[]; dataFiles?: DataFile[];
  content?: Record<string, unknown>;
  components: unknown; hooks?: string[];
}

interface EcosystemData {
  lastUpdated: string;
  programs: Record<string, Program>;
  shared: Record<string, unknown>;
  flows: Record<string, Flow>;
  syncIssues: { critical: SyncIssue[]; attention: SyncIssue[] };
  revenue: Revenue[];
}

// ---- Colors ----
const programColors: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  website: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", glow: "shadow-blue-500/20" },
  hub: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/30", glow: "shadow-violet-500/20" },
  lever: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", glow: "shadow-emerald-500/20" },
};

const statusColors: Record<string, string> = {
  live: "text-emerald-400",
  built: "text-blue-400",
  "needs-content": "text-amber-400",
  planned: "text-slate-500",
};

const statusIcons: Record<string, typeof CheckCircle> = {
  live: CheckCircle,
  built: CheckCircle,
  "needs-content": AlertTriangle,
  planned: Circle,
};

// ---- Components ----

function ProgramCard({ id, program }: { id: string; program: Program }) {
  const [showRoutes, setShowRoutes] = useState(false);
  const [showApis, setShowApis] = useState(false);
  const colors = programColors[id] || programColors.website;
  const liveRoutes = program.routes.filter(r => r.status === "live" || r.status === "built").length;
  const totalRoutes = program.routes.length;
  const icon = id === "website" ? Globe : id === "hub" ? Monitor : Smartphone;
  const Icon = icon;

  return (
    <div className={`${colors.bg} rounded-xl border ${colors.border} overflow-hidden shadow-lg ${colors.glow}`}>
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors.bg} border ${colors.border}`}>
              <Icon className={`w-6 h-6 ${colors.text}`} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${colors.text}`}>{program.emoji} {program.name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{program.description}</p>
            </div>
          </div>
          {program.url && (
            <a href={program.url} target="_blank" rel="noopener noreferrer"
              className="text-slate-600 hover:text-slate-400 transition-colors">
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* Stack */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {program.stack.map(tech => (
            <span key={tech} className="px-2 py-0.5 bg-slate-800/60 rounded text-xs text-slate-400 border border-slate-700/50">
              {tech}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="text-center p-2 bg-slate-900/40 rounded-lg">
            <p className="text-lg font-bold text-slate-200">{liveRoutes}</p>
            <p className="text-xs text-slate-500">{id === "lever" ? "Screens" : "Pages"}</p>
          </div>
          <div className="text-center p-2 bg-slate-900/40 rounded-lg">
            <p className="text-lg font-bold text-slate-200">{program.apis?.length || 0}</p>
            <p className="text-xs text-slate-500">APIs</p>
          </div>
          <div className="text-center p-2 bg-slate-900/40 rounded-lg">
            <p className="text-lg font-bold text-slate-200">
              {Array.isArray(program.components) ? program.components.length :
                typeof program.components === "object" ?
                  Object.values(program.components as Record<string, string[]>).flat().length : 0}
            </p>
            <p className="text-xs text-slate-500">Components</p>
          </div>
        </div>

        {/* Deploy info */}
        <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
          <Zap className="w-3 h-3" />
          <span>{program.deploy}</span>
          {program.repo && (
            <>
              <span className="text-slate-700">·</span>
              <GitBranch className="w-3 h-3" />
              <span className="font-mono text-slate-600">{program.repo.replace(/^~\//, "")}</span>
            </>
          )}
        </div>
      </div>

      {/* Routes */}
      <div className="border-t border-slate-800/50">
        <button onClick={() => setShowRoutes(!showRoutes)}
          className="w-full px-5 py-2.5 flex items-center justify-between text-xs text-slate-400 hover:bg-slate-800/20 transition-colors">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            {id === "lever" ? "Screens" : "Routes"} ({totalRoutes})
          </span>
          {showRoutes ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
        {showRoutes && (
          <div className="px-5 pb-3 space-y-1">
            {program.routes.map(route => {
              const StatusIcon = statusIcons[route.status] || Circle;
              return (
                <div key={route.path} className="flex items-center gap-2 py-1">
                  <StatusIcon className={`w-3 h-3 flex-shrink-0 ${statusColors[route.status] || "text-slate-600"}`} />
                  <span className="font-mono text-xs text-slate-400">{route.path}</span>
                  <span className="text-xs text-slate-600">— {route.name}</span>
                  {route.detail && <span className="text-xs text-slate-700 italic ml-auto">{route.detail}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* APIs */}
      {program.apis && program.apis.length > 0 && (
        <div className="border-t border-slate-800/50">
          <button onClick={() => setShowApis(!showApis)}
            className="w-full px-5 py-2.5 flex items-center justify-between text-xs text-slate-400 hover:bg-slate-800/20 transition-colors">
            <span className="flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" />
              API Endpoints ({program.apis.length})
            </span>
            {showApis ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {showApis && (
            <div className="px-5 pb-3 space-y-1">
              {program.apis.map(api => (
                <div key={api.path} className="flex items-center gap-2 py-1">
                  <span className="font-mono text-xs text-slate-500">{api.path}</span>
                  <span className="text-xs text-slate-600">— {api.purpose}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FlowDiagram({ flow }: { flow: Flow }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
        <span className="flex items-center gap-2 text-sm text-slate-300">
          <span>{flow.emoji}</span>
          <span className="font-medium">{flow.name}</span>
          <span className="text-xs text-slate-600">({flow.steps.length} steps)</span>
        </span>
        {expanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
      </button>
      {expanded && (
        <div className="px-4 pb-3 space-y-1.5">
          {flow.steps.map((step, i) => {
            const colors = programColors[step.target] || { text: "text-slate-400", bg: "bg-slate-800/30", border: "border-slate-700" };
            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-slate-600 w-4 text-right">{i + 1}.</span>
                <ArrowRight className="w-3 h-3 text-slate-700" />
                <span className={`px-1.5 py-0.5 rounded text-xs ${colors.bg} ${colors.text} border ${colors.border}`}>
                  {step.target}
                </span>
                <span className="text-xs text-slate-400">{step.action}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SyncIssueCard({ issue, severity }: { issue: SyncIssue; severity: "critical" | "attention" }) {
  const isCritical = severity === "critical";
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${isCritical ? "bg-red-500/5 border border-red-500/20" : "bg-amber-500/5 border border-amber-500/20"}`}>
      <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isCritical ? "text-red-400" : "text-amber-400"}`} />
      <div>
        <p className="text-sm text-slate-300">{issue.issue}</p>
        <div className="flex items-center gap-2 mt-1">
          {issue.programs.map(p => {
            const colors = programColors[p] || { text: "text-slate-400", bg: "bg-slate-800", border: "border-slate-700" };
            return (
              <span key={p} className={`px-1.5 py-0.5 rounded text-xs ${colors.bg} ${colors.text} border ${colors.border}`}>
                {p}
              </span>
            );
          })}
          {issue.impact && <span className="text-xs text-slate-600 ml-2">— {issue.impact}</span>}
        </div>
      </div>
    </div>
  );
}

// ---- Main Page ----
export default function EcosystemPage() {
  const [data, setData] = useState<EcosystemData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/data/ecosystem-map.json")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-slate-500 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-slate-500 text-center py-12">Failed to load ecosystem data</div>;
  }

  const { programs, shared, flows, revenue } = data;
  const syncIssues = {
    critical: data.syncIssues?.critical || [],
    attention: data.syncIssues?.attention || [],
  };

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-primary-600/20 rounded-lg flex items-center justify-center">
            <Layers className="w-5 h-5 text-primary-400" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Ecosystem Map</h1>
            <p className="text-slate-500 text-sm">Three programs, one monorepo, shared backend</p>
          </div>
        </div>
      </div>

      {/* Architecture Diagram */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Database className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-medium text-amber-400">Supabase</span>
          <span className="text-xs text-slate-600 ml-2">Auth · Profiles · Signals · Compass · Faith · Newsletters · Agent Configs</span>
        </div>
        <div className="flex items-center justify-center gap-1 mb-4">
          <div className="w-px h-6 bg-slate-700" />
          <div className="w-px h-6 bg-slate-700 mx-16" />
          <div className="w-px h-6 bg-slate-700" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-500/5 rounded-xl border border-blue-500/20">
            <Globe className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="font-semibold text-blue-400">🌐 joshlevylabs.com</p>
            <p className="text-xs text-slate-500 mt-1">The Brand</p>
            <p className="text-xs text-slate-600 mt-0.5">{programs.website.routes.length} routes · {programs.website.apis?.length || 0} APIs</p>
          </div>
          <div className="text-center p-4 bg-violet-500/5 rounded-xl border border-violet-500/20">
            <Monitor className="w-8 h-8 text-violet-400 mx-auto mb-2" />
            <p className="font-semibold text-violet-400">🎛️ The Hub</p>
            <p className="text-xs text-slate-500 mt-1">Ops Center</p>
            <p className="text-xs text-slate-600 mt-0.5">{programs.hub.routes.length} routes · {programs.hub.apis?.length || 0} APIs</p>
          </div>
          <div className="text-center p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
            <Smartphone className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="font-semibold text-emerald-400">📱 Lever App</p>
            <p className="text-xs text-slate-500 mt-1">Consumer Mobile</p>
            <p className="text-xs text-slate-600 mt-0.5">{programs.lever.routes.length} screens · {programs.lever.hooks?.length || 0} hooks</p>
          </div>
        </div>
        {/* Shared layer */}
        <div className="flex items-center justify-center gap-1 mt-4">
          <div className="w-px h-4 bg-slate-700" />
        </div>
        <div className="flex items-center justify-center gap-3 mt-2">
          <Package className="w-4 h-4 text-slate-500" />
          <span className="text-xs text-slate-500">@joshlevylabs/shared</span>
          <span className="text-xs text-slate-700">·</span>
          <span className="text-xs text-slate-500">@joshlevylabs/ui</span>
          <span className="text-xs text-slate-700">·</span>
          <span className="text-xs text-slate-500">Edge Functions (5)</span>
        </div>
      </div>

      {/* Program Detail Cards */}
      <div>
        <h2 className="text-lg font-semibold text-slate-200 mb-4">Programs</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ProgramCard id="website" program={programs.website} />
          <ProgramCard id="hub" program={programs.hub} />
          <ProgramCard id="lever" program={programs.lever} />
        </div>
      </div>

      {/* Cross-Program Flows */}
      <div>
        <h2 className="text-lg font-semibold text-slate-200 mb-4">Cross-Program Flows</h2>
        <p className="text-sm text-slate-500 mb-3">When something changes in one program, these are the downstream effects.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.values(flows).map(flow => (
            <FlowDiagram key={flow.name} flow={flow} />
          ))}
        </div>
      </div>

      {/* Sync Issues */}
      <div>
        <h2 className="text-lg font-semibold text-slate-200 mb-4">
          Sync Issues
          <span className="ml-2 text-sm font-normal text-slate-500">
            ({syncIssues.critical.length} critical · {syncIssues.attention.length} attention)
          </span>
        </h2>
        <div className="space-y-2">
          {syncIssues.critical.map((issue, i) => (
            <SyncIssueCard key={`c-${i}`} issue={issue} severity="critical" />
          ))}
          {syncIssues.attention.map((issue, i) => (
            <SyncIssueCard key={`a-${i}`} issue={issue} severity="attention" />
          ))}
        </div>
      </div>

      {/* Revenue Map */}
      <div>
        <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-400" />
          Revenue Streams
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {revenue.map(r => (
            <div key={r.stream} className="bg-slate-900/50 rounded-lg border border-slate-800 p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-slate-300">{r.stream}</h4>
                <span className={`px-2 py-0.5 rounded-full text-xs ${r.status === "built" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-800 text-slate-500 border border-slate-700"}`}>
                  {r.status}
                </span>
              </div>
              <p className="text-xs text-slate-500">{r.platform}</p>
              <p className="text-xs text-slate-400 mt-1 font-medium">{r.potential}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="text-xs text-slate-700 text-center pb-4">
        Last updated: {data.lastUpdated} · Source: ~/clawd/ECOSYSTEM-MAP.md
      </p>
    </div>
  );
}
