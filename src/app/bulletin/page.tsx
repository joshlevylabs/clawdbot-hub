"use client";

import { useState, useEffect } from "react";
import { 
  Eye,
  LayoutGrid,
  LayoutList,
  Target,
  Circle,
  Clock,
  AlertTriangle,
  CheckCircle,
  Zap
} from "lucide-react";
import TicketDetailModal from "@/components/TicketDetailModal";

// Task type based on task-registry.json structure
interface Task {
  key: string;
  text: string;
  tag: "AGENT" | "JOSHUA";
  priority: "high" | "medium" | "low";
  assignee: string;
  status: "pending" | "in-progress" | "done" | "done_but_unverified" | "resolved";
  sourceStandup: string;
  sourceStandupType: string;
  sourceDate: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  sprintReady?: boolean;
}

interface TaskRegistry {
  tasks: Task[];
}

type ViewMode = "table" | "kanban";

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
  resolved: { 
    label: "Done", 
    color: "emerald", 
    bgColor: "from-slate-850 to-emerald-950/20",
    icon: CheckCircle
  }
};

function TaskCard({ task, onClick }: { task: Task; onClick: (task: Task) => void }) {
  const statusColors = {
    pending: "border-amber-500/30",
    "in-progress": "border-blue-500/30",
    done_but_unverified: "border-yellow-500/30", 
    done: "border-emerald-500/30",
    resolved: "border-emerald-500/30"
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
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [standupTypeFilter, setStandupTypeFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchTaskRegistry() {
      try {
        const res = await fetch("/data/standups/task-registry.json");
        if (res.ok) {
          setTaskRegistry(await res.json());
        }
      } catch (err) {
        console.error("Failed to load task registry:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTaskRegistry();
  }, []);

  // Filter tasks based on filters
  const filteredTasks = taskRegistry ? taskRegistry.tasks.filter((task: Task) => {
    if (typeFilter !== "all" && task.tag.toLowerCase() !== typeFilter) return false;
    if (statusFilter !== "all" && task.status !== statusFilter) return false;
    if (standupTypeFilter !== "all" && task.sourceStandupType !== standupTypeFilter) return false;
    return true;
  }) : [];

  // Calculate stats
  const totalTasks = taskRegistry?.tasks.length || 0;
  const agentTasks = taskRegistry?.tasks.filter((t: Task) => t.tag === "AGENT").length || 0;
  const joshuaTasks = taskRegistry?.tasks.filter((t: Task) => t.tag === "JOSHUA").length || 0;
  const doneTasks = taskRegistry?.tasks.filter((t: Task) => t.status === "done" || t.status === "resolved").length || 0;
  const completionPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Get unique standup types for filter
  const standupTypes: string[] = taskRegistry ? Array.from(new Set(taskRegistry.tasks.map((t: Task) => t.sourceStandupType as string))) : [];

  // Group tasks by status for kanban
  const tasksByStatus = {
    pending: filteredTasks.filter(t => t.status === 'pending'),
    "in-progress": filteredTasks.filter(t => t.status === 'in-progress'),
    done_but_unverified: filteredTasks.filter(t => t.status === 'done_but_unverified'),
    done: filteredTasks.filter(t => t.status === 'done' || t.status === 'resolved')
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleTaskUpdate = async (updates: Partial<Task>) => {
    if (!selectedTask) return;
    // TODO: Implement task update via API
    setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-7xl">
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
    <div className="space-y-6 max-w-7xl">
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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
          <p className="text-xl font-bold text-emerald-400">{doneTasks}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">✅ Done</p>
        </div>
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-3 text-center">
          <p className="text-xl font-bold text-primary-400">{completionPercent}%</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Completion</p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-nowrap">
          <span className="text-[10px] text-slate-600 uppercase tracking-wider font-medium mr-1">Type</span>
          {[
            { key: "all", label: "All" },
            { key: "agent", label: "🤖 Agent" },
            { key: "joshua", label: "👤 Joshua" },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setTypeFilter(filter.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                typeFilter === filter.key
                  ? "bg-primary-600/20 text-primary-400 border border-primary-500/30"
                  : "bg-slate-900/30 text-slate-500 border border-slate-800 hover:border-slate-700 hover:text-slate-400"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-nowrap">
          <span className="text-[10px] text-slate-600 uppercase tracking-wider font-medium mr-1">Status</span>
          {[
            { key: "all", label: "All" },
            { key: "pending", label: "Pending" },
            { key: "in-progress", label: "In Progress" },
            { key: "done_but_unverified", label: "Review" },
            { key: "done", label: "Done" },
            { key: "resolved", label: "Resolved" },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setStatusFilter(filter.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === filter.key
                  ? "bg-primary-600/20 text-primary-400 border border-primary-500/30"
                  : "bg-slate-900/30 text-slate-500 border border-slate-800 hover:border-slate-700 hover:text-slate-400"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-nowrap">
          <span className="text-[10px] text-slate-600 uppercase tracking-wider font-medium mr-1">Standup</span>
          <button
            onClick={() => setStandupTypeFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              standupTypeFilter === "all"
                ? "bg-primary-600/20 text-primary-400 border border-primary-500/30"
                : "bg-slate-900/30 text-slate-500 border border-slate-800 hover:border-slate-700 hover:text-slate-400"
            }`}
          >
            All
          </button>
          {standupTypes.slice(0, 6).map((type: string) => {
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
            return (
              <button
                key={type}
                onClick={() => setStandupTypeFilter(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  standupTypeFilter === type
                    ? "bg-primary-600/20 text-primary-400 border border-primary-500/30"
                    : "bg-slate-900/30 text-slate-500 border border-slate-800 hover:border-slate-700 hover:text-slate-400"
                }`}
              >
                {typeNames[type] || type}
              </button>
            );
          })}
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
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[90px]">Key</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Title</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[90px]">Priority</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[110px]">Status</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[90px]">Type</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[100px]">Assignee</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[80px]">Source</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[60px]">Action</th>
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
                      resolved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
                    };
                    const statusLabels: Record<string, string> = {
                      pending: "PENDING",
                      "in-progress": "IN PROGRESS",
                      done: "DONE",
                      done_but_unverified: "REVIEW",
                      resolved: "RESOLVED",
                    };
                    return (
                      <tr
                        key={task.key}
                        className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${
                          idx % 2 === 0 ? "bg-slate-900/20" : "bg-transparent"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span className="text-sm font-mono font-bold text-primary-400">{task.key}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm leading-snug ${task.status === "done" || task.status === "resolved" ? "text-slate-500 line-through" : "text-slate-200"}`}>
                              {task.text}
                            </p>
                            {task.sprintReady && (
                              <Zap className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-medium ${priorityColors[task.priority] || "text-slate-400"}`}>
                            {priorityIcons[task.priority] || "→"} {(task.priority || "medium").charAt(0).toUpperCase() + (task.priority || "medium").slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-1 rounded text-[11px] font-semibold border ${statusColors[task.status] || statusColors.pending}`}>
                            {statusLabels[task.status] || task.status?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {task.tag === "AGENT" ? (
                            <span className="inline-block px-2 py-1 rounded text-[11px] font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">🤖 AGENT</span>
                          ) : (
                            <span className="inline-block px-2 py-1 rounded text-[11px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30">👤 CEO</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
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
                        <td className="px-4 py-3">
                          <span className="text-xs text-primary-400/80 font-mono">{task.sourceStandup || "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleTaskClick(task)}
                            className="p-1 text-slate-400 hover:text-primary-400 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
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
            // Map status for done/resolved grouping
            const tasks = status === 'done' ? tasksByStatus.done : tasksByStatus[status as keyof typeof tasksByStatus] || [];
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