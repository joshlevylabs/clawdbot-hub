"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Eye,
  LayoutGrid,
  LayoutList,
  Target,
  Circle,
  Clock,
  AlertTriangle,
  CheckCircle,
  Zap,
  Filter,
  ChevronDown,
  Check
} from "lucide-react";
import TicketDetailModal from "@/components/TicketDetailModal";

// Task type based on task-registry.json structure
interface Task {
  key: string;
  text: string;
  tag: "AGENT" | "JOSHUA" | "PLAN" | "CEO";
  priority: "high" | "medium" | "low";
  assignee: string;
  status: "pending" | "backlog" | "in-progress" | "done" | "done_but_unverified" | "approved";
  sourceStandup: string;
  sourceStandupType: string;
  sourceDate: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  sprintReady?: boolean;
  specFile?: string;
  phase?: string;
  description?: string;
  // Alternate field names (some tasks use title/type instead of text/tag)
  title?: string;
  type?: string;
}

interface TaskRegistry {
  tasks: Task[];
}

// Normalize tasks that may use alternate field names
function normalizeTask(task: any): Task {
  return {
    ...task,
    text: task.text || task.title || task.key,
    tag: (task.tag || task.type || "AGENT").toUpperCase(),
    status: task.status === "backlog" ? "pending" : (task.status || "pending"),
    sourceStandup: task.sourceStandup || "",
    sourceStandupType: task.sourceStandupType || "",
    sourceDate: task.sourceDate || task.createdAt || "",
    assignee: task.assignee || "—",
  };
}

type ViewMode = "table" | "kanban";

// Multi-select dropdown component
function MultiSelectFilter({ 
  label, 
  options, 
  selected, 
  onChange 
}: { 
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value) 
        ? selected.filter(v => v !== value)
        : [...selected, value]
    );
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600 transition-colors"
      >
        <span>{label}</span>
        {selected.length > 0 && (
          <span className="bg-primary-500/20 text-primary-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {selected.length}
          </span>
        )}
        <ChevronDown className="w-3 h-3 text-slate-500" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl min-w-[180px] py-1">
          {selected.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="w-full text-left px-3 py-1.5 text-[11px] text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors"
            >
              Clear all
            </button>
          )}
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700/50 transition-colors"
            >
              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                selected.includes(opt.value) 
                  ? "bg-primary-500 border-primary-500" 
                  : "border-slate-600"
              }`}>
                {selected.includes(opt.value) && (
                  <Check className="w-2.5 h-2.5 text-white" />
                )}
              </div>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Status configuration for kanban columns
const statusConfig = {
  pending: { 
    label: "Backlog", 
    color: "amber", 
    bgColor: "from-slate-850 to-amber-950/20",
    icon: Circle
  },
  "in-progress": { 
    label: "In Progress", 
    color: "blue", 
    bgColor: "from-slate-850 to-blue-950/20",
    icon: Clock
  },
  done_but_unverified: { 
    label: "Review", 
    color: "yellow", 
    bgColor: "from-slate-850 to-yellow-950/20",
    icon: AlertTriangle
  },
  done: { 
    label: "Done", 
    color: "emerald", 
    bgColor: "from-slate-850 to-emerald-950/20",
    icon: CheckCircle
  },
  approved: { 
    label: "Approved", 
    color: "emerald", 
    bgColor: "from-slate-850 to-emerald-950/20",
    icon: CheckCircle
  },
};

function TaskCard({ task, onClick }: { task: Task; onClick: (task: Task) => void }) {
  const statusColors = {
    pending: "border-amber-500/30",
    "in-progress": "border-blue-500/30",
    done_but_unverified: "border-yellow-500/30", 
    done: "border-emerald-500/30",
    approved: "border-emerald-500/30"
  };

  const priorityColors = {
    high: "text-red-400",
    medium: "text-amber-400", 
    low: "text-slate-400"
  };

  return (
    <div 
      onClick={() => onClick(task)}
      className={`bg-gradient-to-br from-slate-850 to-slate-900/50 rounded-xl border ${statusColors[task.status]} p-4 cursor-pointer hover:shadow-lg hover:border-opacity-60 transition-all group`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-mono text-primary-400 font-bold">{task.key}</span>
        {task.sprintReady && (
          <Zap className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        )}
      </div>
      
      <h3 className="font-medium text-slate-200 group-hover:text-white transition-colors line-clamp-2 mb-3">
        {task.text}
      </h3>
      
      <div className="space-y-3">
        {/* Priority and Type */}
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium ${priorityColors[task.priority]}`}>
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </span>
          {task.tag === "AGENT" ? (
            <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              🤖 AGENT
            </span>
          ) : task.tag === "PLAN" ? (
            <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-violet-500/15 text-violet-400 border border-violet-500/30">
              📋 PLAN
            </span>
          ) : (
            <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">
              👤 CEO
            </span>
          )}
        </div>

        {/* Assignee */}
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold ${
            task.assignee === "Agent" ? "bg-cyan-500/20 text-cyan-400" :
            task.assignee === "Joshua" ? "bg-purple-500/20 text-purple-400" :
            "bg-slate-500/20 text-slate-400"
          }`}>
            {(task.assignee || "?")[0]}
          </div>
          <span className="text-xs text-slate-400">{task.assignee || "—"}</span>
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({ 
  status, 
  tasks, 
  onTaskClick 
}: { 
  status: keyof typeof statusConfig; 
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="flex flex-col h-full min-h-96">
      <div className={`bg-gradient-to-br ${config.bgColor} rounded-t-xl border border-slate-800 p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 bg-${config.color}-600/20 rounded-lg flex items-center justify-center`}>
              <Icon className={`w-4 h-4 text-${config.color}-400`} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-200">{config.label}</h2>
              <span className="text-xs text-slate-500">{tasks.length} tasks</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 space-y-3 p-4 bg-slate-900/20 border-l border-r border-slate-800 rounded-b-xl">
        {tasks.map((task) => (
          <TaskCard key={task.key} task={task} onClick={onTaskClick} />
        ))}
        
        {tasks.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">No tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BulletinPage() {
  const [taskRegistry, setTaskRegistry] = useState<TaskRegistry | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>(["pending", "in-progress", "done_but_unverified"]);
  const [standupTypeFilter, setStandupTypeFilter] = useState<string[]>([]);
  const [verticalFilter, setVerticalFilter] = useState<string[]>([]);
  const [standupIndex, setStandupIndex] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Load tasks from API (merges sprint-ready flags from Supabase)
        const res = await fetch("/api/tasks");
        if (res.ok) {
          const data = await res.json();
          setTaskRegistry({ tasks: (data.tasks || []).map(normalizeTask) });
        } else {
          // Fallback to static file
          const staticRes = await fetch("/data/standups/task-registry.json");
          if (staticRes.ok) {
            const staticData = await staticRes.json();
            setTaskRegistry({ tasks: (staticData.tasks || []).map(normalizeTask) });
          }
        }

        // Load standup index
        const indexRes = await fetch("/data/standups/index.json");
        if (indexRes.ok) {
          setStandupIndex(await indexRes.json());
        }
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Build vertical lookup map from standup index
  const verticalMap: Record<string, string[]> = {};
  if (standupIndex) {
    for (const s of standupIndex.standups) {
      if (s.instanceKey) verticalMap[s.instanceKey] = s.verticals || [];
    }
  }

  // Filter tasks based on filters
  const filteredTasks = taskRegistry ? taskRegistry.tasks.filter((task: Task) => {
    if (typeFilter.length > 0 && !typeFilter.includes(task.tag.toLowerCase())) return false;
    if (statusFilter.length > 0 && !statusFilter.includes(task.status)) return false;
    if (standupTypeFilter.length > 0 && !standupTypeFilter.includes(task.sourceStandupType)) return false;
    if (verticalFilter.length > 0) {
      const taskVerticals = verticalMap[task.sourceStandup] || [];
      if (!verticalFilter.some(v => taskVerticals.includes(v))) return false;
    }
    return true;
  }) : [];

  // Calculate stats
  const totalTasks = taskRegistry?.tasks.length || 0;
  const agentTasks = taskRegistry?.tasks.filter((t: Task) => t.tag === "AGENT").length || 0;
  const joshuaTasks = taskRegistry?.tasks.filter((t: Task) => t.tag === "JOSHUA" || t.tag === "CEO").length || 0;
  const planTasks = taskRegistry?.tasks.filter((t: Task) => t.tag === "PLAN").length || 0;
  const doneTasks = taskRegistry?.tasks.filter((t: Task) => t.status === "done" || t.status === "approved").length || 0;
  const completionPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Get unique standup types for filter
  const standupTypes: string[] = taskRegistry ? Array.from(new Set(taskRegistry.tasks.map((t: Task) => t.sourceStandupType as string))).filter(Boolean) : [];

  // Get unique verticals from standup index
  const allVerticals = standupIndex ? Array.from(new Set(
    standupIndex.standups.flatMap((s: any) => (s.verticals || []) as string[])
  )) : [];
  const verticals: string[] = (allVerticals.filter(Boolean) as string[]).sort();

  // Group tasks by status for kanban
  const tasksByStatus = {
    pending: filteredTasks.filter(t => t.status === 'pending'),
    "in-progress": filteredTasks.filter(t => t.status === 'in-progress'),
    done_but_unverified: filteredTasks.filter(t => t.status === 'done_but_unverified'),
    done: filteredTasks.filter(t => t.status === 'done'),
    approved: filteredTasks.filter(t => t.status === 'approved')
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleTaskUpdate = async (updates: Partial<Task>) => {
    if (!selectedTask) return;
    // Update the selected task locally
    setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
    // Also update the task in the registry state so the list reflects changes
    setTaskRegistry(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map(t => 
          t.key === selectedTask.key ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
        ),
      };
    });
  };

  const handleToggleSprintReady = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const newValue = !task.sprintReady;
    // Optimistic update
    setTaskRegistry(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map(t => t.key === task.key ? { ...t, sprintReady: newValue } : t),
      };
    });
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskKey: task.key, sprintReady: newValue }),
      });
      if (!res.ok) {
        // Revert on failure
        setTaskRegistry(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            tasks: prev.tasks.map(t => t.key === task.key ? { ...t, sprintReady: !newValue } : t),
          };
        });
      }
    } catch {
      // Revert on error
      setTaskRegistry(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: prev.tasks.map(t => t.key === task.key ? { ...t, sprintReady: !newValue } : t),
        };
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-slate-900/50 rounded-xl border border-slate-800 p-3 h-16 animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 h-20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Bulletin</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Task management dashboard with table and kanban views
          </p>
        </div>
        
        {/* View Toggle */}
        <div className="flex items-center bg-slate-800/50 rounded-lg p-1">
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              viewMode === "table"
                ? "bg-primary-600/20 text-primary-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LayoutList className="w-4 h-4" />
            📋 Table
          </button>
          <button
            onClick={() => setViewMode("kanban")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              viewMode === "kanban"
                ? "bg-primary-600/20 text-primary-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            📊 Kanban
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-3 text-center">
          <p className="text-xl font-bold text-slate-100">{totalTasks}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Total Tasks</p>
        </div>
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-3 text-center">
          <p className="text-xl font-bold text-cyan-400">{agentTasks}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">🤖 Agent</p>
        </div>
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-3 text-center">
          <p className="text-xl font-bold text-purple-400">{joshuaTasks}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">👤 Joshua</p>
        </div>
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-3 text-center">
          <p className="text-xl font-bold text-violet-400">{planTasks}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">📋 Plan</p>
        </div>
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-3 text-center">
          <p className="text-xl font-bold text-emerald-400">{doneTasks}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">✅ Done</p>
        </div>
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-3 text-center">
          <p className="text-xl font-bold text-primary-400">{completionPercent}%</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Completion</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-slate-500" />
          
          {/* Type dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Type</label>
            <MultiSelectFilter
              label="Type"
              options={[
                {value: "agent", label: "🤖 Agent"},
                {value: "joshua", label: "👤 Joshua"},
                {value: "ceo", label: "👤 CEO"},
                {value: "plan", label: "📋 Plan"}
              ]}
              selected={typeFilter}
              onChange={setTypeFilter}
            />
          </div>

          {/* Status dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Status</label>
            <MultiSelectFilter
              label="Status"
              options={[
                {value: "pending", label: "Pending"},
                {value: "in-progress", label: "In Progress"},
                {value: "done_but_unverified", label: "Review"},
                {value: "done", label: "Done"},
                {value: "approved", label: "Approved"}
              ]}
              selected={statusFilter}
              onChange={setStatusFilter}
            />
          </div>

          {/* Standup dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Standup</label>
            <MultiSelectFilter
              label="Standup"
              options={standupTypes.map((type: string) => {
                const typeNames: Record<string, string> = {
                  "morning-priorities": "Morning",
                  "ecosystem-sync": "Ecosystem",
                  "cto-app-store": "App Store", 
                  "cmo-distribution": "Distribution",
                  "cro-market-intel": "Business Dev",
                  "evening-wrap": "Evening",
                  "afternoon-checkpoint": "Afternoon",
                  "midnight-prep": "Midnight",
                };
                return {
                  value: type,
                  label: typeNames[type] || type
                };
              })}
              selected={standupTypeFilter}
              onChange={setStandupTypeFilter}
            />
          </div>

          {/* Vertical dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Vertical</label>
            <MultiSelectFilter
              label="Vertical"
              options={verticals.map((vertical: string) => ({
                value: vertical,
                label: vertical.charAt(0).toUpperCase() + vertical.slice(1)
              }))}
              selected={verticalFilter}
              onChange={setVerticalFilter}
            />
          </div>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === "table" ? (
        /* Jira-style Tasks Table */
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
          {filteredTasks.length === 0 ? (
            <div className="p-6 text-center">
              <Target className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No tasks found matching your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[44px]">Action</th>
                    <th className="text-left px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[44px]">Sprint</th>
                    <th className="text-left px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[70px]">Key</th>
                    <th className="text-left px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider max-w-[400px]">Title</th>
                    <th className="text-left px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[80px]">Priority</th>
                    <th className="text-left px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[90px]">Status</th>
                    <th className="text-left px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[80px]">Type</th>
                    <th className="text-left px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[90px]">Assignee</th>
                    <th className="text-left px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[90px]">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task: Task, idx: number) => {
                    const priorityColors: Record<string, string> = {
                      high: "text-red-400",
                      medium: "text-amber-400",
                      low: "text-slate-400",
                    };
                    const priorityIcons: Record<string, string> = {
                      high: "↑",
                      medium: "→",
                      low: "↓",
                    };
                    const statusColors: Record<string, string> = {
                      pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
                      "in-progress": "bg-blue-500/15 text-blue-400 border-blue-500/30",
                      done: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                      done_but_unverified: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
                      approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                    };
                    const statusLabels: Record<string, string> = {
                      pending: "PENDING",
                      "in-progress": "IN PROGRESS",
                      done: "DONE",
                      done_but_unverified: "REVIEW",
                      approved: "APPROVED",
                    };
                    return (
                      <tr
                        key={task.key}
                        className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${
                          idx % 2 === 0 ? "bg-slate-900/20" : "bg-transparent"
                        }`}
                      >
                        <td className="px-3 py-1.5">
                          <button
                            onClick={() => handleTaskClick(task)}
                            className="p-1 text-slate-400 hover:text-primary-400 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="px-3 py-1.5">
                          <button
                            onClick={(e) => handleToggleSprintReady(task, e)}
                            className={`p-1 rounded-md transition-all ${
                              task.sprintReady
                                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                : "bg-slate-800/50 text-slate-600 hover:text-slate-400 hover:bg-slate-700/50"
                            }`}
                            title={task.sprintReady ? "Remove from sprint" : "Mark sprint-ready"}
                          >
                            <Zap className="w-4 h-4" strokeWidth={task.sprintReady ? 2.5 : 1.5} />
                          </button>
                        </td>
                        <td className="px-3 py-1.5">
                          <span className="text-sm font-mono font-bold text-primary-400">{task.key}</span>
                        </td>
                        <td className="px-3 py-1.5 max-w-[400px]">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm leading-snug truncate ${task.status === "done" ? "text-slate-500 line-through" : "text-slate-200"}`}>
                              {task.text}
                            </p>
                            {task.sprintReady && (
                              <Zap className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-1.5">
                          <span className={`text-sm font-medium ${priorityColors[task.priority] || "text-slate-400"}`}>
                            {priorityIcons[task.priority] || "→"} {(task.priority || "medium").charAt(0).toUpperCase() + (task.priority || "medium").slice(1)}
                          </span>
                        </td>
                        <td className="px-3 py-1.5">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${statusColors[task.status] || statusColors.pending}`}>
                            {statusLabels[task.status] || task.status?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-1.5">
                          {task.tag === "AGENT" ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">🤖 AGENT</span>
                          ) : task.tag === "PLAN" ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-violet-500/15 text-violet-400 border border-violet-500/30">📋 PLAN</span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">👤 CEO</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              task.assignee === "Agent" ? "bg-cyan-500/20 text-cyan-400" :
                              task.assignee === "Joshua" ? "bg-purple-500/20 text-purple-400" :
                              "bg-slate-500/20 text-slate-400"
                            }`}>
                              {(task.assignee || "?")[0]}
                            </div>
                            <span className="text-xs text-slate-300">{task.assignee || "—"}</span>
                          </div>
                        </td>
                        <td className="px-3 py-1.5 max-w-[90px]">
                          <span className="text-xs text-primary-400/80 font-mono truncate block" title={task.sourceStandup || "—"}>{task.sourceStandup || "—"}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-4 py-2 border-t border-slate-800/50 text-xs text-slate-500">
                {filteredTasks.length} of {totalTasks} tasks
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Kanban Board */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-h-96">
          {(Object.keys(statusConfig) as Array<keyof typeof statusConfig>).map((status) => {
            const tasks = tasksByStatus[status as keyof typeof tasksByStatus] || [];
            return (
              <KanbanColumn
                key={status}
                status={status}
                tasks={tasks}
                onTaskClick={handleTaskClick}
              />
            );
          })}
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TicketDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
        />
      )}
    </div>
  );
}
