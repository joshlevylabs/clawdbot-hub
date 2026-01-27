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
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-400 mt-1 text-sm lg:text-base">Welcome to Clawdbot Hub</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-dark-800 rounded-xl p-4 lg:p-6 border border-dark-600 hover:border-accent-purple/50 transition-all active:scale-95"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
              <div className="order-2 lg:order-1">
                <p className="text-gray-400 text-xs lg:text-sm">{stat.label}</p>
                <p className="text-2xl lg:text-3xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-2 lg:p-3 rounded-lg w-fit order-1 lg:order-2`}>
                <stat.icon className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Recent Tasks */}
        <div className="bg-dark-800 rounded-xl border border-dark-600 p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg lg:text-xl font-semibold">Recent Tasks</h2>
            <Link href="/tasks" className="text-accent-purple text-sm hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2 lg:space-y-3">
            {recentTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 bg-dark-700 rounded-lg"
              >
                {task.status === "done" ? (
                  <CheckCircle2 className="w-5 h-5 text-accent-green flex-shrink-0" />
                ) : task.status === "in-progress" ? (
                  <Clock className="w-5 h-5 text-accent-yellow flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-gray-500 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-sm lg:text-base">{task.title}</p>
                  <p className="text-xs lg:text-sm text-gray-400 truncate">{task.description}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium hidden sm:block ${
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
            {recentTasks.length === 0 && (
              <p className="text-gray-500 text-center py-4">No tasks yet</p>
            )}
          </div>
        </div>

        {/* Active Connections */}
        <div className="bg-dark-800 rounded-xl border border-dark-600 p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg lg:text-xl font-semibold">Connections</h2>
            <Link href="/connections" className="text-accent-purple text-sm hover:underline">
              Manage
            </Link>
          </div>
          <div className="space-y-2 lg:space-y-3">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="flex items-center gap-3 p-3 bg-dark-700 rounded-lg"
              >
                <div
                  className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    conn.status === "connected"
                      ? "bg-accent-green"
                      : conn.status === "error"
                      ? "bg-accent-red"
                      : "bg-gray-500"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm lg:text-base">{conn.name}</p>
                  <p className="text-xs lg:text-sm text-gray-400">{conn.type}</p>
                </div>
                <span className="text-xs lg:text-sm text-gray-400">
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
