"use client";

import { useState, useEffect } from "react";
import { Clock, Play, Pause, Calendar, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";

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

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export default function SchedulesPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/schedules");
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error("Failed to fetch schedules:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 flex items-center gap-3">
            <Clock className="w-6 h-6 text-accent-500" strokeWidth={1.5} />
            Schedules
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Automated cron jobs and scheduled tasks</p>
        </div>
        <button
          onClick={fetchJobs}
          className="btn btn-ghost flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} strokeWidth={1.5} />
          Refresh
        </button>
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {jobs.map((job) => (
          <div
            key={job.id}
            className={`bg-slate-850 rounded-xl border p-6 transition-all ${
              job.enabled ? "border-slate-800" : "border-slate-800/50 opacity-60"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  job.enabled ? "bg-primary-600/20" : "bg-slate-800"
                }`}>
                  <Clock className={`w-5 h-5 ${
                    job.enabled ? "text-primary-400" : "text-slate-600"
                  }`} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-200 flex items-center gap-3">
                    {job.name}
                    {job.enabled ? (
                      <span className="text-xs bg-accent-600/20 text-accent-400 px-2 py-0.5 rounded font-medium">
                        Active
                      </span>
                    ) : (
                      <span className="text-xs bg-slate-800 text-slate-500 px-2 py-0.5 rounded font-medium">
                        Paused
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                    <Calendar className="w-4 h-4" strokeWidth={1.5} />
                    <span>{formatCronExpression(job.schedule.expr)}</span>
                    <span className="text-slate-700">•</span>
                    <span>{job.schedule.tz}</span>
                  </div>
                  <p className="text-slate-500 mt-3 text-sm leading-relaxed max-w-xl">
                    {job.payload.message.substring(0, 120)}...
                  </p>
                </div>
              </div>
              <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                {job.enabled ? (
                  <Pause className="w-5 h-5 text-slate-500 hover:text-slate-300" strokeWidth={1.5} />
                ) : (
                  <Play className="w-5 h-5 text-slate-500 hover:text-accent-400" strokeWidth={1.5} />
                )}
              </button>
            </div>

            <div className="flex items-center gap-8 mt-5 pt-5 border-t border-slate-800 text-sm">
              {job.state.nextRunAtMs && (
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="text-slate-600">Next:</span>
                  <span className="text-slate-300">{formatDate(job.state.nextRunAtMs)}</span>
                </div>
              )}
              {job.state.lastRunAtMs && (
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="text-slate-600">Last:</span>
                  <span>{formatDate(job.state.lastRunAtMs)}</span>
                  {job.state.lastStatus === "ok" ? (
                    <CheckCircle className="w-4 h-4 text-accent-500" strokeWidth={1.5} />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-status-error" strokeWidth={1.5} />
                  )}
                </div>
              )}
              {job.state.lastDurationMs && (
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="text-slate-600">Duration:</span>
                  <span>{formatDuration(job.state.lastDurationMs)}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {!loading && jobs.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <Clock className="w-12 h-12 mx-auto mb-4 text-slate-700" strokeWidth={1.5} />
            <p>No scheduled jobs</p>
          </div>
        )}
      </div>
    </div>
  );
}
