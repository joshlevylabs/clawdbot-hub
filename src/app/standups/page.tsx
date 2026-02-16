"use client";

import { useState, useEffect } from "react";
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
  X,
  Calendar,
  ArrowRight,
} from "lucide-react";

// ---- Types ----

interface ActionItem {
  text: string;
  completed: boolean;
  assignee: string;
  priority: string;
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
  highlights: string[];
  concerns: string[];
  metrics: ReportMetrics;
}

interface CEODirective {
  directive: string;
  setDate: string;
  priority: string;
}

interface Standup {
  date: string;
  generatedAt: string;
  topic: string;
  status: "completed" | "in-progress";
  participants: { name: string; role: string }[];
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
}

interface StandupIndex {
  standups: { date: string; topic: string; file: string }[];
}

// ---- Agent Color Map ----
const agentColors: Record<string, { bg: string; text: string; border: string }> = {
  Theo: { bg: "bg-violet-500/20", text: "text-violet-400", border: "border-violet-500/30" },
  Atlas: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
  Dave: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30" },
  Alex: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
};

const roleIcons: Record<string, string> = {
  COO: "🏛️",
  CTO: "📡",
  CRO: "📈",
  CMO: "🎨",
};

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

function TopPrioritiesCard({ priorities }: { priorities: string[] }) {
  if (!priorities.length) return null;
  return (
    <div className="bg-gradient-to-br from-primary-600/10 to-primary-800/5 rounded-xl border border-primary-500/20 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-primary-400" strokeWidth={1.5} />
        <h2 className="font-semibold text-slate-100 text-sm">Today&apos;s Top Priorities</h2>
      </div>
      <div className="space-y-3">
        {priorities.map((p, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary-400">{i + 1}</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">{p}</p>
          </div>
        ))}
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
  const colors = agentColors[report.agent] || agentColors.Theo;

  return (
    <div className={`bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden`}>
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
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-800 px-4 py-3 space-y-3">
          {/* Highlights */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1.5">Highlights</p>
            <ul className="space-y-1">
              {report.highlights.map((h, i) => (
                <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  {h}
                </li>
              ))}
            </ul>
          </div>

          {/* Concerns */}
          {report.concerns.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1.5">Concerns</p>
              <ul className="space-y-1">
                {report.concerns.map((c, i) => (
                  <li key={i} className="text-sm text-amber-300/80 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Metrics */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1.5">Metrics</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(report.metrics).map(([key, val]) => (
                <span
                  key={key}
                  className="px-2 py-1 bg-slate-800/60 rounded text-xs text-slate-400 border border-slate-700/50"
                >
                  <span className="text-slate-500">{key.replace(/([A-Z])/g, " $1").trim()}:</span>{" "}
                  <span className="text-slate-200">
                    {typeof val === "boolean" ? (val ? "✅" : "❌") : String(val)}
                  </span>
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
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <Calendar className="w-3 h-3" /> {formatDate(standup.date)}
        </span>
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <Clock className="w-3 h-3" /> {standup.duration}
        </span>
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <Users className="w-3 h-3" /> {standup.participants.length} agents
        </span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          {standup.status}
        </span>
      </div>

      {/* Participants */}
      <div className="flex items-center gap-2 flex-wrap">
        {standup.participants.map((p) => {
          const colors = agentColors[p.name] || agentColors.Theo;
          return (
            <span
              key={p.name}
              className={`px-2.5 py-1 rounded-lg text-xs border ${colors.bg} ${colors.text} ${colors.border}`}
            >
              {roleIcons[p.role] || "👤"} {p.name} · {p.role}
            </span>
          );
        })}
      </div>

      {/* Domain Reports */}
      <div className="space-y-2">
        {standup.reports.cto && (
          <ReportCard title="Tech Health" icon="📡" report={standup.reports.cto} />
        )}
        {standup.reports.cro && (
          <ReportCard title="Revenue & Trading" icon="📈" report={standup.reports.cro} />
        )}
        {standup.reports.cmo && (
          <ReportCard title="Content Pipeline" icon="🎨" report={standup.reports.cmo} />
        )}
      </div>

      {/* Action Items */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">
            Action Items
          </p>
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all"
                style={{ width: totalActions > 0 ? `${(completedActions / totalActions) * 100}%` : "0%" }}
              />
            </div>
            <span className="text-xs text-slate-500">
              {completedActions}/{totalActions}
            </span>
          </div>
        </div>
        <div className="space-y-2">
          {standup.actionItems.map((item, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 p-2 rounded-lg ${
                item.completed ? "bg-emerald-500/5" : "bg-slate-800/20"
              }`}
            >
              {item.completed ? (
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={`text-sm ${
                      item.completed ? "text-slate-500 line-through" : "text-slate-300"
                    }`}
                  >
                    {item.text}
                  </p>
                  <PriorityBadge priority={item.priority} />
                </div>
                <p className="text-xs text-slate-600 mt-0.5">→ {item.assignee}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transcript Toggle */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              Full Transcript
            </span>
          </div>
          {showTranscript ? (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {showTranscript && (
          <div className="border-t border-slate-800 px-4 py-3 space-y-3">
            {standup.transcript.map((entry, i) => {
              const colors = agentColors[entry.speaker] || agentColors.Theo;
              return (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${colors.bg}`}
                  >
                    <span className={`text-xs font-medium ${colors.text}`}>
                      {entry.speaker.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${colors.text}`}>
                      {entry.speaker}{" "}
                      <span className="text-slate-600">· {entry.role}</span>
                    </p>
                    <p className="text-sm text-slate-400 mt-0.5 leading-relaxed">
                      {entry.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StandupHistoryItem({
  entry,
  isSelected,
  onClick,
}: {
  entry: { date: string; topic: string };
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
      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
        isSelected
          ? "bg-primary-600/20 border border-primary-500/30 text-primary-300"
          : "bg-slate-900/30 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
      }`}
    >
      <p className={`font-medium text-xs ${isSelected ? "text-primary-300" : "text-slate-300"}`}>
        {formatDate(entry.date)}
      </p>
      <p className={`text-xs mt-0.5 truncate ${isSelected ? "text-primary-400/70" : "text-slate-500"}`}>
        {entry.topic}
      </p>
    </button>
  );
}

// ---- Main Page ----

export default function StandupsPage() {
  const [latestStandup, setLatestStandup] = useState<Standup | null>(null);
  const [selectedStandup, setSelectedStandup] = useState<Standup | null>(null);
  const [standupIndex, setStandupIndex] = useState<StandupIndex | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch latest standup and index on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const [latestRes, indexRes] = await Promise.all([
          fetch("/data/standups/latest.json"),
          fetch("/data/standups/index.json"),
        ]);

        if (latestRes.ok) {
          const data = await latestRes.json();
          setLatestStandup(data);
          setSelectedStandup(data);
          setSelectedDate(data.date);
        }

        if (indexRes.ok) {
          const indexData = await indexRes.json();
          setStandupIndex(indexData);
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

  // Load a specific standup by date
  const loadStandup = async (date: string, file: string) => {
    setSelectedDate(date);
    try {
      const res = await fetch(`/data/standups/${file}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedStandup(data);
      }
    } catch (err) {
      console.error("Failed to load standup:", err);
    }
  };

  // Compute stats from current standup
  const totalConcerns = selectedStandup
    ? Object.values(selectedStandup.reports).reduce(
        (sum, r) => sum + (r?.concerns?.length || 0),
        0
      )
    : 0;
  const totalActions = selectedStandup?.actionItems?.length || 0;
  const completedActions = selectedStandup?.actionItems?.filter((a) => a.completed).length || 0;

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
            <p className="text-slate-500 text-sm">Daily agent standup meetings & action items</p>
          </div>
        </div>
        <button className="btn btn-primary flex items-center gap-2 text-sm opacity-50 cursor-not-allowed" disabled>
          <Play className="w-4 h-4" strokeWidth={1.5} />
          Run Standup Now
        </button>
      </div>

      {/* CEO Directives (if any) */}
      {selectedStandup?.ceoDirectives && selectedStandup.ceoDirectives.length > 0 && (
        <DirectivesCard directives={selectedStandup.ceoDirectives} />
      )}

      {/* Top Priorities */}
      {selectedStandup?.topPriorities && (
        <TopPrioritiesCard priorities={selectedStandup.topPriorities} />
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 text-center">
          <p className="text-2xl font-bold text-slate-100">
            {standupIndex?.standups?.length || 0}
          </p>
          <p className="text-xs text-slate-500 mt-1">Total Standups</p>
        </div>
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{completedActions}</p>
          <p className="text-xs text-slate-500 mt-1">Actions Done</p>
        </div>
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{totalActions - completedActions}</p>
          <p className="text-xs text-slate-500 mt-1">Pending</p>
        </div>
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{totalConcerns}</p>
          <p className="text-xs text-slate-500 mt-1">Concerns</p>
        </div>
      </div>

      {/* Main Content: History Sidebar + Detail */}
      <div className="flex gap-4">
        {/* History Sidebar */}
        {standupIndex && standupIndex.standups.length > 1 && (
          <div className="w-48 flex-shrink-0 space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium px-1 mb-2">
              History
            </p>
            {standupIndex.standups.map((entry) => (
              <StandupHistoryItem
                key={entry.date}
                entry={entry}
                isSelected={selectedDate === entry.date}
                onClick={() => loadStandup(entry.date, entry.file)}
              />
            ))}
          </div>
        )}

        {/* Detail View */}
        <div className="flex-1 min-w-0">
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
