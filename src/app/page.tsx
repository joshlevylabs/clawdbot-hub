"use client";

import { useEffect } from "react";
import { useHubStore } from "@/lib/store";
import {
  CheckSquare,
  Link2,
  Zap,
  TrendingUp,
  CheckCircle,
  Clock,
  Circle,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const { tasks, connections, skills, usage, initialize } = useHubStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

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
      href: "/tasks",
    },
    {
      label: "Connections",
      value: connectedServices,
      subtext: `${connections.length} total`,
      icon: Link2,
      color: "accent",
      href: "/connections",
    },
    {
      label: "Skills",
      value: enabledSkills,
      subtext: `${skills.length} total`,
      icon: Zap,
      color: "accent",
      href: "/skills",
    },
    {
      label: "Tokens Today",
      value: todayUsage ? `${((todayUsage.inputTokens + todayUsage.outputTokens) / 1000).toFixed(1)}k` : "0",
      subtext: todayUsage ? `$${todayUsage.cost.toFixed(2)}` : "$0.00",
      icon: TrendingUp,
      color: "primary",
      href: "/usage",
    },
  ];

  const recentTasks = tasks
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const priorityStyles = {
    high: "bg-status-error/15 text-status-error",
    medium: "bg-status-warning/15 text-status-warning",
    low: "bg-slate-700/50 text-slate-400",
  };

  const statusIcon = {
    done: <CheckCircle className="w-4 h-4 text-status-success" strokeWidth={1.5} />,
    "in-progress": <Clock className="w-4 h-4 text-primary-400" strokeWidth={1.5} />,
    review: <Clock className="w-4 h-4 text-accent-400" strokeWidth={1.5} />,
    backlog: <Circle className="w-4 h-4 text-slate-600" strokeWidth={1.5} />,
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Dashboard</h1>
        <p className="text-slate-500 mt-1 text-sm">Welcome to Clawdbot Hub</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-slate-850 rounded-xl p-5 border border-slate-800 hover:border-slate-700 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
                <p className="text-3xl font-semibold text-slate-100 mt-2">{stat.value}</p>
                <p className="text-slate-600 text-xs mt-1">{stat.subtext}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                stat.color === "primary" ? "bg-primary-600/20" : "bg-accent-600/20"
              }`}>
                <stat.icon className={`w-5 h-5 ${
                  stat.color === "primary" ? "text-primary-400" : "text-accent-400"
                }`} strokeWidth={1.5} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="bg-slate-850 rounded-xl border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-200">Recent Tasks</h2>
            <Link href="/tasks" className="text-primary-400 text-sm hover:text-primary-300 flex items-center gap-1 group">
              View all
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
            </Link>
          </div>
          <div className="space-y-2">
            {recentTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors"
              >
                {statusIcon[task.status]}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-300 text-sm truncate">{task.title}</p>
                  {task.description && (
                    <p className="text-xs text-slate-500 truncate mt-0.5">{task.description}</p>
                  )}
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityStyles[task.priority]}`}>
                  {task.priority}
                </span>
              </div>
            ))}
            {recentTasks.length === 0 && (
              <p className="text-slate-600 text-center py-8 text-sm">No tasks yet</p>
            )}
          </div>
        </div>

        {/* Connections */}
        <div className="bg-slate-850 rounded-xl border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-200">Connections</h2>
            <Link href="/connections" className="text-primary-400 text-sm hover:text-primary-300 flex items-center gap-1 group">
              Manage
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
            </Link>
          </div>
          <div className="space-y-2">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg"
              >
                <div className={`w-2.5 h-2.5 rounded-full ${
                  conn.status === "connected" ? "bg-status-success" :
                  conn.status === "error" ? "bg-status-error" : "bg-slate-600"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-300 text-sm">{conn.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{conn.type}</p>
                </div>
                <span className={`text-xs font-medium ${
                  conn.status === "connected" ? "text-status-success" : "text-slate-500"
                }`}>
                  {conn.status === "connected" ? "Active" : conn.status}
                </span>
              </div>
            ))}
            {connections.length === 0 && (
              <p className="text-slate-600 text-center py-8 text-sm">No connections</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
