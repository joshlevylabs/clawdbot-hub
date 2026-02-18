"use client";

import { useState, useEffect } from "react";
import {
  X,
  Calendar,
  User,
  Tag,
  MessageSquare,
  Clock,
  Zap,
  Link,
  Bot,
  CheckCircle,
  AlertTriangle,
  Circle
} from "lucide-react";

// Task type from task-registry.json structure
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

interface TicketDetailModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: (updates: Partial<Task>) => void;
}

// Status options with colors and icons
const statusOptions = [
  { 
    value: "pending", 
    label: "Pending", 
    color: "amber", 
    bg: "bg-amber-600", 
    icon: Circle,
    description: "Backlog - not started"
  },
  { 
    value: "in-progress", 
    label: "In Progress", 
    color: "blue", 
    bg: "bg-blue-600",
    icon: Clock,
    description: "Currently being worked on"
  },
  { 
    value: "done_but_unverified", 
    label: "Review", 
    color: "yellow", 
    bg: "bg-yellow-600",
    icon: AlertTriangle,
    description: "Done but needs verification"
  },
  { 
    value: "done", 
    label: "Done", 
    color: "emerald", 
    bg: "bg-emerald-600",
    icon: CheckCircle,
    description: "Completed and verified"
  },
  { 
    value: "resolved", 
    label: "Resolved", 
    color: "emerald", 
    bg: "bg-emerald-600",
    icon: CheckCircle,
    description: "Fully resolved"
  }
] as const;

// Priority options
const priorityOptions = [
  { value: "low", label: "Low", color: "slate", bg: "bg-slate-600", icon: "↓" },
  { value: "medium", label: "Medium", color: "amber", bg: "bg-amber-600", icon: "→" },
  { value: "high", label: "High", color: "red", bg: "bg-red-600", icon: "↑" }
] as const;

function StatusBadge({ status }: { status: Task["status"] }) {
  const currentStatus = statusOptions.find(s => s.value === status)!;
  const Icon = currentStatus.icon;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white ${currentStatus.bg}`}>
      <Icon className="w-4 h-4" />
      {currentStatus.label}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: Task["priority"] }) {
  const currentPriority = priorityOptions.find(p => p.value === priority)!;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white ${currentPriority.bg}`}>
      <span>{currentPriority.icon}</span>
      {currentPriority.label}
    </div>
  );
}

function ActivityTimeline({ task }: { task: Task }) {
  const activities = [
    {
      timestamp: task.createdAt,
      action: "Task created",
      user: task.tag === "AGENT" ? "Agent" : "Joshua",
      details: `Created from ${task.sourceStandupType} standup`
    },
    {
      timestamp: task.updatedAt,
      action: "Last updated", 
      user: task.tag === "AGENT" ? "Agent" : "Joshua",
      details: task.status === "done" || task.status === "resolved" ? "Marked as complete" : "Status updated"
    }
  ];

  if (task.completedAt) {
    activities.push({
      timestamp: task.completedAt,
      action: "Task completed",
      user: task.tag === "AGENT" ? "Agent" : "Joshua", 
      details: "Marked as done"
    });
  }

  // Sort by timestamp descending
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-slate-200 flex items-center gap-2">
        <MessageSquare className="w-4 h-4" />
        Activity Timeline
      </h3>
      
      <div className="space-y-3 max-h-48 overflow-auto">
        {activities.map((activity, i) => (
          <div key={i} className="flex gap-3 p-3 bg-slate-800/30 rounded-lg">
            <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
              {activity.user === "Agent" ? (
                <Bot className="w-3 h-3 text-cyan-400" />
              ) : (
                <User className="w-3 h-3 text-purple-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-200 font-medium">{activity.action}</p>
              <p className="text-xs text-slate-400">{activity.details}</p>
              <p className="text-xs text-slate-500 mt-1">
                {activity.user} • {new Date(activity.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TicketDetailModal({ task, onClose, onUpdate }: TicketDetailModalProps) {
  const [localTask, setLocalTask] = useState(task);

  useEffect(() => {
    setLocalTask(task);
  }, [task]);

  const handleSprintReadyToggle = () => {
    const newSprintReady = !localTask.sprintReady;
    setLocalTask(prev => ({ ...prev, sprintReady: newSprintReady }));
    onUpdate({ sprintReady: newSprintReady });
    
    // TODO: Persist to task-registry.json via API route or localStorage
    // For now, just update in memory
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
      <div className="flex h-full">
        {/* Main Content Panel (65%) */}
        <div className="flex-1 max-w-4xl bg-slate-900 border-r border-slate-700 overflow-auto">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-lg font-mono text-primary-400 font-bold">{localTask.key}</span>
                  <StatusBadge status={localTask.status} />
                  {localTask.sprintReady && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-emerald-600/20 text-emerald-400 rounded-lg text-xs font-medium">
                      <Zap className="w-3 h-3" />
                      Sprint Ready
                    </div>
                  )}
                </div>
                <h1 className="text-2xl font-semibold text-white mb-4">{localTask.text}</h1>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Task Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-400 mb-2 block">Status</label>
                  <StatusBadge status={localTask.status} />
                  <p className="text-xs text-slate-500 mt-1">
                    Status changes come from standups - not editable from UI
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-400 mb-2 block">Priority</label>
                  <PriorityBadge priority={localTask.priority} />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-400 mb-2 block">Type</label>
                  {localTask.tag === "AGENT" ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 rounded-lg inline-flex text-sm font-medium">
                      <Bot className="w-4 h-4" />
                      🤖 AGENT
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/15 text-purple-400 border border-purple-500/30 rounded-lg inline-flex text-sm font-medium">
                      <User className="w-4 h-4" />
                      👤 JOSHUA
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-400 mb-2 block">Assignee</label>
                  <div className="flex items-center gap-3 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      localTask.assignee === "Agent" ? "bg-cyan-500/20 text-cyan-400" :
                      localTask.assignee === "Joshua" ? "bg-purple-500/20 text-purple-400" :
                      "bg-slate-500/20 text-slate-400"
                    }`}>
                      {(localTask.assignee || "?")[0]}
                    </div>
                    <span className="text-slate-200 font-medium">{localTask.assignee || "Unassigned"}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-400 mb-2 block">Source Standup</label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg">
                      <MessageSquare className="w-4 h-4 text-primary-400" />
                      <div>
                        <span className="text-slate-200 font-medium">{localTask.sourceStandup}</span>
                        <p className="text-xs text-slate-500">Type: {localTask.sourceStandupType}</p>
                        <p className="text-xs text-slate-500">Date: {formatDate(localTask.sourceDate + "T00:00:00Z")}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-400 mb-2 block">Sprint Ready</label>
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <div>
                      <p className="text-slate-200 text-sm">Mark for "Sprint!" command</p>
                      <p className="text-xs text-slate-500">Joshua uses this to batch sprint tasks</p>
                    </div>
                    <button
                      onClick={handleSprintReadyToggle}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        localTask.sprintReady
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      <Zap className="w-4 h-4" />
                      {localTask.sprintReady ? 'Ready' : 'Not Ready'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Timeline */}
            <ActivityTimeline task={localTask} />
          </div>
        </div>

        {/* Sidebar (35%) */}
        <div className="w-96 bg-slate-850 p-6 overflow-auto">
          <div className="space-y-6">
            {/* Quick Status */}
            <div>
              <h3 className="font-medium text-slate-200 mb-3">Quick Info</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Status</span>
                  <StatusBadge status={localTask.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Priority</span>
                  <PriorityBadge priority={localTask.priority} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Assignee</span>
                  <span className="text-slate-200">{localTask.assignee}</span>
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div>
              <h3 className="font-medium text-slate-200 mb-3">Timeline</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-slate-400">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <div>
                    <p className="text-slate-300">Created</p>
                    <p className="text-xs">{formatDate(localTask.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <div>
                    <p className="text-slate-300">Last Updated</p>
                    <p className="text-xs">{formatDate(localTask.updatedAt)}</p>
                  </div>
                </div>
                {localTask.completedAt && (
                  <div className="flex items-center gap-3 text-slate-400">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <div>
                      <p className="text-slate-300">Completed</p>
                      <p className="text-xs">{formatDate(localTask.completedAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Source Information */}
            <div>
              <h3 className="font-medium text-slate-200 mb-3">Source</h3>
              <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary-400" />
                  <span className="text-slate-200 font-medium">{localTask.sourceStandup}</span>
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Type:</span>
                    <span className="text-slate-300">{localTask.sourceStandupType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date:</span>
                    <span className="text-slate-300">{new Date(localTask.sourceDate + "T00:00:00Z").toLocaleDateString()}</span>
                  </div>
                </div>
                {/* Link to source standup - placeholder for future implementation */}
                <button className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors">
                  <Link className="w-3 h-3" />
                  View Source Standup
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <h3 className="font-medium text-slate-200 mb-3">Notes</h3>
              <div className="p-3 bg-slate-800/30 border border-slate-700 rounded-lg text-xs text-slate-400 italic">
                Task data is driven by standups. Use standups to update status, priority, and other task properties.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}