"use client";

import { useState, useEffect } from "react";
import { 
  Plus, 
  Filter, 
  LayoutGrid,
  Zap,
  Users,
  Tag,
  ChevronDown,
  CheckCircle,
  Clock,
  AlertTriangle,
  Circle
} from "lucide-react";
import { useHubStore } from "@/lib/store";
import { Task } from "@/lib/store";
import TicketDetailModal from "@/components/TicketDetailModal";

// Status configuration
const statusConfig = {
  backlog: { label: "Backlog", color: "slate", bgColor: "slate-500/10" },
  "in-progress": { label: "In Progress", color: "blue", bgColor: "blue-500/10" },
  review: { label: "Review", color: "amber", bgColor: "amber-500/10" },
  done: { label: "Done", color: "emerald", bgColor: "emerald-500/10" }
};

// Priority configuration  
const priorityConfig = {
  low: { label: "Low", color: "slate", badge: "bg-slate-700 text-slate-300" },
  medium: { label: "Medium", color: "amber", badge: "bg-amber-600 text-white" },
  high: { label: "High", color: "red", badge: "bg-red-600 text-white" }
};

interface Filters {
  priority: string | null;
  assignee: string | null;
  sprintReady: boolean | null;
  labels: string[];
}

// Assignee options
const assigneeOptions = ["Theo", "Joshua", "COO", "CTO", "CMO", "CRO", "Agent"];

function TaskCard({ task, onClick }: { task: Task; onClick: (task: Task) => void }) {
  const statusColors = {
    backlog: "border-slate-600",
    "in-progress": "border-blue-500", 
    review: "border-amber-500",
    done: "border-emerald-500"
  };

  return (
    <div 
      onClick={() => onClick(task)}
      className={`bg-gradient-to-br from-slate-850 to-slate-900/50 rounded-xl border ${statusColors[task.status]} p-4 cursor-pointer hover:shadow-lg hover:border-opacity-60 transition-all group`}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-medium text-slate-200 group-hover:text-white transition-colors line-clamp-2">
          {task.title}
        </h3>
        {task.sprintReady && (
          <Zap className="w-4 h-4 text-emerald-400 flex-shrink-0 ml-2" />
        )}
      </div>
      
      <div className="space-y-3">
        {/* Priority Badge */}
        <div className="flex items-center justify-between">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityConfig[task.priority].badge}`}>
            {priorityConfig[task.priority].label}
          </span>
          {task.ticketId && (
            <span className="text-xs text-slate-500 font-mono">
              {task.ticketId}
            </span>
          )}
        </div>

        {/* Assignee */}
        {task.assignee && (
          <div className="flex items-center gap-2">
            <Users className="w-3 h-3 text-slate-500" />
            <span className="text-xs text-slate-400">{task.assignee}</span>
          </div>
        )}

        {/* Labels */}
        {task.labels && task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.labels.slice(0, 3).map((label, i) => (
              <span key={i} className="px-1.5 py-0.5 bg-slate-700/50 text-slate-300 rounded text-xs">
                {label}
              </span>
            ))}
            {task.labels.length > 3 && (
              <span className="text-xs text-slate-500">+{task.labels.length - 3}</span>
            )}
          </div>
        )}
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
  const iconMap = {
    backlog: Circle,
    "in-progress": Clock,
    review: AlertTriangle,
    done: CheckCircle
  };
  const Icon = iconMap[status];

  return (
    <div className="flex flex-col h-full min-h-96">
      <div className={`bg-gradient-to-br from-slate-850 to-${config.color}-950/20 rounded-t-xl border border-slate-800 p-4`}>
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
      
      <div className="flex-1 space-y-3 p-4 bg-slate-900/20 border-l border-r border-slate-800">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={onTaskClick} />
        ))}
        
        {tasks.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">No tasks</p>
          </div>
        )}
      </div>
      
      <div className="bg-slate-900/20 border border-slate-800 rounded-b-xl p-2">
        <button className="w-full p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>
    </div>
  );
}

function FilterDropdown({ 
  label, 
  value, 
  options, 
  onChange,
  placeholder 
}: {
  label: string;
  value: string | null;
  options: string[];
  onChange: (value: string | null) => void;
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-800/70 border border-slate-700 rounded-lg text-sm transition-colors"
      >
        <span className="text-slate-400">{label}:</span>
        <span className="text-slate-200">{value || placeholder}</span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10">
          <div className="p-1">
            <button
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-700/50 rounded text-sm"
            >
              All
            </button>
            {options.map((option) => (
              <button
                key={option}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-700/50 rounded text-sm"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BoardPage() {
  const { tasks, loading, initialized, initialize, updateTask } = useHubStore();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filters, setFilters] = useState<Filters>({
    priority: null,
    assignee: null,
    sprintReady: null,
    labels: []
  });

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.assignee && task.assignee !== filters.assignee) return false;
    if (filters.sprintReady !== null && task.sprintReady !== filters.sprintReady) return false;
    if (filters.labels.length > 0 && !filters.labels.some(label => task.labels?.includes(label))) return false;
    return true;
  });

  // Group tasks by status
  const tasksByStatus = {
    backlog: filteredTasks.filter(t => t.status === 'backlog'),
    "in-progress": filteredTasks.filter(t => t.status === 'in-progress'),
    review: filteredTasks.filter(t => t.status === 'review'),
    done: filteredTasks.filter(t => t.status === 'done')
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleTaskUpdate = async (updates: Partial<Task>) => {
    if (!selectedTask) return;
    await updateTask(selectedTask.id, updates);
    setSelectedTask(prev => prev ? { ...prev, ...updates } : null);
  };

  const handleCloseModal = () => {
    setSelectedTask(null);
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-100">Board</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-slate-850 rounded-xl border border-slate-800 p-5 animate-pulse">
              <div className="h-5 bg-slate-800 rounded w-1/2 mb-4" />
              <div className="space-y-3">
                <div className="h-20 bg-slate-800 rounded" />
                <div className="h-20 bg-slate-800 rounded" />
              </div>
            </div>
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
          <h1 className="text-2xl font-semibold text-slate-100">Board</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Kanban board for task management
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-400">Filters:</span>
        </div>
        
        <FilterDropdown
          label="Priority"
          value={filters.priority}
          options={Object.keys(priorityConfig)}
          onChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}
          placeholder="All"
        />
        
        <FilterDropdown
          label="Assignee"
          value={filters.assignee}
          options={assigneeOptions}
          onChange={(value) => setFilters(prev => ({ ...prev, assignee: value }))}
          placeholder="Anyone"
        />

        <button
          onClick={() => setFilters(prev => ({ 
            ...prev, 
            sprintReady: prev.sprintReady === true ? null : true 
          }))}
          className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
            filters.sprintReady 
              ? 'bg-emerald-600/20 border-emerald-600/50 text-emerald-400' 
              : 'bg-slate-800/50 hover:bg-slate-800/70 border-slate-700 text-slate-300'
          }`}
        >
          <Zap className="w-4 h-4" />
          Sprint Ready
        </button>

        {(filters.priority || filters.assignee || filters.sprintReady) && (
          <button
            onClick={() => setFilters({ priority: null, assignee: null, sprintReady: null, labels: [] })}
            className="text-sm text-slate-400 hover:text-slate-200 px-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-h-96">
        {(Object.keys(statusConfig) as Array<keyof typeof statusConfig>).map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status]}
            onTaskClick={handleTaskClick}
          />
        ))}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TicketDetailModal
          task={selectedTask}
          onClose={handleCloseModal}
          onUpdate={handleTaskUpdate}
        />
      )}

      {/* Empty State */}
      {filteredTasks.length === 0 && !loading && (
        <div className="text-center py-16">
          <LayoutGrid className="w-16 h-16 text-slate-600 mx-auto mb-4" strokeWidth={1} />
          <h2 className="text-xl font-semibold text-slate-300 mb-2">No tasks found</h2>
          <p className="text-slate-500 mb-6">
            {tasks.length === 0 
              ? "Create your first task to get started"
              : "Try adjusting your filters"
            }
          </p>
          <button className="btn btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Create Task
          </button>
        </div>
      )}
    </div>
  );
}