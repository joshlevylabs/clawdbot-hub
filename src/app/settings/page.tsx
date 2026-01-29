"use client";

import { useState, useEffect } from "react";
import { useHubStore, Connection } from "@/lib/store";
import {
  Settings as SettingsIcon,
  Shield,
  Database,
  RefreshCw,
  CheckSquare,
  Link2,
  Zap,
  TrendingUp,
  Clock,
  BarChart3,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  X,
  Check,
  AlertCircle,
  Play,
  Pause,
  Calendar,
  CheckCircle,
} from "lucide-react";

// Connection types
const connectionTypes: { type: Connection["type"]; name: string; icon: string }[] = [
  { type: "github", name: "GitHub", icon: "🐙" },
  { type: "google", name: "Google", icon: "🔵" },
  { type: "anthropic", name: "Anthropic", icon: "🤖" },
  { type: "openai", name: "OpenAI", icon: "🧠" },
  { type: "slack", name: "Slack", icon: "💬" },
  { type: "telegram", name: "Telegram", icon: "✈️" },
  { type: "custom", name: "Custom", icon: "🔧" },
];

interface CronJob {
  id: string;
  name: string;
  enabled: boolean;
  schedule: {
    kind: string;
    expr: string;
    tz: string;
  };
  payload: {
    message: string;
  };
  state: {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
    lastStatus?: string;
    lastDurationMs?: number;
  };
}

function formatCronExpression(expr: string): string {
  const parts = expr.split(" ");
  if (parts.length !== 5) return expr;
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  
  if (dayOfWeek === "0" && dayOfMonth === "*" && month === "*") {
    return `Sundays at ${hour}:${minute.padStart(2, "0")}`;
  }
  if (dayOfWeek === "*" && dayOfMonth === "*" && month === "*") {
    return `Daily at ${hour}:${minute.padStart(2, "0")}`;
  }
  return expr;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function SettingsPage() {
  const { tasks, skills, connections, usage, initialize, addConnection, updateConnection, deleteConnection } = useHubStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>("overview");
  
  // Connections modal
  const [showConnModal, setShowConnModal] = useState(false);
  const [newConn, setNewConn] = useState<Partial<Connection>>({
    name: "",
    type: "custom",
    status: "disconnected",
  });
  
  // Schedules
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await initialize();
    setRefreshing(false);
  };

  const fetchJobs = async () => {
    try {
      setLoadingJobs(true);
      const response = await fetch("/api/schedules");
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error("Failed to fetch schedules:", err);
    } finally {
      setLoadingJobs(false);
    }
  };

  // Load schedules when that section is opened
  useEffect(() => {
    if (activeSection === "schedules" && jobs.length === 0) {
      fetchJobs();
    }
  }, [activeSection, jobs.length]);

  const handleAddConnection = async () => {
    if (newConn.name && newConn.type) {
      await addConnection({
        name: newConn.name,
        type: newConn.type,
        status: "connected",
        lastSync: new Date().toISOString(),
      });
      setNewConn({ name: "", type: "custom", status: "disconnected" });
      setShowConnModal(false);
    }
  };

  // Stats from old dashboard
  const tasksByStatus = {
    backlog: tasks.filter((t) => t.status === "backlog").length,
    "in-progress": tasks.filter((t) => t.status === "in-progress").length,
    review: tasks.filter((t) => t.status === "review").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  const connectedServices = connections.filter((c) => c.status === "connected").length;
  const enabledSkills = skills.filter((s) => s.enabled).length;
  const todayUsage = usage.find((u) => u.date === new Date().toISOString().split("T")[0]);

  // Usage stats
  const totalTokens = usage.reduce((acc, u) => acc + u.inputTokens + u.outputTokens, 0);
  const totalCost = usage.reduce((acc, u) => acc + u.cost, 0);

  const stats = [
    {
      label: "Active Tasks",
      value: tasksByStatus["in-progress"] + tasksByStatus.review,
      subtext: `${tasksByStatus.done} completed`,
      icon: CheckSquare,
      color: "primary",
    },
    {
      label: "Connections",
      value: connectedServices,
      subtext: `${connections.length} total`,
      icon: Link2,
      color: "accent",
    },
    {
      label: "Skills",
      value: enabledSkills,
      subtext: `${skills.length} total`,
      icon: Zap,
      color: "accent",
    },
    {
      label: "Tokens Today",
      value: todayUsage ? `${((todayUsage.inputTokens + todayUsage.outputTokens) / 1000).toFixed(1)}k` : "0",
      subtext: todayUsage ? `$${todayUsage.cost.toFixed(2)}` : "$0.00",
      icon: TrendingUp,
      color: "primary",
    },
  ];

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Settings</h1>
        <p className="text-slate-500 mt-1 text-sm">Configuration and system management</p>
      </div>

      {/* Overview Section */}
      <div className="bg-slate-850 rounded-xl border border-slate-800">
        <button
          onClick={() => toggleSection("overview")}
          className="w-full flex items-center justify-between p-5 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary-600/20">
              <TrendingUp className="w-5 h-5 text-primary-400" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-200">Overview</h2>
              <p className="text-sm text-slate-500">System statistics at a glance</p>
            </div>
          </div>
          {activeSection === "overview" ? (
            <ChevronDown className="w-5 h-5 text-slate-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-500" />
          )}
        </button>
        
        {activeSection === "overview" && (
          <div className="px-5 pb-5 border-t border-slate-800 pt-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-slate-800/50 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-slate-500 text-xs font-medium">{stat.label}</p>
                      <p className="text-2xl font-semibold text-slate-100 mt-1">{stat.value}</p>
                      <p className="text-slate-600 text-xs mt-0.5">{stat.subtext}</p>
                    </div>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      stat.color === "primary" ? "bg-primary-600/20" : "bg-accent-600/20"
                    }`}>
                      <stat.icon className={`w-4 h-4 ${
                        stat.color === "primary" ? "text-primary-400" : "text-accent-400"
                      }`} strokeWidth={1.5} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Connections Section */}
      <div className="bg-slate-850 rounded-xl border border-slate-800">
        <button
          onClick={() => toggleSection("connections")}
          className="w-full flex items-center justify-between p-5 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-accent-600/20">
              <Link2 className="w-5 h-5 text-accent-400" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-200">Connections</h2>
              <p className="text-sm text-slate-500">{connectedServices} active integrations</p>
            </div>
          </div>
          {activeSection === "connections" ? (
            <ChevronDown className="w-5 h-5 text-slate-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-500" />
          )}
        </button>
        
        {activeSection === "connections" && (
          <div className="px-5 pb-5 border-t border-slate-800 pt-4">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowConnModal(true)}
                className="btn btn-primary text-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Connection
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {connections.map((conn) => {
                const typeInfo = connectionTypes.find((t) => t.type === conn.type);
                return (
                  <div
                    key={conn.id}
                    className="bg-slate-800/50 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{typeInfo?.icon || "🔧"}</span>
                      <div>
                        <h3 className="font-medium text-slate-200 text-sm">{conn.name}</h3>
                        <p className="text-xs text-slate-500">{typeInfo?.name || conn.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {conn.status === "connected" ? (
                        <Check className="w-4 h-4 text-accent-500" />
                      ) : conn.status === "error" ? (
                        <AlertCircle className="w-4 h-4 text-status-error" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-slate-600" />
                      )}
                      <button
                        onClick={() => deleteConnection(conn.id)}
                        className="p-1.5 text-slate-600 hover:text-status-error hover:bg-slate-700 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {connections.length === 0 && (
                <p className="text-slate-500 text-sm col-span-2 text-center py-8">No connections configured</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Schedules Section */}
      <div className="bg-slate-850 rounded-xl border border-slate-800">
        <button
          onClick={() => toggleSection("schedules")}
          className="w-full flex items-center justify-between p-5 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary-600/20">
              <Clock className="w-5 h-5 text-primary-400" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-200">Schedules</h2>
              <p className="text-sm text-slate-500">{jobs.filter(j => j.enabled).length} active cron jobs</p>
            </div>
          </div>
          {activeSection === "schedules" ? (
            <ChevronDown className="w-5 h-5 text-slate-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-500" />
          )}
        </button>
        
        {activeSection === "schedules" && (
          <div className="px-5 pb-5 border-t border-slate-800 pt-4">
            {loadingJobs ? (
              <div className="text-center py-8 text-slate-500">Loading schedules...</div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Clock className="w-10 h-10 mx-auto mb-3 text-slate-700" strokeWidth={1.5} />
                <p>No scheduled jobs</p>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className={`bg-slate-800/50 rounded-lg p-4 ${!job.enabled && "opacity-60"}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-slate-200 text-sm flex items-center gap-2">
                          {job.name}
                          {job.enabled ? (
                            <span className="text-xs bg-accent-600/20 text-accent-400 px-1.5 py-0.5 rounded">
                              Active
                            </span>
                          ) : (
                            <span className="text-xs bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded">
                              Paused
                            </span>
                          )}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          <Calendar className="w-3 h-3" strokeWidth={1.5} />
                          <span>{formatCronExpression(job.schedule.expr)}</span>
                          <span className="text-slate-700">•</span>
                          <span>{job.schedule.tz}</span>
                        </div>
                      </div>
                      {job.state.lastStatus && (
                        <div className="flex items-center gap-1">
                          {job.state.lastStatus === "ok" ? (
                            <CheckCircle className="w-4 h-4 text-accent-500" strokeWidth={1.5} />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-status-error" strokeWidth={1.5} />
                          )}
                        </div>
                      )}
                    </div>
                    {job.state.nextRunAtMs && (
                      <p className="text-xs text-slate-600 mt-2">
                        Next: {formatDate(job.state.nextRunAtMs)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Usage Section */}
      <div className="bg-slate-850 rounded-xl border border-slate-800">
        <button
          onClick={() => toggleSection("usage")}
          className="w-full flex items-center justify-between p-5 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-accent-600/20">
              <BarChart3 className="w-5 h-5 text-accent-400" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-200">Usage</h2>
              <p className="text-sm text-slate-500">{(totalTokens / 1000).toFixed(1)}k tokens • ${totalCost.toFixed(2)}</p>
            </div>
          </div>
          {activeSection === "usage" ? (
            <ChevronDown className="w-5 h-5 text-slate-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-500" />
          )}
        </button>
        
        {activeSection === "usage" && (
          <div className="px-5 pb-5 border-t border-slate-800 pt-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-semibold text-primary-400">{(totalTokens / 1000).toFixed(1)}k</p>
                <p className="text-xs text-slate-500">Total Tokens</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-semibold text-accent-400">${totalCost.toFixed(2)}</p>
                <p className="text-xs text-slate-500">Total Cost</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-semibold text-status-success">{usage.length}</p>
                <p className="text-xs text-slate-500">Records</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-semibold text-status-warning">
                  {todayUsage ? `${((todayUsage.inputTokens + todayUsage.outputTokens) / 1000).toFixed(1)}k` : "0"}
                </p>
                <p className="text-xs text-slate-500">Today</p>
              </div>
            </div>
            
            {usage.length > 0 && (
              <div className="max-h-48 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-850">
                    <tr className="text-left text-slate-500 text-xs">
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Model</th>
                      <th className="pb-2 text-right">Tokens</th>
                      <th className="pb-2 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.slice(0, 10).map((record, i) => (
                      <tr key={i} className="border-t border-slate-800">
                        <td className="py-2 text-slate-400">{new Date(record.date).toLocaleDateString()}</td>
                        <td className="py-2">
                          <code className="text-xs bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                            {record.model.split("/").pop()}
                          </code>
                        </td>
                        <td className="py-2 text-right text-slate-500">
                          {((record.inputTokens + record.outputTokens) / 1000).toFixed(1)}k
                        </td>
                        <td className="py-2 text-right text-accent-400">
                          ${record.cost.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Database Section */}
      <div className="bg-slate-850 rounded-xl border border-slate-800">
        <button
          onClick={() => toggleSection("database")}
          className="w-full flex items-center justify-between p-5 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-accent-600/20">
              <Database className="w-5 h-5 text-accent-400" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-200">Database</h2>
              <p className="text-sm text-slate-500">Supabase connection status</p>
            </div>
          </div>
          {activeSection === "database" ? (
            <ChevronDown className="w-5 h-5 text-slate-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-500" />
          )}
        </button>
        
        {activeSection === "database" && (
          <div className="px-5 pb-5 border-t border-slate-800 pt-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-semibold text-primary-400">{tasks.length}</p>
                <p className="text-xs text-slate-500">Tasks</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-semibold text-accent-400">{skills.length}</p>
                <p className="text-xs text-slate-500">Skills</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-semibold text-status-success">{connections.length}</p>
                <p className="text-xs text-slate-500">Connections</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-semibold text-status-warning">{usage.length}</p>
                <p className="text-xs text-slate-500">Usage Records</p>
              </div>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full py-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-slate-300"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} strokeWidth={1.5} />
              {refreshing ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>
        )}
      </div>

      {/* Configuration Section */}
      <div className="bg-slate-850 rounded-xl border border-slate-800">
        <button
          onClick={() => toggleSection("config")}
          className="w-full flex items-center justify-between p-5 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary-600/20">
              <SettingsIcon className="w-5 h-5 text-primary-400" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-200">Configuration</h2>
              <p className="text-sm text-slate-500">Environment settings</p>
            </div>
          </div>
          {activeSection === "config" ? (
            <ChevronDown className="w-5 h-5 text-slate-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-500" />
          )}
        </button>
        
        {activeSection === "config" && (
          <div className="px-5 pb-5 border-t border-slate-800 pt-4 space-y-2">
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-400 text-sm">Supabase</span>
              <span className="px-2 py-1 bg-status-success/15 text-status-success rounded text-xs font-medium">
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-400 text-sm">Authentication</span>
              <span className="px-2 py-1 bg-status-success/15 text-status-success rounded text-xs font-medium">
                Enabled
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Security Section */}
      <div className="bg-slate-850 rounded-xl border border-slate-800 p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-status-error/20">
            <Shield className="w-5 h-5 text-status-error" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-200">Security</h2>
            <p className="text-sm text-slate-500">Session management</p>
          </div>
        </div>

        <button
          onClick={async () => {
            if (confirm("Sign out of Clawdbot Hub?")) {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }
          }}
          className="w-full py-3 bg-status-error/15 text-status-error rounded-lg hover:bg-status-error/25 transition-colors font-medium"
        >
          Sign Out
        </button>
      </div>

      {/* Add Connection Modal */}
      {showConnModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-850 rounded-xl border border-slate-800 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-200">Add Connection</h2>
              <button onClick={() => setShowConnModal(false)} className="text-slate-500 hover:text-slate-300 p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Service Type</label>
                <select
                  value={newConn.type}
                  onChange={(e) => setNewConn({ ...newConn, type: e.target.value as Connection["type"] })}
                  className="w-full px-3 py-2 bg-slate-800 rounded-lg border border-slate-700 focus:border-primary-500 focus:outline-none text-slate-200"
                >
                  {connectionTypes.map((t) => (
                    <option key={t.type} value={t.type}>
                      {t.icon} {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Name</label>
                <input
                  type="text"
                  value={newConn.name}
                  onChange={(e) => setNewConn({ ...newConn, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 rounded-lg border border-slate-700 focus:border-primary-500 focus:outline-none text-slate-200"
                  placeholder="Connection name"
                />
              </div>
              <button
                onClick={handleAddConnection}
                className="w-full py-2 bg-primary-600 rounded-lg hover:bg-primary-500 transition-colors font-medium text-white"
              >
                Add Connection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
