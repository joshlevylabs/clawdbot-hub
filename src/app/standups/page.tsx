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
} from "lucide-react";

// ---- Types ----

interface ActionItem {
  text: string;
  completed: boolean;
  assignee: string;
  priority: string;
  tag?: string; // "JOSHUA" | "AGENT"
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
}

interface StandupIndexEntry {
  date: string;
  topic: string;
  file: string;
  type?: string;
  typeName?: string;
  typeEmoji?: string;
  tokenCost?: number;
}

interface StandupIndex {
  standups: StandupIndexEntry[];
}

interface JoshuaPriorities {
  date: string;
  generatedAt: string;
  priorities: { text: string; source: string; urgency: string }[];
  agentHandled: { text: string; assignee: string; status: string }[];
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

// Type filter config
const TYPE_FILTERS = [
  { key: "all", label: "All", emoji: "📊" },
  { key: "daily-priorities", label: "Daily", emoji: "📋" },
  { key: "trading-review", label: "Trading", emoji: "📈" },
  { key: "content-pipeline", label: "Content", emoji: "🎙️" },
  { key: "tech-sprint", label: "Tech", emoji: "🔧" },
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

function JoshuaPrioritiesCard({ priorities }: { priorities: JoshuaPriorities | null }) {
  if (!priorities || (!priorities.priorities.length && !priorities.agentHandled.length)) return null;

  return (
    <div className="space-y-4">
      {/* Joshua's Items */}
      {priorities.priorities.length > 0 && (
        <div className="bg-gradient-to-br from-purple-600/10 to-purple-800/5 rounded-xl border border-purple-500/20 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-purple-400" strokeWidth={1.5} />
            <h2 className="font-semibold text-slate-100 text-sm">Joshua&apos;s Priorities</h2>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
              NEEDS YOUR ACTION
            </span>
          </div>
          <div className="space-y-3">
            {priorities.priorities.map((p, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-purple-400">{i + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-200 leading-relaxed">{p.text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <PriorityBadge priority={p.urgency} />
                    <span className="text-[10px] text-slate-600">from {p.source}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent-Handled Items */}
      {priorities.agentHandled.length > 0 && (
        <div className="bg-gradient-to-br from-cyan-600/10 to-cyan-800/5 rounded-xl border border-cyan-500/20 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-cyan-400" strokeWidth={1.5} />
            <h2 className="font-semibold text-slate-100 text-sm">Auto-Handled by Agents</h2>
          </div>
          <div className="space-y-2">
            {priorities.agentHandled.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-cyan-500/5">
                {a.status === "done" ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-cyan-400/50 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`text-sm ${a.status === "done" ? "text-slate-500 line-through" : "text-slate-300"}`}>
                    {a.text}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">→ {a.assignee} · {a.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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

function StandupDetail({ standup }: { standup: Standup }) {
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
            {standup.actionItems.map((item, i) => (
              <div key={i} className={`flex items-start gap-3 p-2 rounded-lg ${item.completed ? "bg-emerald-500/5" : "bg-slate-800/20"}`}>
                {item.completed ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm ${item.completed ? "text-slate-500 line-through" : "text-slate-300"}`}>
                      {cleanText(item)}
                    </p>
                    <TagBadge tag={getTag(item)} />
                    <PriorityBadge priority={item.priority} />
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">→ {item.assignee}</p>
                </div>
              </div>
            ))}
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
      {entry.tokenCost != null && entry.tokenCost > 0 && (
        <p className="text-[10px] text-slate-600 mt-0.5">${entry.tokenCost.toFixed(4)}</p>
      )}
    </button>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [latestRes, indexRes, prioritiesRes] = await Promise.all([
          fetch("/data/standups/latest.json"),
          fetch("/data/standups/index.json"),
          fetch("/data/joshua-priorities.json"),
        ]);

        if (latestRes.ok) {
          const data = await latestRes.json();
          setSelectedStandup(data);
          // Determine the file name from the latest data
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
      const res = await fetch(`/data/standups/${file}`);
      if (res.ok) {
        setSelectedStandup(await res.json());
      }
    } catch (err) {
      console.error("Failed to load standup:", err);
    }
  };

  // Filtered index entries
  const filteredEntries = useMemo(() => {
    if (!standupIndex) return [];
    if (typeFilter === "all") return standupIndex.standups;
    return standupIndex.standups.filter((s) => (s.type || "daily-priorities") === typeFilter);
  }, [standupIndex, typeFilter]);

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

      {/* Type Filter Tabs */}
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

      {/* Joshua's Priorities (top — most important) */}
      <JoshuaPrioritiesCard priorities={joshuaPriorities} />

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
              <StandupDetail standup={selectedStandup} />
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
    </div>
  );
}
