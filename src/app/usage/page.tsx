"use client";

import { useHubStore } from "@/lib/store";
import { BarChart3, TrendingUp, DollarSign, Zap } from "lucide-react";

export default function UsagePage() {
  const { usage } = useHubStore();

  const totalTokens = usage.reduce((acc, u) => acc + u.inputTokens + u.outputTokens, 0);
  const totalCost = usage.reduce((acc, u) => acc + u.cost, 0);
  const totalInputTokens = usage.reduce((acc, u) => acc + u.inputTokens, 0);
  const totalOutputTokens = usage.reduce((acc, u) => acc + u.outputTokens, 0);

  const stats = [
    {
      label: "Total Tokens",
      value: `${(totalTokens / 1000).toFixed(1)}k`,
      icon: Zap,
      color: "bg-accent-purple",
    },
    {
      label: "Input Tokens",
      value: `${(totalInputTokens / 1000).toFixed(1)}k`,
      icon: TrendingUp,
      color: "bg-accent-blue",
    },
    {
      label: "Output Tokens",
      value: `${(totalOutputTokens / 1000).toFixed(1)}k`,
      icon: BarChart3,
      color: "bg-accent-cyan",
    },
    {
      label: "Estimated Cost",
      value: `$${totalCost.toFixed(2)}`,
      icon: DollarSign,
      color: "bg-accent-green",
    },
  ];

  // Generate last 7 days for chart
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split("T")[0];
  });

  const chartData = last7Days.map((date) => {
    const dayUsage = usage.find((u) => u.date === date);
    return {
      date,
      tokens: dayUsage ? dayUsage.inputTokens + dayUsage.outputTokens : 0,
      cost: dayUsage ? dayUsage.cost : 0,
    };
  });

  const maxTokens = Math.max(...chartData.map((d) => d.tokens), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Usage</h1>
        <p className="text-gray-400 mt-1">Track your token consumption and costs</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-dark-800 rounded-xl p-6 border border-dark-600"
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
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-dark-800 rounded-xl border border-dark-600 p-6">
        <h2 className="text-xl font-semibold mb-6">Last 7 Days</h2>
        <div className="h-64 flex items-end gap-2">
          {chartData.map((day) => (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex flex-col items-center">
                <span className="text-xs text-gray-400 mb-1">
                  {day.tokens > 0 ? `${(day.tokens / 1000).toFixed(1)}k` : ""}
                </span>
                <div
                  className="w-full bg-accent-purple rounded-t transition-all"
                  style={{
                    height: `${(day.tokens / maxTokens) * 180}px`,
                    minHeight: day.tokens > 0 ? "4px" : "0",
                  }}
                />
              </div>
              <span className="text-xs text-gray-500">
                {new Date(day.date).toLocaleDateString("en-US", { weekday: "short" })}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Usage History */}
      <div className="bg-dark-800 rounded-xl border border-dark-600 p-6">
        <h2 className="text-xl font-semibold mb-4">Usage History</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm border-b border-dark-600">
                <th className="pb-3">Date</th>
                <th className="pb-3">Model</th>
                <th className="pb-3 text-right">Input</th>
                <th className="pb-3 text-right">Output</th>
                <th className="pb-3 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {usage.map((record, i) => (
                <tr key={i} className="border-b border-dark-700">
                  <td className="py-3">{new Date(record.date).toLocaleDateString()}</td>
                  <td className="py-3">
                    <code className="text-xs bg-dark-700 px-2 py-1 rounded">
                      {record.model.split("/").pop()}
                    </code>
                  </td>
                  <td className="py-3 text-right text-gray-400">
                    {(record.inputTokens / 1000).toFixed(1)}k
                  </td>
                  <td className="py-3 text-right text-gray-400">
                    {(record.outputTokens / 1000).toFixed(1)}k
                  </td>
                  <td className="py-3 text-right text-accent-green">
                    ${record.cost.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
