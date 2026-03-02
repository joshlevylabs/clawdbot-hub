"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Clock,
  Calendar,
  PlayCircle,
  PauseCircle,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Timer,
  Activity,
  TrendingUp,
  Copy,
  Settings,
  Zap,
  Eye,
  EyeOff,
  ChevronDown,
  BarChart3,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CronSchedule {
  kind: string;
  expr?: string;
  atMs?: number;
  tz?: string;
}

interface CronState {
  nextRunAtMs: number;
  lastRunAtMs: number;
  lastStatus: string;
  lastDurationMs: number;
}

interface CronPayload {
  model: string;
  deliver: boolean;
  channel: string;
}

interface CronAgent {
  id: string;
  name: string;
  emoji: string;
  title: string;
}

interface CronJob {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  schedule: CronSchedule;
  sessionTarget: string;
  state: CronState;
  payload: CronPayload;
  agent: CronAgent;
}

interface CronData {
  version: number;
  lastSync: string;
  jobs: CronJob[];
}

interface TimelineEvent {
  job: CronJob;
  hour: number;
  minute: number;
  weekdays?: number[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function formatRelativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const absMin = Math.abs(Math.floor(diff / 60000));
  
  if (diff > 0) {
    // Past
    if (absMin < 60) return `${absMin}m ago`;
    const hrs = Math.floor(absMin / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } else {
    // Future
    if (absMin < 60) return `in ${absMin}m`;
    const hrs = Math.floor(absMin / 60);
    if (hrs < 24) return `in ${hrs}h`;
    return `in ${Math.floor(hrs / 24)}d`;
  }
}

function parseCronExpression(expr: string | undefined | null): { hours?: number[]; minutes?: number[]; weekdays?: number[]; description: string } {
  if (!expr) return { description: "one-shot" };
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) {
    return { description: expr };
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  
  // Parse minutes
  const minutes: number[] = [];
  if (minute === "*") {
    minutes.push(0); // Default to 0 for display
  } else if (minute.includes("*/")) {
    const interval = parseInt(minute.split("/")[1]);
    for (let i = 0; i < 60; i += interval) {
      minutes.push(i);
    }
  } else if (minute.includes(",")) {
    minutes.push(...minute.split(",").map(Number));
  } else {
    minutes.push(parseInt(minute));
  }

  // Parse hours
  const hours: number[] = [];
  if (hour === "*") {
    for (let i = 0; i < 24; i++) hours.push(i);
  } else if (hour.includes("-")) {
    const [start, end] = hour.split("-").map(Number);
    for (let i = start; i <= end; i++) hours.push(i);
  } else if (hour.includes(",")) {
    hours.push(...hour.split(",").map(Number));
  } else {
    hours.push(parseInt(hour));
  }

  // Parse weekdays
  let weekdays: number[] | undefined;
  if (dayOfWeek !== "*") {
    weekdays = [];
    if (dayOfWeek.includes("-")) {
      const [start, end] = dayOfWeek.split("-").map(Number);
      for (let i = start; i <= end; i++) weekdays.push(i);
    } else if (dayOfWeek.includes(",")) {
      weekdays.push(...dayOfWeek.split(",").map(Number));
    } else {
      weekdays.push(parseInt(dayOfWeek));
    }
  }

  // Generate description
  let description = "";
  if (minute.startsWith("*/")) {
    description += `Every ${minute.split("/")[1]} min`;
  } else if (minutes.length === 1 && minutes[0] === 0) {
    description += "Hourly";
  } else {
    description += `At :${minutes.map(m => m.toString().padStart(2, '0')).join(", :")}`;
  }

  if (hours.length === 1) {
    description += ` at ${hours[0]}:00`;
  } else if (hours.length > 1 && hours.length < 24) {
    description += `, ${hours[0]}am-${hours[hours.length - 1]}pm`;
  }

  if (weekdays && weekdays.length < 7) {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    if (weekdays.length === 5 && weekdays.every(d => d >= 1 && d <= 5)) {
      description += " weekdays";
    } else {
      description += ` ${weekdays.map(d => dayNames[d]).join(", ")}`;
    }
  }

  return { hours, minutes, weekdays, description };
}

function generateTimelineEvents(jobs: CronJob[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  
  jobs.forEach(job => {
    if (!job.enabled) return;
    
    const parsed = parseCronExpression(job.schedule.expr);
    const hours = parsed.hours;
    const minutes = parsed.minutes;
    if (!hours || !minutes) return;

    hours.forEach(hour => {
      minutes.forEach(minute => {
        events.push({
          job,
          hour,
          minute,
          weekdays: parsed.weekdays,
        });
      });
    });
  });

  return events.sort((a, b) => a.hour === b.hour ? a.minute - b.minute : a.hour - b.hour);
}

/* ------------------------------------------------------------------ */
/*  Components                                                         */
/* ------------------------------------------------------------------ */

function StatsPanel({ jobs }: { jobs: CronJob[] }) {
  const totalJobs = jobs.length;
  const enabledJobs = jobs.filter(j => j.enabled).length;
  const errorJobs = jobs.filter(j => j.state.lastStatus === "error").length;
  
  // Calculate estimated API calls per day
  let estimatedCallsPerDay = 0;
  jobs.forEach(job => {
    if (!job.enabled) return;
    const parsed = parseCronExpression(job.schedule.expr);
    if (!parsed.hours || !parsed.minutes) return;
    
    let dailyRuns = 0;
    const totalSlots = parsed.hours.length * parsed.minutes.length;
    
    if (parsed.weekdays && parsed.weekdays.length < 7) {
      dailyRuns = (totalSlots * parsed.weekdays.length) / 7;
    } else {
      dailyRuns = totalSlots;
    }
    
    estimatedCallsPerDay += dailyRuns;
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-teal-400" strokeWidth={1.5} />
          <span className="text-xs text-slate-500 font-medium">Total Jobs</span>
        </div>
        <p className="text-2xl font-bold text-slate-100">{totalJobs}</p>
        <p className="text-xs text-slate-500 mt-1">{enabledJobs} enabled</p>
      </div>

      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-green-400" strokeWidth={1.5} />
          <span className="text-xs text-slate-500 font-medium">Active Now</span>
        </div>
        <p className="text-2xl font-bold text-slate-100">{enabledJobs}</p>
        <p className="text-xs text-slate-500 mt-1">{Math.round((enabledJobs / totalJobs) * 100)}% of total</p>
      </div>

      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-4 h-4 text-blue-400" strokeWidth={1.5} />
          <span className="text-xs text-slate-500 font-medium">Est. Calls/Day</span>
        </div>
        <p className="text-2xl font-bold text-slate-100">{Math.round(estimatedCallsPerDay)}</p>
        <p className="text-xs text-slate-500 mt-1">~{Math.round(estimatedCallsPerDay * 30)}/month</p>
      </div>

      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-red-400" strokeWidth={1.5} />
          <span className="text-xs text-slate-500 font-medium">Errors</span>
        </div>
        <p className="text-2xl font-bold text-slate-100">{errorJobs}</p>
        <p className="text-xs text-slate-500 mt-1">{errorJobs > 0 ? "needs attention" : "all healthy"}</p>
      </div>
    </div>
  );
}

function Timeline({ jobs }: { jobs: CronJob[] }) {
  const events = generateTimelineEvents(jobs);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  // Group events by hour for overlap detection
  const eventsByHour: Record<number, TimelineEvent[]> = {};
  events.forEach(event => {
    if (!eventsByHour[event.hour]) eventsByHour[event.hour] = [];
    eventsByHour[event.hour].push(event);
  });

  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-violet-400" strokeWidth={1.5} />
        <h2 className="text-sm font-semibold text-slate-200">24-Hour Timeline (PT)</h2>
        <div className="ml-auto flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Enabled
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-600" /> Disabled
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Error
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Hour labels */}
          <div className="flex mb-2">
            {hours.map(hour => (
              <div key={hour} className="flex-1 text-center">
                <span className="text-xs text-slate-500 font-medium">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Timeline bars */}
          <div className="relative h-16 bg-slate-800/30 rounded-lg mb-4">
            {hours.map(hour => {
              const hourEvents = eventsByHour[hour] || [];
              const hasOverlap = hourEvents.length > 1;
              
              return (
                <div key={hour} className="absolute top-0 bottom-0" style={{ 
                  left: `${(hour / 24) * 100}%`, 
                  width: `${100 / 24}%` 
                }}>
                  {hourEvents.map((event, idx) => {
                    const color = !event.job.enabled ? '#64748b' : 
                                 event.job.state.lastStatus === 'error' ? '#ef4444' : '#22c55e';
                    const opacity = hasOverlap ? 0.7 : 1;
                    const height = hasOverlap ? `${100 / hourEvents.length}%` : '100%';
                    const top = hasOverlap ? `${(idx / hourEvents.length) * 100}%` : '0%';
                    
                    return (
                      <div
                        key={idx}
                        className="absolute left-1 right-1 rounded"
                        style={{ 
                          backgroundColor: color,
                          opacity,
                          height,
                          top,
                        }}
                        title={`${event.job.name} at ${hour}:${event.minute.toString().padStart(2, '0')}`}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Job rows */}
          <div className="space-y-1">
            {jobs.filter(j => j.enabled).map(job => {
              const jobEvents = events.filter(e => e.job.id === job.id);
              const color = job.state.lastStatus === 'error' ? '#ef4444' : '#22c55e';
              
              return (
                <div key={job.id} className="relative h-6 bg-slate-800/20 rounded flex items-center">
                  <span className="text-xs text-slate-400 w-32 flex-shrink-0 px-2 truncate">
                    {job.agent.emoji} {job.name}
                  </span>
                  <div className="flex-1 relative">
                    {jobEvents.map((event, idx) => (
                      <div
                        key={idx}
                        className="absolute w-1 h-4 rounded-full"
                        style={{
                          left: `${((event.hour + event.minute / 60) / 24) * 100}%`,
                          backgroundColor: color,
                        }}
                        title={`${event.hour}:${event.minute.toString().padStart(2, '0')}`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function JobCard({ job, onCopyCommand }: { job: CronJob; onCopyCommand: (job: CronJob) => void }) {
  const [expanded, setExpanded] = useState(false);
  const parsed = parseCronExpression(job.schedule.expr);
  
  const statusColor = !job.enabled ? 'text-slate-500' :
                     job.state.lastStatus === 'error' ? 'text-red-400' :
                     job.state.lastStatus === 'ok' ? 'text-green-400' :
                     'text-yellow-400';

  const statusIcon = !job.enabled ? PauseCircle :
                    job.state.lastStatus === 'error' ? AlertCircle :
                    job.state.lastStatus === 'ok' ? CheckCircle :
                    Clock;

  const StatusIcon = statusIcon;

  return (
    <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-5 hover:border-slate-700 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{job.agent.emoji}</span>
          <div>
            <h3 className="text-base font-semibold text-slate-100">{job.name}</h3>
            <p className="text-xs text-slate-500">{job.agent.name} • {job.agent.title}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-4 h-4 ${statusColor}`} strokeWidth={1.5} />
          <span className={`text-xs font-medium ${statusColor}`}>
            {job.enabled ? (job.state.lastStatus === 'ok' ? 'Running' : job.state.lastStatus) : 'Disabled'}
          </span>
        </div>
      </div>

      {/* Schedule and model */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-slate-500 mb-1">Schedule</p>
          <p className="text-sm text-slate-200 font-medium">{parsed.description}</p>
          <p className="text-xs text-slate-600 font-mono">{job.schedule.expr || job.schedule.kind}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Model</p>
          <p className="text-sm text-slate-200">{job.payload.model}</p>
          <div className="flex items-center gap-2 mt-1">
            {job.payload.deliver && (
              <span className="px-2 py-0.5 rounded text-xs bg-blue-500/10 text-blue-400 border border-blue-500/30">
                Delivers to {job.payload.channel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Last run / next run */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-slate-500 mb-1">Last Run</p>
          <p className="text-sm text-slate-200">
            {job.state.lastRunAtMs ? formatRelativeTime(job.state.lastRunAtMs) : "Never"}
          </p>
          {job.state.lastDurationMs > 0 && (
            <p className="text-xs text-slate-600">Duration: {formatDuration(job.state.lastDurationMs)}</p>
          )}
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Next Run</p>
          <p className="text-sm text-slate-200">
            {job.state.nextRunAtMs ? formatRelativeTime(job.state.nextRunAtMs) : "Not scheduled"}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-slate-800/50">
        <button
          onClick={() => onCopyCommand(job)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 transition-colors"
        >
          <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
          Copy CLI Command
        </button>
        
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 transition-colors"
        >
          {expanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {expanded ? "Hide" : "Show"} Details
        </button>

        <div className="ml-auto flex items-center gap-2">
          {job.sessionTarget && (
            <span className="text-xs text-slate-600">{job.sessionTarget}</span>
          )}
          {!job.enabled && (
            <span className="px-2 py-0.5 rounded text-xs bg-slate-600/20 text-slate-500 border border-slate-600/30">
              Disabled
            </span>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-800/50">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-slate-500 mb-2">Job ID</p>
              <p className="text-slate-400 font-mono break-all">{job.id}</p>
            </div>
            <div>
              <p className="text-slate-500 mb-2">Created</p>
              <p className="text-slate-400">
                {job.state.lastRunAtMs ? new Date(job.state.lastRunAtMs).toLocaleDateString() : "Unknown"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function JobList({ jobs, onCopyCommand }: { jobs: CronJob[]; onCopyCommand: (job: CronJob) => void }) {
  const [sortBy, setSortBy] = useState<"nextRun" | "name" | "frequency">("nextRun");
  const [filterBy, setFilterBy] = useState<"all" | "enabled" | "disabled" | "error">("all");
  
  // Filter jobs
  let filteredJobs = jobs;
  if (filterBy === "enabled") filteredJobs = jobs.filter(j => j.enabled);
  else if (filterBy === "disabled") filteredJobs = jobs.filter(j => !j.enabled);
  else if (filterBy === "error") filteredJobs = jobs.filter(j => j.state.lastStatus === "error");

  // Sort jobs
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "frequency":
        // Sort by estimated runs per day (rough approximation)
        const aRuns = a.schedule.expr?.includes("*/") ? 96 : a.schedule.expr === "0 * * * *" ? 24 : 1;
        const bRuns = b.schedule.expr?.includes("*/") ? 96 : b.schedule.expr === "0 * * * *" ? 24 : 1;
        return bRuns - aRuns;
      case "nextRun":
      default:
        if (!a.state.nextRunAtMs && !b.state.nextRunAtMs) return 0;
        if (!a.state.nextRunAtMs) return 1;
        if (!b.state.nextRunAtMs) return -1;
        return a.state.nextRunAtMs - b.state.nextRunAtMs;
    }
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-teal-400" strokeWidth={1.5} />
          <h2 className="text-sm font-semibold text-slate-200">Cron Jobs</h2>
          <span className="text-xs text-slate-500">({sortedJobs.length} jobs)</span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Filter dropdown */}
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 text-slate-300 border border-slate-700 focus:border-slate-500 focus:outline-none"
          >
            <option value="all">All Jobs</option>
            <option value="enabled">Enabled Only</option>
            <option value="disabled">Disabled Only</option>
            <option value="error">Errors Only</option>
          </select>

          {/* Sort dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 text-slate-300 border border-slate-700 focus:border-slate-500 focus:outline-none"
          >
            <option value="nextRun">Sort by Next Run</option>
            <option value="name">Sort by Name</option>
            <option value="frequency">Sort by Frequency</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4">
        {sortedJobs.map(job => (
          <JobCard
            key={job.id}
            job={job}
            onCopyCommand={onCopyCommand}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function CronsPage() {
  const [data, setData] = useState<CronData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/data/cron-jobs.json?t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: CronData = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load cron data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCopyCommand = useCallback((job: CronJob) => {
    const command = `clawdbot cron update ${job.id} --enabled=${job.enabled}${job.schedule.expr ? ` --schedule="${job.schedule.expr}"` : ""} --name="${job.name}"`;
    navigator.clipboard.writeText(command);
    // Could add a toast notification here
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-600/20 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-violet-400 animate-pulse" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Cron Job Manager</h1>
            <p className="text-slate-500 text-sm">Loading scheduled jobs…</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 h-24 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600/20 rounded-lg flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-400" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Cron Job Manager</h1>
            <p className="text-red-400 text-sm">Error: {error ?? "No data"}</p>
          </div>
        </div>
        <button
          onClick={() => fetchData()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
          Retry
        </button>
      </div>
    );
  }

  // Main content
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-600/20 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-violet-400" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Cron Job Manager</h1>
            <p className="text-slate-500 text-sm">
              Automated agent schedules • Last sync: {data.lastSync ? formatRelativeTime(new Date(data.lastSync).getTime()) : "Unknown"}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} strokeWidth={1.5} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Stats */}
      <StatsPanel jobs={data.jobs} />

      {/* Timeline */}
      <Timeline jobs={data.jobs} />

      {/* Job List */}
      <JobList jobs={data.jobs} onCopyCommand={handleCopyCommand} />
    </div>
  );
}