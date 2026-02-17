"use client";

import { useState, useEffect, useMemo } from "react";
import {
  MessageSquare,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Circle,
  Play,
  Users,
  Clock,
  AlertTriangle,
  Target,
  TrendingUp,
  Zap,
  Calendar,
  ArrowRight,
  Bot,
  DollarSign,
  Filter,
  Cpu,
  Plus,
  Pencil,
  Trash2,
  Settings,
  Save,
  X,
} from "lucide-react";

// ---- Types ----

interface ActionItem {
  text: string;
  completed: boolean;
  assignee: string;
  priority: string;
  tag?: string; // "JOSHUA" | "AGENT"
  completedAt?: string;
  agentOutput?: string;
}

interface TranscriptEntry {
  speaker: string;
  role: string;
  message: string;
}

interface ReportMetrics {
  [key: string]: string | number | boolean;
}

interface Report {
  agent: string;
  role?: string;
  emoji?: string;
  description?: string;
  department?: string;
  directReports?: string[];
  highlights: string[];
  concerns: string[];
  metrics: ReportMetrics;
}

interface CEODirective {
  directive: string;
  setDate: string;
  priority: string;
}

interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  duration: number;
  model: string;
}

interface Standup {
  date: string;
  generatedAt: string;
  topic: string;
  status: "completed" | "in-progress";
  participants: { name: string; role: string; emoji?: string; description?: string }[];
  duration: string;
  reports: {
    cto?: Report;
    cro?: Report;
    cmo?: Report;
  };
  transcript: TranscriptEntry[];
  actionItems: ActionItem[];
  topPriorities: string[];
  ceoDirectives: CEODirective[];
  // New multi-standup fields
  type?: string;
  typeName?: string;
  typeEmoji?: string;
  conversationMode?: "ai" | "template";
  model?: string;
  tokenUsage?: TokenUsage | null;
  // Verticals & initiatives
  verticals?: string[];
  initiatives?: string[];
  verticalDetails?: VerticalDef[];
  initiativeDetails?: InitiativeDef[];
}

interface VerticalDef {
  key: string;
  name: string;
  emoji: string;
  description?: string;
  color?: string;
}

interface InitiativeDef {
  key: string;
  name: string;
  description?: string;
  verticals: string[];
  status: string;
  priority?: string;
}

interface StandupIndexEntry {
  date: string;
  topic: string;
  file: string;
  type?: string;
  typeName?: string;
  typeEmoji?: string;
  tokenCost?: number;
  verticals?: string[];
  initiatives?: string[];
}

interface StandupIndex {
  standups: StandupIndexEntry[];
}

interface JoshuaPriorities {
  date: string;
  generatedAt: string;
  priorities: { text: string; source: string; urgency: string; completed?: boolean; completedAt?: string }[];
  agentHandled: { text: string; assignee: string; status: string; completed?: boolean; completedAt?: string }[];
}

interface TokenLog {
  log: { date: string; type: string; estimatedCost: number }[];
  totals: { today: number; week: number; month: number; standupCount: number };
}

// ---- Agent Color Map ----
const roleColors: Record<string, { bg: string; text: string; border: string }> = {
  COO: { bg: "bg-violet-500/20", text: "text-violet-400", border: "border-violet-500/30" },
  CTO: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
  CRO: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30" },
  CMO: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
};
const defaultColor = { bg: "bg-slate-500/20", text: "text-slate-400", border: "border-slate-500/30" };

function getAgentColors(name: string, role?: string) {
  if (role && roleColors[role]) return roleColors[role];
  return defaultColor;
}

const roleIcons: Record<string, string> = { COO: "🏛️", CTO: "📡", CRO: "📈", CMO: "🎨" };

// Vertical color map
const verticalStyles: Record<string, { bg: string; text: string; border: string; emoji: string; label: string }> = {
  ecosystem: { bg: "bg-slate-500/20", text: "text-slate-300", border: "border-slate-500/30", emoji: "🌐", label: "Ecosystem" },
  joshlevylabs: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30", emoji: "🏠", label: "joshlevylabs.com" },
  hub: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30", emoji: "🔺", label: "Hub" },
  lever: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30", emoji: "📱", label: "Lever" },
};

// Type filter config
const TYPE_FILTERS = [
  { key: "all", label: "All", emoji: "📊" },
  { key: "daily-priorities", label: "Daily", emoji: "📋" },
  { key: "trading-review", label: "Trading", emoji: "📈" },
  { key: "content-pipeline", label: "Content", emoji: "🎙️" },
  { key: "tech-sprint", label: "Tech", emoji: "🔧" },
];

// Vertical filter config
const VERTICAL_FILTERS = [
  { key: "all", label: "All", emoji: "🔷" },
  { key: "ecosystem", label: "Ecosystem", emoji: "🌐" },
  { key: "joshlevylabs", label: "Website", emoji: "🏠" },
  { key: "hub", label: "Hub", emoji: "🔺" },
  { key: "lever", label: "Lever", emoji: "📱" },
];

// ---- Components ----

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    high: "bg-red-500/20 text-red-400 border-red-500/30",
    medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    low: "bg-slate-700/50 text-slate-400 border-slate-600/30",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${colors[priority] || colors.medium}`}>
      {priority.toUpperCase()}
    </span>
  );
}

function TagBadge({ tag }: { tag: string }) {
  const isJoshua = tag === "JOSHUA";
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
        isJoshua
          ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
          : "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
      }`}
    >
      {isJoshua ? "👤 JOSHUA" : "🤖 AGENT"}
    </span>
  );
}

function VerticalBadge({ verticalKey }: { verticalKey: string }) {
  const style = verticalStyles[verticalKey];
  if (!style) return null;
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${style.bg} ${style.text} ${style.border}`}>
      {style.emoji} {style.label}
    </span>
  );
}

function InitiativeBadge({ initiative }: { initiative: InitiativeDef }) {
  const priorityColors: Record<string, string> = {
    high: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    medium: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    low: "bg-slate-700/50 text-slate-400 border-slate-600/30",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${priorityColors[initiative.priority || "medium"] || priorityColors.medium}`}>
      🎯 {initiative.name}
    </span>
  );
}

function JoshuaPrioritiesCard({ priorities, onToggle }: { priorities: JoshuaPriorities | null; onToggle?: (type: string, index: number, completed: boolean) => void }) {
  if (!priorities || (!priorities.priorities.length && !priorities.agentHandled.length)) return null;

  const visiblePriorities = priorities.priorities.filter(p => !p.completed);
  const visibleAgentTasks = priorities.agentHandled.filter(a => a.status !== "done" && !a.completed);

  if (visiblePriorities.length === 0 && visibleAgentTasks.length === 0) {
    return (
      <div className="bg-gradient-to-br from-emerald-600/10 to-emerald-800/5 rounded-xl border border-emerald-500/20 p-5">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-400" strokeWidth={1.5} />
          <h2 className="font-semibold text-slate-100 text-sm">All Clear!</h2>
          <span className="text-xs text-slate-500">All priorities and tasks completed</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Joshua's Items */}
      {visiblePriorities.length > 0 && (
        <div className="bg-gradient-to-br from-purple-600/10 to-purple-800/5 rounded-xl border border-purple-500/20 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-purple-400" strokeWidth={1.5} />
            <h2 className="font-semibold text-slate-100 text-sm">Joshua&apos;s Priorities</h2>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
              {visiblePriorities.length} REMAINING
            </span>
          </div>
          <div className="space-y-2">
            {priorities.priorities.map((p, i) => {
              if (p.completed) return null;
              const isCompleted = p.completed;
              return (
                <div
                  key={i}
                  className={`w-full text-left flex items-start gap-3 p-2.5 rounded-lg transition-colors ${
                    isCompleted ? "bg-emerald-500/5 opacity-60" : "bg-purple-500/5 hover:bg-purple-500/10"
                  }`}
                >
                  <button
                    onClick={() => onToggle?.("priority", i, !isCompleted)}
                    className="flex-shrink-0 mt-0.5 hover:scale-110 transition-transform"
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-purple-400/50 hover:text-purple-400" />
                    )}
                  </button>
                  <div className="flex-1">
                    <p className={`text-sm leading-relaxed ${isCompleted ? "text-slate-500 line-through" : "text-slate-200"}`}>
                      {p.text}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <PriorityBadge priority={p.urgency} />
                      <span className="text-[10px] text-slate-600">from {p.source}</span>
                      {isCompleted && p.completedAt && (
                        <>
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            ✓ Completed by Joshua
                          </span>
                          <span className="text-[10px] text-slate-600">
                            {new Date(p.completedAt).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Agent-Handled Items — only show pending ones */}
      {visibleAgentTasks.length > 0 && (
        <div className="bg-gradient-to-br from-cyan-600/10 to-cyan-800/5 rounded-xl border border-cyan-500/20 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-cyan-400" strokeWidth={1.5} />
            <h2 className="font-semibold text-slate-100 text-sm">Pending Agent Tasks</h2>
          </div>
          <div className="space-y-2">
            {priorities.agentHandled.map((a, i) => {
              if (a.status === "done" || a.completed) return null;
              return (
                <button
                  key={i}
                  onClick={() => onToggle?.("agent", i, true)}
                  className="w-full text-left flex items-center gap-3 p-2 rounded-lg transition-colors bg-cyan-500/5 hover:bg-cyan-500/10"
                >
                  <Circle className="w-4 h-4 text-cyan-400/50 flex-shrink-0 hover:text-cyan-400" />
                  <div className="flex-1">
                    <p className="text-sm text-slate-300">{a.text}</p>
                    <p className="text-xs text-slate-600 mt-0.5">→ {a.assignee} · {a.status}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Items (Last 7 Days) */}
      {priorities && (() => {
        const completedItems = priorities.priorities
          .filter(p => p.completed && p.completedAt)
          .filter(p => {
            const completedDate = new Date(p.completedAt!);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return completedDate >= weekAgo;
          })
          .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

        return completedItems.length > 0 ? (
          <div className="bg-gradient-to-br from-emerald-600/10 to-emerald-800/5 rounded-xl border border-emerald-500/20 p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-emerald-400" strokeWidth={1.5} />
              <h2 className="font-semibold text-slate-100 text-sm">Completed by Joshua</h2>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                LAST 7 DAYS
              </span>
            </div>
            <div className="space-y-2">
              {completedItems.map((p, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-emerald-500/5 opacity-75">
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed text-slate-400 line-through">{p.text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <PriorityBadge priority={p.urgency} />
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        ✓ Completed by Joshua
                      </span>
                      <span className="text-[10px] text-slate-600">
                        {new Date(p.completedAt!).toLocaleDateString()} - from {p.source}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null;
      })()}
    </div>
  );
}

function TokenUsageWidget({ tokenLog }: { tokenLog: TokenLog | null }) {
  if (!tokenLog) return null;
  const { totals } = tokenLog;

  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Cpu className="w-4 h-4 text-slate-500" strokeWidth={1.5} />
        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Token Costs</p>
      </div>
      <div className="grid grid-cols-3 gap-2 lg:gap-3">
        <div className="text-center min-w-0">
          <p className="text-sm lg:text-lg font-bold text-slate-200 truncate">${totals.today.toFixed(3)}</p>
          <p className="text-[10px] text-slate-500">Today</p>
        </div>
        <div className="text-center min-w-0">
          <p className="text-sm lg:text-lg font-bold text-slate-200 truncate">${totals.week.toFixed(3)}</p>
          <p className="text-[10px] text-slate-500">Week</p>
        </div>
        <div className="text-center min-w-0">
          <p className="text-sm lg:text-lg font-bold text-slate-200 truncate">${totals.month.toFixed(3)}</p>
          <p className="text-[10px] text-slate-500">Month</p>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-slate-800 text-center">
        <p className="text-[10px] text-slate-600">{totals.standupCount} standups total</p>
      </div>
    </div>
  );
}

function DirectivesCard({ directives }: { directives: CEODirective[] }) {
  if (!directives.length) return null;
  return (
    <div className="bg-gradient-to-br from-amber-600/10 to-amber-800/5 rounded-xl border border-amber-500/20 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-amber-400" strokeWidth={1.5} />
        <h2 className="font-semibold text-slate-100 text-sm">CEO Directives</h2>
      </div>
      <div className="space-y-2">
        {directives.map((d, i) => (
          <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-amber-500/5">
            <ArrowRight className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" strokeWidth={2} />
            <div className="flex-1">
              <p className="text-sm text-slate-200">{d.directive}</p>
              <p className="text-xs text-slate-500 mt-0.5">Set {d.setDate} · {d.priority} priority</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportCard({ title, icon, report }: { title: string; icon: string; report: Report }) {
  const [expanded, setExpanded] = useState(false);
  const colors = getAgentColors(report.agent, report.role || title);

  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{icon}</span>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm">{title}</h3>
            <p className={`text-xs ${colors.text}`}>{report.agent}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {report.concerns.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              {report.concerns.length}
            </span>
          )}
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-slate-800 px-4 py-3 space-y-3">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1.5">Highlights</p>
            <ul className="space-y-1">
              {report.highlights.map((h, i) => (
                <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>{h}
                </li>
              ))}
            </ul>
          </div>
          {report.concerns.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1.5">Concerns</p>
              <ul className="space-y-1">
                {report.concerns.map((c, i) => (
                  <li key={i} className="text-sm text-amber-300/80 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />{c}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1.5">Metrics</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(report.metrics).map(([key, val]) => (
                <span key={key} className="px-2 py-1 bg-slate-800/60 rounded text-xs text-slate-400 border border-slate-700/50">
                  <span className="text-slate-500">{key.replace(/([A-Z])/g, " $1").trim()}:</span>{" "}
                  <span className="text-slate-200">{typeof val === "boolean" ? (val ? "✅" : "❌") : String(val)}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StandupDetail({ standup, onToggleActionItem }: { standup: Standup; onToggleActionItem?: (text: string, completed: boolean) => void }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const completedActions = standup.actionItems.filter((a) => a.completed).length;
  const totalActions = standup.actionItems.length;

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  };

  // Detect tag from text if not present as field
  const getTag = (item: ActionItem): string => {
    if (item.tag) return item.tag;
    if (item.text.startsWith("[JOSHUA]")) return "JOSHUA";
    if (item.text.startsWith("[AGENT]")) return "AGENT";
    return "AGENT";
  };

  const cleanText = (item: ActionItem): string => {
    return item.text.replace(/^\[(JOSHUA|AGENT)\]\s*/, "");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        {standup.typeEmoji && standup.typeName && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary-500/20 text-primary-400 border border-primary-500/30">
            {standup.typeEmoji} {standup.typeName}
          </span>
        )}
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <Calendar className="w-3 h-3" /> {formatDate(standup.date)}
        </span>
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <Clock className="w-3 h-3" /> {standup.duration}
        </span>
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <Users className="w-3 h-3" /> {standup.participants.length} agents
        </span>
        {standup.conversationMode && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
            standup.conversationMode === "ai"
              ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
              : "bg-slate-700/50 text-slate-400 border border-slate-600/30"
          }`}>
            {standup.conversationMode === "ai" ? "🤖 AI Conversation" : "📝 Template"}
          </span>
        )}
        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          {standup.status}
        </span>
      </div>

      {/* Verticals & Initiatives */}
      {((standup.verticals && standup.verticals.length > 0) || (standup.initiativeDetails && standup.initiativeDetails.length > 0)) && (
        <div className="flex items-center gap-2 flex-wrap">
          {standup.verticals?.map((vk) => (
            <VerticalBadge key={vk} verticalKey={vk} />
          ))}
          {standup.initiativeDetails?.map((ini) => (
            <InitiativeBadge key={ini.key} initiative={ini} />
          ))}
        </div>
      )}

      {/* Participants */}
      <div className="flex items-center gap-2 flex-wrap">
        {standup.participants.map((p) => {
          const colors = getAgentColors(p.name, p.role);
          return (
            <span key={p.name} className={`px-2.5 py-1 rounded-lg text-xs border ${colors.bg} ${colors.text} ${colors.border}`}>
              {p.emoji || roleIcons[p.role] || "👤"} {p.name} · {p.role}
            </span>
          );
        })}
      </div>

      {/* Top Priorities */}
      {standup.topPriorities && standup.topPriorities.length > 0 && (
        <div className="bg-gradient-to-br from-primary-600/10 to-primary-800/5 rounded-xl border border-primary-500/20 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-primary-400" strokeWidth={1.5} />
            <h2 className="font-semibold text-slate-100 text-sm">Priorities from this Standup</h2>
          </div>
          <div className="space-y-3">
            {standup.topPriorities.map((p, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary-400">{i + 1}</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">{p}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Domain Reports */}
      <div className="space-y-2">
        {standup.reports.cto && <ReportCard title="Tech Health" icon="📡" report={standup.reports.cto} />}
        {standup.reports.cro && <ReportCard title="Revenue & Trading" icon="📈" report={standup.reports.cro} />}
        {standup.reports.cmo && <ReportCard title="Content Pipeline" icon="🎨" report={standup.reports.cmo} />}
      </div>

      {/* Action Items */}
      {totalActions > 0 && (
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Action Items</p>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: totalActions > 0 ? `${(completedActions / totalActions) * 100}%` : "0%" }} />
              </div>
              <span className="text-xs text-slate-500">{completedActions}/{totalActions}</span>
            </div>
          </div>
          <div className="space-y-2">
            {standup.actionItems.map((item, i) => {
              const isJoshua = getTag(item) === "JOSHUA";
              const isCompleted = item.completed;
              return (
                <div key={i} className={`flex items-start gap-3 p-2 rounded-lg ${isCompleted ? "bg-emerald-500/5 opacity-60" : "bg-slate-800/20"}`}>
                  {isJoshua ? (
                    <button
                      onClick={() => onToggleActionItem?.(cleanText(item), !isCompleted)}
                      className="flex-shrink-0 mt-0.5 hover:scale-110 transition-transform"
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Circle className="w-4 h-4 text-purple-400 hover:text-purple-300" />
                      )}
                    </button>
                  ) : (
                    isCompleted ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                    )
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm ${isCompleted ? "text-slate-500 line-through" : "text-slate-300"}`}>
                        {cleanText(item)}
                      </p>
                      <TagBadge tag={getTag(item)} />
                      <PriorityBadge priority={item.priority} />
                      {isCompleted && item.completedAt && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          ✓ Completed by Joshua
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">→ {item.assignee}</p>
                    {isCompleted && item.completedAt && (
                      <p className="text-xs text-slate-600 mt-0.5">
                        Completed {new Date(item.completedAt).toLocaleDateString()}
                      </p>
                    )}
                    {isCompleted && item.agentOutput && (
                      <p className="text-xs text-emerald-400/70 mt-1 bg-emerald-500/5 px-2 py-1 rounded">
                        🤖 {item.agentOutput}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transcript Toggle */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Full Transcript</span>
          </div>
          {showTranscript ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
        </button>
        {showTranscript && (
          <div className="border-t border-slate-800 px-4 py-3 space-y-3">
            {standup.transcript.map((entry, i) => {
              const colors = getAgentColors(entry.speaker, entry.role);
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${colors.bg}`}>
                    <span className={`text-xs font-medium ${colors.text}`}>{entry.speaker.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${colors.text}`}>
                      {entry.speaker} <span className="text-slate-600">· {entry.role}</span>
                    </p>
                    <p className="text-sm text-slate-400 mt-0.5 leading-relaxed">{entry.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Token cost footer */}
      {standup.tokenUsage && (
        <div className="flex items-center justify-end gap-2 text-[10px] text-slate-600">
          <Cpu className="w-3 h-3" />
          <span>{standup.tokenUsage.total_tokens} tokens · ${standup.tokenUsage.estimated_cost.toFixed(4)} · {standup.tokenUsage.model}</span>
        </div>
      )}
    </div>
  );
}

function StandupHistoryItem({
  entry,
  isSelected,
  onClick,
}: {
  entry: StandupIndexEntry;
  isSelected: boolean;
  onClick: () => void;
}) {
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <button
      onClick={onClick}
      className={`w-full lg:w-auto flex-shrink-0 text-left px-3 py-2 rounded-lg text-sm transition-colors ${
        isSelected
          ? "bg-primary-600/20 border border-primary-500/30 text-primary-300"
          : "bg-slate-900/30 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
      }`}
    >
      <div className="flex items-center gap-1.5">
        {entry.typeEmoji && <span className="text-xs">{entry.typeEmoji}</span>}
        <p className={`font-medium text-xs ${isSelected ? "text-primary-300" : "text-slate-300"}`}>
          {entry.typeName || formatDate(entry.date)}
        </p>
      </div>
      <p className={`text-xs mt-0.5 truncate ${isSelected ? "text-primary-400/70" : "text-slate-500"}`}>
        {formatDate(entry.date)}
      </p>
      {entry.verticals && entry.verticals.length > 0 && entry.verticals[0] !== "ecosystem" && (
        <div className="flex items-center gap-1 mt-1">
          {entry.verticals.slice(0, 3).map((vk) => {
            const s = verticalStyles[vk];
            return s ? (
              <span key={vk} className={`text-[9px] ${s.text}`} title={s.label}>{s.emoji}</span>
            ) : null;
          })}
        </div>
      )}
      {entry.tokenCost != null && entry.tokenCost > 0 && (
        <p className="text-[10px] text-slate-600 mt-0.5">${entry.tokenCost.toFixed(4)}</p>
      )}
    </button>
  );
}

// ---- Tab Types ----
type TabType = "history" | "scheduled" | "manage";

// ---- Scheduled Standup Types ----
interface ScheduledStandupType {
  key: string;
  name: string;
  emoji: string;
  schedule: string;
  time: string;
  participants: string[];
  agenda: string;
  autoExecute?: boolean;
  verticals?: string[];
  initiatives?: string[];
}

interface ScheduleData {
  types: ScheduledStandupType[];
}

// ---- Scheduled View Component ----
function ScheduledView() {
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOneTimeForm, setShowOneTimeForm] = useState(false);
  const [oneTimeData, setOneTimeData] = useState<any>({});

  useEffect(() => {
    async function fetchData() {
      try {
        const scheduleRes = await fetch("/api/standup-schedules", { cache: "no-store" });

        // Fallback to JSON if API isn't ready
        if (!scheduleRes.ok) {
          const fallbackRes = await fetch("/data/standups/schedule.json");
          if (fallbackRes.ok) {
            setScheduleData(await fallbackRes.json());
          }
        } else {
          const data = await scheduleRes.json();
          setScheduleData({ types: data.schedules || [] });
        }
      } catch (err) {
        console.error("Failed to load data:", err);
        // Fallback to JSON
        try {
          const res = await fetch("/data/standups/schedule.json");
          if (res.ok) {
            setScheduleData(await res.json());
          }
        } catch (fallbackErr) {
          console.error("Fallback failed:", fallbackErr);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getTodayStandups = () => {
    if (!scheduleData) return { upcoming: [], past: [] };
    
    // Get current time in PT timezone
    const now = new Date();
    const ptTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',  
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(now);
    
    const today = ptTime.find(p => p.type === 'weekday')?.value.toLowerCase() || '';
    const currentHour = parseInt(ptTime.find(p => p.type === 'hour')?.value || '0');
    const currentMinute = parseInt(ptTime.find(p => p.type === 'minute')?.value || '0');
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    const todayStandups = scheduleData.types.filter(type => {
      return type.schedule === 'daily' || type.schedule === today || type.schedule === `once-${today}`;
    }).sort((a, b) => a.time.localeCompare(b.time));

    const upcoming = todayStandups.filter(type => {
      const [h, m] = type.time.split(':').map(Number);
      return h * 60 + m > currentTimeMinutes;
    });

    const past = todayStandups.filter(type => {
      const [h, m] = type.time.split(':').map(Number);
      return h * 60 + m <= currentTimeMinutes;
    });

    return { upcoming, past };
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Los_Angeles'
    });
  };

  const getScheduleLabel = (schedule: string) => {
    if (schedule === 'daily') return 'Daily';
    if (schedule.startsWith('once-')) return 'One-time';
    return schedule.charAt(0).toUpperCase() + schedule.slice(1);
  };

  // Helper function to get next 30 days with standup counts
  const getNext30Days = () => {
    if (!scheduleData) return [];
    
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dayName = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        weekday: 'long'
      }).format(date).toLowerCase();
      
      const matchesDay = (type: ScheduledStandupType) => {
        if (type.schedule === 'daily') return true;
        if (type.schedule === dayName) return true;
        // One-time standups only show on their specific day (today only for simplicity)
        if (type.schedule === `once-${dayName}` && i === 0) return true;
        return false;
      };
      
      const standupsCount = scheduleData.types.filter(matchesDay).length;
      
      days.push({
        date: date,
        dayNumber: date.getDate(),
        isToday: i === 0,
        dayName: dayName,
        standupsCount: standupsCount,
        standups: scheduleData.types.filter(matchesDay).sort((a, b) => a.time.localeCompare(b.time))
      });
    }
    
    return days;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  const handleAddOneTime = async (data: any) => {
    try {
      // Generate a unique key for one-time standups
      const key = `onetime-${Date.now()}`;
      const today = new Date().toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'long' }).toLowerCase();
      const payload = {
        key,
        name: data.name || 'Ad-hoc Standup',
        emoji: data.emoji || '📋',
        schedule: `once-${today}`,
        time: data.time || '14:00',
        participants: data.participants || ['COO'],
        agenda: data.agenda || '',
        autoExecute: false,
      };

      const response = await fetch('/api/standup-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        setScheduleData(prev => prev ? {
          ...prev,
          types: [...prev.types, result.schedule]
        } : { types: [result.schedule] });
        setShowOneTimeForm(false);
        setOneTimeData({});
      } else {
        console.error('Failed to create one-time standup');
      }
    } catch (err) {
      console.error('Error creating one-time standup:', err);
    }
  };

  const { upcoming, past } = getTodayStandups();
  const next30Days = getNext30Days();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-slate-200">Scheduled Standups</h2>
        <button
          onClick={() => {
            setOneTimeData({});
            setShowOneTimeForm(true);
          }}
          className="btn btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Standup
        </button>
      </div>

      {/* Upcoming Standups */}
      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Upcoming Today
        </h3>
        {upcoming.length === 0 ? (
          <div className="text-sm text-slate-400 bg-slate-900/30 rounded-lg p-4 border border-slate-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            All standups completed for today ✅
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((standup) => (
              <div key={standup.key} className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
                <div className="flex items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{standup.emoji}</span>
                      <h4 className="font-medium text-slate-100">{standup.name}</h4>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary-500/20 text-primary-400 border border-primary-500/30">
                        {formatTime(standup.time)} PT
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mb-3 leading-relaxed">{standup.agenda}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {standup.participants.map((role) => {
                        const colors = getAgentColors("", role);
                        return (
                          <span key={role} className={`px-2 py-1 rounded-lg text-xs border ${colors.bg} ${colors.text} ${colors.border}`}>
                            {roleIcons[role] || "👤"} {role}
                          </span>
                        );
                      })}
                      <span className="px-2 py-0.5 rounded text-xs bg-slate-700/50 text-slate-500 border border-slate-600/30">
                        {getScheduleLabel(standup.schedule)}
                      </span>
                      {standup.autoExecute && (
                        <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400 border border-green-500/30">
                          Auto-Execute
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Standups (Today) */}
      {past.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500/50" />
            Earlier Today
          </h3>
          <div className="space-y-2">
            {past.map((standup) => (
              <div key={standup.key} className="bg-slate-900/30 rounded-xl border border-slate-800/50 p-3 opacity-60">
                <div className="flex items-center gap-2">
                  <span className="text-base">{standup.emoji}</span>
                  <h4 className="font-medium text-slate-400 text-sm">{standup.name}</h4>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700/30 text-slate-500 border border-slate-700/30 line-through">
                    {formatTime(standup.time)} PT
                  </span>
                  <CheckCircle className="w-3.5 h-3.5 text-green-500/50 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 30-Day Calendar View */}
      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Next 30 Days
        </h3>
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
          <div className="grid grid-cols-7 gap-2">
            {next30Days.map((day, index) => (
              <div
                key={index}
                className={`
                  relative p-3 rounded-lg border text-center cursor-pointer transition-colors
                  ${day.isToday 
                    ? 'bg-primary-500/20 border-primary-500/50 text-primary-300' 
                    : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }
                `}
                title={`${day.date.toLocaleDateString('en-US', { 
                  timeZone: 'America/Los_Angeles',
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}: ${day.standupsCount} standup${day.standupsCount !== 1 ? 's' : ''}`}
              >
                <div className="font-medium text-sm">{day.dayNumber}</div>
                {day.standupsCount > 0 && (
                  <div className={`
                    absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center
                    ${day.isToday 
                      ? 'bg-primary-400 text-slate-900' 
                      : 'bg-slate-600 text-slate-200'
                    }
                  `}>
                    {day.standupsCount}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Calendar Legend */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-700 text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-primary-500/20 border border-primary-500/50"></div>
              <span>Today</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-slate-600 text-slate-200 text-xs flex items-center justify-center font-bold">4</div>
              <span>Standup count</span>
            </div>
          </div>
        </div>
      </div>

      {/* One-Time Standup Form Modal */}
      {showOneTimeForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-slate-100">Add One-Time Standup</h3>
              <button
                onClick={() => {
                  setShowOneTimeForm(false);
                  setOneTimeData({});
                }}
                className="p-1 hover:bg-slate-700 rounded"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">Schedule a single standup for today to discuss specific topics.</p>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddOneTime(oneTimeData);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Topic / Name</label>
                <input
                  type="text"
                  value={oneTimeData.name || ''}
                  onChange={(e) => setOneTimeData({ ...oneTimeData, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200"
                  placeholder="MRE V14 Review"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Time (PT)</label>
                  <input
                    type="time"
                    value={oneTimeData.time || ''}
                    onChange={(e) => setOneTimeData({ ...oneTimeData, time: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Emoji</label>
                  <input
                    type="text"
                    value={oneTimeData.emoji || ''}
                    onChange={(e) => setOneTimeData({ ...oneTimeData, emoji: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200"
                    placeholder="📋"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Agenda / Topics</label>
                <textarea
                  value={oneTimeData.agenda || ''}
                  onChange={(e) => setOneTimeData({ ...oneTimeData, agenda: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200"
                  rows={3}
                  placeholder="Discuss MRE V14 performance, review 48hr monitoring results..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Participants</label>
                <div className="flex flex-wrap gap-2">
                  {['COO', 'CTO', 'CRO', 'CMO'].map((role) => (
                    <label key={role} className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 cursor-pointer hover:border-slate-600">
                      <input
                        type="checkbox"
                        checked={oneTimeData.participants?.includes(role) || false}
                        onChange={(e) => {
                          const current = oneTimeData.participants || [];
                          if (e.target.checked) {
                            setOneTimeData({ ...oneTimeData, participants: [...current, role] });
                          } else {
                            setOneTimeData({ ...oneTimeData, participants: current.filter((r: string) => r !== role) });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-slate-300">{roleIcons[role] || '👤'} {role}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <button type="submit" className="btn btn-primary flex-1">
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowOneTimeForm(false);
                    setOneTimeData({});
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Manage View Component ----
function ManageView() {
  const [verticals, setVerticals] = useState<VerticalDef[]>([]);
  const [initiatives, setInitiatives] = useState<InitiativeDef[]>([]);
  const [recurringStandups, setRecurringStandups] = useState<ScheduledStandupType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVerticalForm, setShowVerticalForm] = useState(false);
  const [showInitiativeForm, setShowInitiativeForm] = useState(false);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [editingVertical, setEditingVertical] = useState<VerticalDef | null>(null);
  const [editingInitiative, setEditingInitiative] = useState<InitiativeDef | null>(null);
  const [editingRecurring, setEditingRecurring] = useState<ScheduledStandupType | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'vertical' | 'initiative' | 'recurring', key: string } | null>(null);
  const [formData, setFormData] = useState<any>({});

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/Los_Angeles'
    });
  };

  const getScheduleLabel = (schedule: string) => {
    if (schedule === 'daily') return 'Daily';
    if (schedule.startsWith('once-')) return 'One-time';
    return schedule.charAt(0).toUpperCase() + schedule.slice(1);
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const [verticalsRes, initiativesRes, recurringRes] = await Promise.all([
          fetch('/api/verticals', { cache: 'no-store' }),
          fetch('/api/initiatives', { cache: 'no-store' }),
          fetch('/api/standup-schedules', { cache: 'no-store' })
        ]);

        if (verticalsRes.ok) {
          const verticalsData = await verticalsRes.json();
          setVerticals(verticalsData.verticals || []);
        }

        if (initiativesRes.ok) {
          const initiativesData = await initiativesRes.json();
          setInitiatives(initiativesData.initiatives || []);
        }

        if (recurringRes.ok) {
          const recurringData = await recurringRes.json();
          setRecurringStandups(recurringData.schedules || []);
        }
      } catch (err) {
        console.error('Failed to load manage data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSaveVertical = async (data: any) => {
    try {
      const method = editingVertical ? 'PATCH' : 'POST';
      const response = await fetch('/api/verticals', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const result = await response.json();
        if (editingVertical) {
          setVerticals(prev => prev.map(v => v.key === data.key ? result.vertical : v));
        } else {
          setVerticals(prev => [...prev, result.vertical]);
        }
        setShowVerticalForm(false);
        setEditingVertical(null);
        setFormData({});
      } else {
        console.error('Failed to save vertical');
      }
    } catch (err) {
      console.error('Error saving vertical:', err);
    }
  };

  const handleSaveInitiative = async (data: any) => {
    try {
      const method = editingInitiative ? 'PATCH' : 'POST';
      const response = await fetch('/api/initiatives', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const result = await response.json();
        if (editingInitiative) {
          setInitiatives(prev => prev.map(i => i.key === data.key ? result.initiative : i));
        } else {
          setInitiatives(prev => [...prev, result.initiative]);
        }
        setShowInitiativeForm(false);
        setEditingInitiative(null);
        setFormData({});
      } else {
        console.error('Failed to save initiative');
      }
    } catch (err) {
      console.error('Error saving initiative:', err);
    }
  };

  const handleSaveRecurring = async (data: any) => {
    try {
      const method = editingRecurring ? 'PATCH' : 'POST';
      const response = await fetch('/api/standup-schedules', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const result = await response.json();
        if (editingRecurring) {
          setRecurringStandups(prev => prev.map(r => r.key === data.key ? result.schedule : r));
        } else {
          setRecurringStandups(prev => [...prev, result.schedule]);
        }
        setShowRecurringForm(false);
        setEditingRecurring(null);
        setFormData({});
      } else {
        console.error('Failed to save recurring standup');
      }
    } catch (err) {
      console.error('Error saving recurring standup:', err);
    }
  };

  const handleDelete = async (type: 'vertical' | 'initiative' | 'recurring', key: string) => {
    try {
      let endpoint: string;
      if (type === 'vertical') endpoint = 'verticals';
      else if (type === 'initiative') endpoint = 'initiatives';
      else endpoint = 'standup-schedules';
      
      const response = await fetch(`/api/${endpoint}?key=${encodeURIComponent(key)}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        if (type === 'vertical') {
          setVerticals(prev => prev.filter(v => v.key !== key));
        } else if (type === 'initiative') {
          setInitiatives(prev => prev.filter(i => i.key !== key));
        } else if (type === 'recurring') {
          setRecurringStandups(prev => prev.filter(r => r.key !== key));
        }
        setDeleteConfirm(null);
      } else {
        console.error(`Failed to delete ${type}`);
      }
    } catch (err) {
      console.error(`Error deleting ${type}:`, err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Recurring Standups Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-slate-200">Recurring Standups</h3>
          <button
            onClick={() => {
              setFormData({});
              setEditingRecurring(null);
              setShowRecurringForm(true);
            }}
            className="btn btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Recurring Standup
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recurringStandups.map((standup) => (
            <div key={standup.key} className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{standup.emoji}</span>
                  <h4 className="font-medium text-slate-100">{standup.name}</h4>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setFormData(standup);
                      setEditingRecurring(standup);
                      setShowRecurringForm(true);
                    }}
                    className="p-1.5 hover:bg-slate-800 rounded"
                  >
                    <Pencil className="w-3 h-3 text-slate-400" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ type: 'recurring', key: standup.key })}
                    className="p-1.5 hover:bg-slate-800 rounded"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary-500/20 text-primary-400 border border-primary-500/30">
                  {formatTime(standup.time)} PT
                </span>
                <span className="px-2 py-0.5 rounded text-xs bg-slate-700/50 text-slate-500 border border-slate-600/30">
                  {getScheduleLabel(standup.schedule)}
                </span>
                {standup.autoExecute && (
                  <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400 border border-green-500/30">
                    Auto-Execute
                  </span>
                )}
              </div>
              
              {standup.agenda && (
                <p className="text-sm text-slate-400 mb-3 leading-relaxed">{standup.agenda}</p>
              )}
              
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {standup.participants.map((role) => {
                  const colors = getAgentColors("", role);
                  return (
                    <span key={role} className={`px-2 py-1 rounded-lg text-xs border ${colors.bg} ${colors.text} ${colors.border}`}>
                      {roleIcons[role] || "👤"} {role}
                    </span>
                  );
                })}
              </div>
              
              {standup.verticals && standup.verticals.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {standup.verticals.map((vk) => (
                    <VerticalBadge key={vk} verticalKey={vk} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Verticals Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-slate-200">Verticals</h3>
          <button
            onClick={() => {
              setFormData({});
              setEditingVertical(null);
              setShowVerticalForm(true);
            }}
            className="btn btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Vertical
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {verticals.map((vertical) => (
            <div key={vertical.key} className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{vertical.emoji}</span>
                  <h4 className="font-medium text-slate-100">{vertical.name}</h4>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setFormData(vertical);
                      setEditingVertical(vertical);
                      setShowVerticalForm(true);
                    }}
                    className="p-1.5 hover:bg-slate-800 rounded"
                  >
                    <Pencil className="w-3 h-3 text-slate-400" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ type: 'vertical', key: vertical.key })}
                    className="p-1.5 hover:bg-slate-800 rounded"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              </div>
              {vertical.description && (
                <p className="text-sm text-slate-400 mb-3">{vertical.description}</p>
              )}
              {vertical.color && (
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full bg-${vertical.color}-500`}></div>
                  <span className="text-xs text-slate-500">{vertical.color}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Initiatives Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-slate-200">Initiatives</h3>
          <button
            onClick={() => {
              setFormData({});
              setEditingInitiative(null);
              setShowInitiativeForm(true);
            }}
            className="btn btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Initiative
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {initiatives.map((initiative) => (
            <div key={initiative.key} className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-slate-100">{initiative.name}</h4>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setFormData(initiative);
                      setEditingInitiative(initiative);
                      setShowInitiativeForm(true);
                    }}
                    className="p-1.5 hover:bg-slate-800 rounded"
                  >
                    <Pencil className="w-3 h-3 text-slate-400" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm({ type: 'initiative', key: initiative.key })}
                    className="p-1.5 hover:bg-slate-800 rounded"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                </div>
              </div>
              
              {initiative.description && (
                <p className="text-sm text-slate-400 mb-3">{initiative.description}</p>
              )}
              
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  initiative.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                  initiative.status === 'paused' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-slate-500/20 text-slate-400'
                }`}>
                  {initiative.status}
                </span>
                
                {initiative.priority && (
                  <PriorityBadge priority={initiative.priority} />
                )}
                
                {initiative.verticals?.map((vKey) => (
                  <VerticalBadge key={vKey} verticalKey={vKey} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vertical Form Modal */}
      {showVerticalForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-slate-100">
                {editingVertical ? 'Edit Vertical' : 'Add Vertical'}
              </h3>
              <button
                onClick={() => {
                  setShowVerticalForm(false);
                  setEditingVertical(null);
                  setFormData({});
                }}
                className="p-1 hover:bg-slate-700 rounded"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveVertical(formData);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Key</label>
                <input
                  type="text"
                  value={formData.key || ''}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200"
                  placeholder="ecosystem"
                  required
                  disabled={!!editingVertical}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200"
                  placeholder="Ecosystem"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Emoji</label>
                <input
                  type="text"
                  value={formData.emoji || ''}
                  onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200"
                  placeholder="🌐"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200"
                  rows={3}
                  placeholder="Cross-cutting concerns spanning all products"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Color</label>
                <select
                  value={formData.color || ''}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200"
                >
                  <option value="">Select color</option>
                  <option value="slate">Slate</option>
                  <option value="blue">Blue</option>
                  <option value="purple">Purple</option>
                  <option value="emerald">Emerald</option>
                  <option value="amber">Amber</option>
                  <option value="red">Red</option>
                </select>
              </div>
              
              <div className="flex gap-2 pt-4">
                <button type="submit" className="btn btn-primary flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  {editingVertical ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowVerticalForm(false);
                    setEditingVertical(null);
                    setFormData({});
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Initiative Form Modal */}
      {showInitiativeForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-slate-100">
                {editingInitiative ? 'Edit Initiative' : 'Add Initiative'}
              </h3>
              <button
                onClick={() => {
                  setShowInitiativeForm(false);
                  setEditingInitiative(null);
                  setFormData({});
                }}
                className="p-1 hover:bg-slate-700 rounded"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveInitiative(formData);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Key</label>
                <input
                  type="text"
                  value={formData.key || ''}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200"
                  placeholder="app-store-submit"
                  required
                  disabled={!!editingInitiative}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200"
                  placeholder="App Store Submission"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200"
                  rows={3}
                  placeholder="Get Lever app ready and submitted to Apple App Store"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
                <select
                  value={formData.status || ''}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200"
                >
                  <option value="">Select status</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Priority</label>
                <select
                  value={formData.priority || ''}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200"
                >
                  <option value="">Select priority</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Verticals</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {verticals.map((vertical) => (
                    <label key={vertical.key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.verticals?.includes(vertical.key) || false}
                        onChange={(e) => {
                          const currentVerticals = formData.verticals || [];
                          if (e.target.checked) {
                            setFormData({ ...formData, verticals: [...currentVerticals, vertical.key] });
                          } else {
                            setFormData({ ...formData, verticals: currentVerticals.filter((v: string) => v !== vertical.key) });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-slate-300">{vertical.emoji} {vertical.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <button type="submit" className="btn btn-primary flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  {editingInitiative ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowInitiativeForm(false);
                    setEditingInitiative(null);
                    setFormData({});
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recurring Standup Form Modal */}
      {showRecurringForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-slate-100">
                {editingRecurring ? 'Edit Recurring Standup' : 'Add Recurring Standup'}
              </h3>
              <button
                onClick={() => {
                  setShowRecurringForm(false);
                  setEditingRecurring(null);
                  setFormData({});
                }}
                className="p-1 hover:bg-slate-700 rounded"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveRecurring({
                  ...formData,
                  participants: formData.participants || [],
                  verticals: formData.verticals || [],
                  initiatives: formData.initiatives || [],
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Key</label>
                <input
                  type="text"
                  value={formData.key || ''}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200"
                  placeholder="morning-priorities"
                  required
                  disabled={!!editingRecurring}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200"
                    placeholder="Morning Priorities"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Emoji</label>
                  <input
                    type="text"
                    value={formData.emoji || ''}
                    onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200"
                    placeholder="🌅"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Schedule</label>
                  <select
                    value={formData.schedule || ''}
                    onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200"
                    required
                  >
                    <option value="">Select schedule</option>
                    <option value="daily">Daily</option>
                    <option value="monday">Monday</option>
                    <option value="tuesday">Tuesday</option>
                    <option value="wednesday">Wednesday</option>
                    <option value="thursday">Thursday</option>
                    <option value="friday">Friday</option>
                    <option value="saturday">Saturday</option>
                    <option value="sunday">Sunday</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Time (PT)</label>
                  <input
                    type="time"
                    value={formData.time || ''}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Agenda</label>
                <textarea
                  value={formData.agenda || ''}
                  onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200"
                  rows={3}
                  placeholder="Review daily priorities, check signal updates..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Participants</label>
                <div className="flex flex-wrap gap-2">
                  {['COO', 'CTO', 'CRO', 'CMO'].map((role) => (
                    <label key={role} className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 cursor-pointer hover:border-slate-600">
                      <input
                        type="checkbox"
                        checked={formData.participants?.includes(role) || false}
                        onChange={(e) => {
                          const current = formData.participants || [];
                          if (e.target.checked) {
                            setFormData({ ...formData, participants: [...current, role] });
                          } else {
                            setFormData({ ...formData, participants: current.filter((r: string) => r !== role) });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-slate-300">{roleIcons[role] || '👤'} {role}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Verticals</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {verticals.map((vertical) => (
                    <label key={vertical.key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.verticals?.includes(vertical.key) || false}
                        onChange={(e) => {
                          const current = formData.verticals || [];
                          if (e.target.checked) {
                            setFormData({ ...formData, verticals: [...current, vertical.key] });
                          } else {
                            setFormData({ ...formData, verticals: current.filter((v: string) => v !== vertical.key) });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-slate-300">{vertical.emoji} {vertical.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Initiatives</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {initiatives.map((initiative) => (
                    <label key={initiative.key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.initiatives?.includes(initiative.key) || false}
                        onChange={(e) => {
                          const current = formData.initiatives || [];
                          if (e.target.checked) {
                            setFormData({ ...formData, initiatives: [...current, initiative.key] });
                          } else {
                            setFormData({ ...formData, initiatives: current.filter((i: string) => i !== initiative.key) });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-slate-300">{initiative.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.autoExecute || false}
                  onChange={(e) => setFormData({ ...formData, autoExecute: e.target.checked })}
                  className="rounded"
                />
                <label className="text-sm text-slate-300">Auto-Execute (agents run this standup automatically)</label>
              </div>
              
              <div className="flex gap-2 pt-4">
                <button type="submit" className="btn btn-primary flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  {editingRecurring ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRecurringForm(false);
                    setEditingRecurring(null);
                    setFormData({});
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-medium text-slate-100 mb-2">Confirm Delete</h3>
            <p className="text-sm text-slate-400 mb-4">
              Are you sure you want to delete this {deleteConfirm.type}? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(deleteConfirm.type, deleteConfirm.key)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white flex-1"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Main Page ----

export default function StandupsPage() {
  const [selectedStandup, setSelectedStandup] = useState<Standup | null>(null);
  const [standupIndex, setStandupIndex] = useState<StandupIndex | null>(null);
  const [joshuaPriorities, setJoshuaPriorities] = useState<JoshuaPriorities | null>(null);
  const [tokenLog, setTokenLog] = useState<TokenLog | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [verticalFilter, setVerticalFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<TabType>("history");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allInitiatives, setAllInitiatives] = useState<InitiativeDef[]>([]);

  // Helper functions (moved from StandupDetail for reuse)
  const getTag = (item: ActionItem): string => {
    if (item.tag) return item.tag;
    if (item.text.startsWith("[JOSHUA]")) return "JOSHUA";
    if (item.text.startsWith("[AGENT]")) return "AGENT";
    return "AGENT";
  };

  const cleanText = (item: ActionItem): string => {
    return item.text.replace(/^\[(JOSHUA|AGENT)\]\s*/, "");
  };

  // Hash function matching the API's hashText (for completion lookup)
  const hashText = (text: string): string => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const chr = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  };

  // Apply completions from Supabase to a standup's action items
  const applyCompletions = (standup: Standup, completions: Record<string, string>): Standup => {
    if (!standup.actionItems || Object.keys(completions).length === 0) return standup;
    return {
      ...standup,
      actionItems: standup.actionItems.map(item => {
        const cleanedText = item.text.replace(/^\[(JOSHUA|AGENT)\]\s*/, "");
        const key = `action:${hashText(cleanedText)}`;
        const completedAt = completions[key];
        if (completedAt && !item.completed) {
          return { ...item, completed: true, completedAt };
        }
        return item;
      }),
    };
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const [latestRes, indexRes, prioritiesRes, completionsRes] = await Promise.all([
          fetch("/data/standups/latest.json"),
          fetch("/data/standups/index.json"),
          fetch("/api/priorities"),
          fetch("/api/priorities?completions=true"),
        ]);

        // Parse completions first so we can apply them
        let completions: Record<string, string> = {};
        if (completionsRes.ok) {
          const cData = await completionsRes.json();
          completions = cData.completions || {};
        }

        if (latestRes.ok) {
          const data = await latestRes.json();
          setSelectedStandup(applyCompletions(data, completions));
          const dateStr = data.date;
          const typeStr = data.type || "daily-priorities";
          setSelectedFile(`${dateStr}-${typeStr}.json`);
        }

        if (indexRes.ok) {
          const indexData = await indexRes.json();
          setStandupIndex(indexData);
        }

        if (prioritiesRes.ok) {
          const pData = await prioritiesRes.json();
          setJoshuaPriorities(pData);
        }

        // Try to load token log (may not exist yet on deployed site)
        try {
          const tokenRes = await fetch("/data/standups/token-log.json");
          if (tokenRes.ok) {
            setTokenLog(await tokenRes.json());
          }
        } catch {
          // Token log might not be in public data — that's fine
        }

        // Load initiatives
        try {
          const initRes = await fetch("/data/initiatives.json");
          if (initRes.ok) {
            const initData = await initRes.json();
            setAllInitiatives(initData.initiatives || []);
          }
        } catch {
          // Initiatives file may not exist yet
        }

      } catch (err) {
        setError("Failed to load standup data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const loadStandup = async (file: string) => {
    setSelectedFile(file);
    try {
      const [res, completionsRes] = await Promise.all([
        fetch(`/data/standups/${file}`),
        fetch("/api/priorities?completions=true"),
      ]);
      if (res.ok) {
        const data = await res.json();
        let completions: Record<string, string> = {};
        if (completionsRes.ok) {
          const cData = await completionsRes.json();
          completions = cData.completions || {};
        }
        setSelectedStandup(applyCompletions(data, completions));
      }
    } catch (err) {
      console.error("Failed to load standup:", err);
    }
  };

  const handleTogglePriority = async (type: string, index: number, completed: boolean) => {
    if (!joshuaPriorities) return;

    const priority = type === "priority" 
      ? joshuaPriorities.priorities[index] 
      : joshuaPriorities.agentHandled[index];
    
    if (!priority) return;

    // Optimistic update to local state
    setJoshuaPriorities(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      if (type === "priority") {
        updated.priorities = [...prev.priorities];
        updated.priorities[index] = {
          ...updated.priorities[index],
          completed,
          completedAt: completed ? new Date().toISOString() : undefined,
        };
      } else {
        updated.agentHandled = [...prev.agentHandled];
        updated.agentHandled[index] = {
          ...updated.agentHandled[index],
          completed,
          completedAt: completed ? new Date().toISOString() : undefined,
        };
      }
      return updated;
    });

    // Persist to API
    try {
      await fetch("/api/priorities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: priority.text, 
          completed, 
          completedAt: completed ? new Date().toISOString() : undefined 
        }),
      });
    } catch (err) {
      console.error("Failed to toggle priority:", err);
      // Revert on error
      setJoshuaPriorities(prev => {
        if (!prev) return prev;
        const reverted = { ...prev };
        if (type === "priority") {
          reverted.priorities = [...prev.priorities];
          reverted.priorities[index] = {
            ...reverted.priorities[index],
            completed: !completed,
            completedAt: !completed ? new Date().toISOString() : undefined,
          };
        } else {
          reverted.agentHandled = [...prev.agentHandled];
          reverted.agentHandled[index] = {
            ...reverted.agentHandled[index],
            completed: !completed,
            completedAt: !completed ? new Date().toISOString() : undefined,
          };
        }
        return reverted;
      });
    }
  };

  // Filtered index entries (type + vertical)
  const filteredEntries = useMemo(() => {
    if (!standupIndex) return [];
    let entries = standupIndex.standups;
    if (typeFilter !== "all") {
      entries = entries.filter((s) => (s.type || "daily-priorities") === typeFilter);
    }
    if (verticalFilter !== "all") {
      entries = entries.filter((s) => s.verticals?.includes(verticalFilter));
    }
    return entries;
  }, [standupIndex, typeFilter, verticalFilter]);

  // Compute stats
  const totalConcerns = selectedStandup
    ? Object.values(selectedStandup.reports).reduce((sum, r) => sum + (r?.concerns?.length || 0), 0)
    : 0;
  const totalActions = selectedStandup?.actionItems?.length || 0;
  const completedActions = selectedStandup?.actionItems?.filter((a) => a.completed).length || 0;
  const joshuaActions = selectedStandup?.actionItems?.filter((a) => a.tag === "JOSHUA" || a.text.startsWith("[JOSHUA]")).length || 0;
  const agentActions = totalActions - joshuaActions;

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600/20 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary-400" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Standups</h1>
            <p className="text-slate-500 text-sm">Loading standup data...</p>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 h-16 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600/20 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-primary-400" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Standups</h1>
            <p className="text-slate-500 text-sm">Multi-agent AI standup meetings & action items</p>
          </div>
        </div>
        <button className="btn btn-primary flex items-center gap-2 text-sm opacity-50 cursor-not-allowed" disabled>
          <Play className="w-4 h-4" strokeWidth={1.5} />
          Run Standup Now
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            activeTab === "history"
              ? "bg-primary-600/20 text-primary-400 border-t border-l border-r border-primary-500/30 border-b-transparent"
              : "text-slate-500 hover:text-slate-400"
          }`}
        >
          📋 History
        </button>
        <button
          onClick={() => setActiveTab("scheduled")}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            activeTab === "scheduled"
              ? "bg-primary-600/20 text-primary-400 border-t border-l border-r border-primary-500/30 border-b-transparent"
              : "text-slate-500 hover:text-slate-400"
          }`}
        >
          📅 Scheduled
        </button>
        <button
          onClick={() => setActiveTab("manage")}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            activeTab === "manage"
              ? "bg-primary-600/20 text-primary-400 border-t border-l border-r border-primary-500/30 border-b-transparent"
              : "text-slate-500 hover:text-slate-400"
          }`}
        >
          ⚙️ Manage
        </button>
      </div>

      {/* Filter Tabs - Only show on History tab */}
      {activeTab === "history" && (
        <div className="space-y-2">
          {/* Type filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-nowrap">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setTypeFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  typeFilter === f.key
                    ? "bg-primary-600/20 text-primary-400 border border-primary-500/30"
                    : "bg-slate-900/30 text-slate-500 border border-slate-800 hover:border-slate-700 hover:text-slate-400"
                }`}
              >
                {f.emoji} {f.label}
              </button>
            ))}
          </div>
          {/* Vertical filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-nowrap">
            <span className="text-[10px] text-slate-600 uppercase tracking-wider font-medium mr-1">Vertical</span>
            {VERTICAL_FILTERS.map((f) => {
              const style = verticalStyles[f.key];
              return (
                <button
                  key={f.key}
                  onClick={() => setVerticalFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    verticalFilter === f.key
                      ? style
                        ? `${style.bg} ${style.text} border ${style.border}`
                        : "bg-primary-600/20 text-primary-400 border border-primary-500/30"
                      : "bg-slate-900/30 text-slate-500 border border-slate-800 hover:border-slate-700 hover:text-slate-400"
                  }`}
                >
                  {f.emoji} {f.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === "history" ? (
        <>
          {/* Joshua's Priorities (top — most important) */}
          <JoshuaPrioritiesCard priorities={joshuaPriorities} onToggle={handleTogglePriority} />

          {/* CEO Directives */}
          {selectedStandup?.ceoDirectives && selectedStandup.ceoDirectives.length > 0 && (
            <DirectivesCard directives={selectedStandup.ceoDirectives} />
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-3 text-center">
              <p className="text-xl font-bold text-slate-100">{standupIndex?.standups?.length || 0}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Standups</p>
            </div>
            <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-3 text-center">
              <p className="text-xl font-bold text-purple-400">{joshuaActions}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">👤 Joshua</p>
            </div>
            <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-3 text-center">
              <p className="text-xl font-bold text-cyan-400">{agentActions}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">🤖 Agent</p>
            </div>
            <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-3 text-center">
              <p className="text-xl font-bold text-emerald-400">{completedActions}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Done</p>
            </div>
            <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-3 text-center">
              <p className="text-xl font-bold text-red-400">{totalConcerns}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Concerns</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* History Sidebar */}
            <div className="w-full lg:w-48 flex-shrink-0 space-y-2 lg:space-y-2 flex lg:flex-col gap-2 lg:gap-0 overflow-x-auto lg:overflow-x-visible">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium px-1 mb-2 lg:mb-2 hidden lg:block">History</p>
              {filteredEntries.length === 0 ? (
                <p className="text-xs text-slate-600 px-1">No standups found</p>
              ) : (
                filteredEntries.map((entry) => (
                  <StandupHistoryItem
                    key={entry.file || entry.date}
                    entry={entry}
                    isSelected={selectedFile === entry.file}
                    onClick={() => loadStandup(entry.file)}
                  />
                ))
              )}

              {/* Token Usage Widget */}
              {tokenLog && (
                <div className="mt-4">
                  <TokenUsageWidget tokenLog={tokenLog} />
                </div>
              )}
            </div>

            {/* Detail View */}
            <div className="flex-1 min-w-0 w-full">
              {selectedStandup ? (
                <>
                  <h2 className="text-lg font-semibold text-slate-100 mb-4">{selectedStandup.topic}</h2>
                  <StandupDetail 
                    standup={selectedStandup} 
                    onToggleActionItem={async (text: string, completed: boolean) => {
                      try {
                        await fetch("/api/priorities", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ text, completed, completedAt: completed ? new Date().toISOString() : undefined }),
                        });
                        
                        // Update the selected standup state to reflect the change
                        setSelectedStandup(prev => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            actionItems: prev.actionItems.map(item => 
                              cleanText(item) === text 
                                ? { ...item, completed, completedAt: completed ? new Date().toISOString() : undefined }
                                : item
                            )
                          };
                        });
                      } catch (err) {
                        console.error("Failed to toggle action item:", err);
                      }
                    }}
                  />
                </>
              ) : error ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
                  <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                  <p className="text-red-300 text-sm">{error}</p>
                  <p className="text-slate-500 text-xs mt-2">
                    Run <code className="text-slate-400">~/clawd/tools/standup/run-standup.sh</code> to generate standup data.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center">
                  <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">No standup data available yet.</p>
                  <p className="text-slate-500 text-xs mt-2">
                    Run <code className="text-slate-400">~/clawd/tools/standup/run-standup.sh</code> to generate your first standup.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : activeTab === "scheduled" ? (
        <ScheduledView />
      ) : (
        <ManageView />
      )}
    </div>
  );
}
