"use client";

import { useState, useEffect } from "react";
import { useHubStore } from "@/lib/store";
import {
  Settings as SettingsIcon,
  Shield,
  Database,
  RefreshCw,
  CheckSquare,
  Link2,
  Zap,
  TrendingUp,
} from "lucide-react";

export default function SettingsPage() {
  const { tasks, skills, connections, usage, initialize } = useHubStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await initialize();
    setRefreshing(false);
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

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Settings</h1>
        <p className="text-slate-500 mt-1 text-sm">Configuration and system overview</p>
      </div>

      {/* Quick Stats */}
      <div className="bg-slate-850 rounded-xl border border-slate-800 p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary-600/20">
            <TrendingUp className="w-5 h-5 text-primary-400" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-200">Overview</h2>
            <p className="text-sm text-slate-500">System statistics at a glance</p>
          </div>
        </div>

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

      {/* Database */}
      <div className="bg-slate-850 rounded-xl border border-slate-800 p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-accent-600/20">
            <Database className="w-5 h-5 text-accent-400" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-200">Database</h2>
            <p className="text-sm text-slate-500">Supabase connection status</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <div className="bg-slate-800/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-semibold text-primary-400">{tasks.length}</p>
            <p className="text-sm text-slate-500">Tasks</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-semibold text-accent-400">{skills.length}</p>
            <p className="text-sm text-slate-500">Skills</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-semibold text-status-success">{connections.length}</p>
            <p className="text-sm text-slate-500">Connections</p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-semibold text-status-warning">{usage.length}</p>
            <p className="text-sm text-slate-500">Usage Records</p>
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

      {/* Configuration */}
      <div className="bg-slate-850 rounded-xl border border-slate-800 p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary-600/20">
            <SettingsIcon className="w-5 h-5 text-primary-400" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-200">Configuration</h2>
            <p className="text-sm text-slate-500">Environment settings</p>
          </div>
        </div>

        <div className="space-y-2">
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
      </div>

      {/* Security */}
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
    </div>
  );
}
