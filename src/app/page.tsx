"use client";

import { useHubStore } from "@/lib/store";
import {
  ListTodo,
  Plug,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const { tasks, connections, skills, usage } = useHubStore();

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
      icon: ListTodo,
      color: "bg-accent-blue",
      href: "/tasks",
    },
    {
      label: "Connections",
      value: connectedServices,
      icon: Plug,
      color: "bg-accent-green",
      href: "/connections",
    },
    {
      label: "Skills",
      value: enabledSkills,
      icon: Sparkles,
      color: "bg-accent-purple",
      href: "/skills",
    },
    {
      label: "Tokens Today",
      value: todayUsage ? `${((todayUsage.inputTokens + todayUsage.outputTokens) / 1000).toFixed(1)}k` : "0",
      icon: TrendingUp,
      color: "bg-accent-yellow",
      href: "/usage",
    },
  ];

  const recentTasks = tasks
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-400 mt-1">Welcome to Clawdbot Hub</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-dark-800 rounded-xl p-6 border border-dark-600 hover:border-accent-purple/50 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{stat.label}</p>
                <p className="text-3xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="bg-dark-800 rounded-xl border border-dark-600 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Tasks</h2>
            <Link href="/tasks" className="text-accent-purple text-sm hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {recentTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 bg-dark-700 rounded-lg"
              >
                {task.status === "done" ? (
                  <CheckCircle2 className="w-5 h-5 text-accent-green" />
                ) : task.status === "in-progress" ? (
                  <Clock className="w-5 h-5 text-accent-yellow" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-gray-500" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{task.title}</p>
                  <p className="text-sm text-gray-400 truncate">{task.description}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    task.priority === "high"
                      ? "bg-accent-red/20 text-accent-red"
                      : task.priority === "medium"
                      ? "bg-accent-yellow/20 text-accent-yellow"
                      : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Active Connections */}
        <div className="bg-dark-800 rounded-xl border border-dark-600 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Connections</h2>
            <Link href="/connections" className="text-accent-purple text-sm hover:underline">
              Manage
            </Link>
          </div>
          <div className="space-y-3">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="flex items-center gap-3 p-3 bg-dark-700 rounded-lg"
              >
                <div
                  className={`w-3 h-3 rounded-full ${
                    conn.status === "connected"
                      ? "bg-accent-green"
                      : conn.status === "error"
                      ? "bg-accent-red"
                      : "bg-gray-500"
                  }`}
                />
                <div className="flex-1">
                  <p className="font-medium">{conn.name}</p>
                  <p className="text-sm text-gray-400">{conn.type}</p>
                </div>
                <span className="text-sm text-gray-400">
                  {conn.status === "connected" ? "Active" : conn.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
