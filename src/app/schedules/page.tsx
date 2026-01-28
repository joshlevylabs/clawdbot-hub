"use client";

import { useState, useEffect } from "react";
import { Clock, Play, Pause, Calendar, RefreshCw } from "lucide-react";

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
  // Simple cron expression to human-readable
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

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export default function SchedulesPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      // Fetch from local file or API
      const response = await fetch("/api/schedules");
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      } else {
        // Fallback to hardcoded data for demo
        setJobs([
          {
            id: "morning-brief",
            name: "Morning Brief",
            enabled: true,
            schedule: { kind: "cron", expr: "0 6 * * *", tz: "America/Los_Angeles" },
            payload: { message: "Morning brief for Joshua at 6am..." },
            state: { nextRunAtMs: Date.now() + 86400000, lastStatus: "ok" },
          },
          {
            id: "scriptbot-weekly",
            name: "ScriptBot Weekly",
            enabled: true,
            schedule: { kind: "cron", expr: "0 9 * * 0", tz: "America/Los_Angeles" },
            payload: { message: "ScriptBot Weekly Trigger..." },
            state: { nextRunAtMs: Date.now() + 604800000 },
          },
        ]);
      }
    } catch (err) {
      console.error("Failed to fetch schedules:", err);
      setError("Failed to load schedules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Schedules</h1>
          <p className="text-gray-400 mt-1">Automated cron jobs and scheduled tasks</p>
        </div>
        <button
          onClick={fetchJobs}
          className="flex items-center gap-2 px-4 py-2 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Jobs List */}
      <div className="space-y-4">
        {jobs.map((job) => (
          <div
            key={job.id}
            className={`bg-dark-800 rounded-xl border p-6 transition-all ${
              job.enabled ? "border-dark-600" : "border-dark-700 opacity-60"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${
                  job.enabled ? "bg-accent-purple/20" : "bg-dark-700"
                }`}>
                  <Clock className={`w-6 h-6 ${
                    job.enabled ? "text-accent-purple" : "text-gray-500"
                  }`} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    {job.name}
                    {job.enabled ? (
                      <span className="text-xs bg-accent-green/20 text-accent-green px-2 py-0.5 rounded">
                        Active
                      </span>
                    ) : (
                      <span className="text-xs bg-dark-600 text-gray-400 px-2 py-0.5 rounded">
                        Paused
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>{formatCronExpression(job.schedule.expr)}</span>
                    <span className="text-gray-600">•</span>
                    <span>{job.schedule.tz}</span>
                  </div>
                  <p className="text-gray-500 mt-2 text-sm line-clamp-2">
                    {job.payload.message.substring(0, 150)}...
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {job.enabled ? (
                  <Pause className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer" />
                ) : (
                  <Play className="w-5 h-5 text-gray-400 hover:text-accent-green cursor-pointer" />
                )}
              </div>
            </div>

            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-dark-600 text-sm text-gray-400">
              {job.state.nextRunAtMs && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Next run:</span>
                  <span className="text-white">{formatDate(job.state.nextRunAtMs)}</span>
                </div>
              )}
              {job.state.lastRunAtMs && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Last run:</span>
                  <span>{formatDate(job.state.lastRunAtMs)}</span>
                  {job.state.lastStatus === "ok" && (
                    <span className="text-accent-green">✓</span>
                  )}
                </div>
              )}
              {job.state.lastDurationMs && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Duration:</span>
                  <span>{formatDuration(job.state.lastDurationMs)}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {!loading && jobs.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No scheduled jobs yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
