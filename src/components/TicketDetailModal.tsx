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
  Circle,
  Plus,
  Trash2,
  ExternalLink,
  BookOpen,
  Edit
} from "lucide-react";

// Task type from task-registry.json structure
interface Task {
  key: string;
  text: string;
  tag: "AGENT" | "JOSHUA";
  priority: "high" | "medium" | "low";
  assignee: string;
  status: "pending" | "in-progress" | "done" | "done_but_unverified";
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
      details: task.status === "done" ? "Marked as complete" : "Status updated"
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

// Description Section Component
function DescriptionSection({ task, onUpdate }: { task: Task; onUpdate: (updates: Partial<Task>) => void }) {
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Load initial description from API
  useEffect(() => {
    fetch("/api/task-notes")
      .then(res => res.json())
      .then(notes => {
        if (notes[task.key]?.description) {
          setDescription(notes[task.key].description);
        }
      })
      .catch(console.error);
  }, [task.key]);

  const handleSave = async (value: string) => {
    setIsSaving(true);
    try {
      await fetch("/api/task-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskKey: task.key,
          description: value
        })
      });
      setLastSaved("Saved ✓");
      setTimeout(() => setLastSaved(null), 2000);
    } catch (error) {
      console.error("Failed to save description:", error);
      setLastSaved("Error saving");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlur = () => {
    if (description.trim() !== "") {
      handleSave(description);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Description</h2>
      <div className="space-y-2">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleBlur}
          placeholder="What this ticket is trying to accomplish. Initially empty — Joshua or agents can fill this in."
          className="w-full h-24 bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-slate-200 placeholder-slate-500 resize-none"
        />
        {(isSaving || lastSaved) && (
          <p className="text-xs text-slate-500">
            {isSaving ? "Saving..." : lastSaved}
          </p>
        )}
      </div>
    </div>
  );
}

// Acceptance Criteria Section Component
function AcceptanceCriteriaSection({ task, onUpdate }: { task: Task; onUpdate: (updates: Partial<Task>) => void }) {
  const [criteria, setCriteria] = useState<{ text: string; completed: boolean }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Load initial criteria from API
  useEffect(() => {
    fetch("/api/task-notes")
      .then(res => res.json())
      .then(notes => {
        if (notes[task.key]?.acceptanceCriteria) {
          setCriteria(notes[task.key].acceptanceCriteria);
        }
      })
      .catch(console.error);
  }, [task.key]);

  const saveCriteria = async (newCriteria: { text: string; completed: boolean }[]) => {
    setIsSaving(true);
    try {
      await fetch("/api/task-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskKey: task.key,
          acceptanceCriteria: newCriteria
        })
      });
    } catch (error) {
      console.error("Failed to save acceptance criteria:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const addCriterion = () => {
    const newCriteria = [...criteria, { text: "", completed: false }];
    setCriteria(newCriteria);
  };

  const removeCriterion = (index: number) => {
    const newCriteria = criteria.filter((_, i) => i !== index);
    setCriteria(newCriteria);
    saveCriteria(newCriteria);
  };

  const updateCriterion = (index: number, text: string) => {
    const newCriteria = criteria.map((c, i) => i === index ? { ...c, text } : c);
    setCriteria(newCriteria);
  };

  const toggleCriterion = (index: number) => {
    const newCriteria = criteria.map((c, i) => i === index ? { ...c, completed: !c.completed } : c);
    setCriteria(newCriteria);
    saveCriteria(newCriteria);
  };

  const handleCriterionBlur = (index: number, text: string) => {
    if (text.trim()) {
      saveCriteria(criteria);
    } else {
      removeCriterion(index);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Acceptance Criteria</h2>
      <div className="space-y-2">
        {criteria.map((criterion, index) => (
          <div key={index} className="flex items-start gap-3 p-2 bg-slate-800/30 rounded-lg">
            <button
              onClick={() => toggleCriterion(index)}
              className="flex-shrink-0 mt-1 hover:scale-110 transition-transform"
            >
              {criterion.completed ? (
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              ) : (
                <Circle className="w-4 h-4 text-slate-500 hover:text-slate-400" />
              )}
            </button>
            <input
              type="text"
              value={criterion.text}
              onChange={(e) => updateCriterion(index, e.target.value)}
              onBlur={(e) => handleCriterionBlur(index, e.target.value)}
              placeholder="Enter acceptance criterion..."
              className="flex-1 bg-transparent text-slate-200 placeholder-slate-500 border-none outline-none"
            />
            <button
              onClick={() => removeCriterion(index)}
              className="flex-shrink-0 p-1 hover:bg-slate-700 rounded text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
        <button
          onClick={addCriterion}
          className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-slate-300 hover:bg-slate-800/50 rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add criteria
        </button>
        {isSaving && (
          <p className="text-xs text-slate-500">Saving...</p>
        )}
      </div>
    </div>
  );
}

// Source Standup Link Section Component
function SourceStandupLinkSection({ task }: { task: Task }) {
  const handleViewSourceStandup = () => {
    const url = `/standups?standup=${encodeURIComponent(task.sourceStandup)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Source Standup</h2>
      <button
        onClick={handleViewSourceStandup}
        className="w-full flex items-center gap-3 p-4 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-800/70 transition-colors"
      >
        <MessageSquare className="w-5 h-5 text-primary-400 flex-shrink-0" />
        <div className="flex-1 text-left">
          <p className="text-slate-200 font-medium">{task.sourceStandup}</p>
          <p className="text-xs text-slate-500">
            {task.sourceStandupType} • {new Date(task.sourceDate + "T00:00:00Z").toLocaleDateString()}
          </p>
        </div>
        <ExternalLink className="w-4 h-4 text-slate-400" />
      </button>
    </div>
  );
}

// Notes for Theo Section Component
function NotesForTheoSection({ task, onUpdate }: { task: Task; onUpdate: (updates: Partial<Task>) => void }) {
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Load initial notes from API
  useEffect(() => {
    fetch("/api/task-notes")
      .then(res => res.json())
      .then(taskNotes => {
        if (taskNotes[task.key]?.sprintNotes) {
          setNotes(taskNotes[task.key].sprintNotes);
        }
      })
      .catch(console.error);
  }, [task.key]);

  const handleSave = async (value: string) => {
    setIsSaving(true);
    try {
      await fetch("/api/task-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskKey: task.key,
          sprintNotes: value
        })
      });
      setLastSaved("Saved ✓");
      setTimeout(() => setLastSaved(null), 2000);
    } catch (error) {
      console.error("Failed to save sprint notes:", error);
      setLastSaved("Error saving");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlur = () => {
    handleSave(notes);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Notes for Theo 📝</h2>
      </div>
      <div className="space-y-2">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={handleBlur}
          placeholder="Leave context notes here. When you mark this as Sprint Ready, Theo will read these notes when working on the sprint."
          className="w-full h-32 bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-slate-200 placeholder-slate-500 resize-none"
        />
        {(isSaving || lastSaved) && (
          <p className="text-xs text-slate-500">
            {isSaving ? "Saving..." : lastSaved}
          </p>
        )}
      </div>
    </div>
  );
}

export default function TicketDetailModal({ task, onClose, onUpdate }: TicketDetailModalProps) {
  const [localTask, setLocalTask] = useState(task);
  const [verticals, setVerticals] = useState<string[]>([]);
  const [initiatives, setInitiatives] = useState<string[]>([]);

  useEffect(() => {
    setLocalTask(task);
  }, [task]);

  useEffect(() => {
    fetch("/data/standups/index.json")
      .then(res => res.json())
      .then(indexData => {
        const match = (indexData.standups || []).find(
          (s: any) => s.instanceKey === task.sourceStandup
        );
        if (match) {
          setVerticals(match.verticals || []);
          setInitiatives(match.initiatives || []);
        }
      })
      .catch(console.error);
  }, [task.sourceStandup]);

  const handleSprintReadyToggle = async () => {
    const newSprintReady = !localTask.sprintReady;
    setLocalTask(prev => ({ ...prev, sprintReady: newSprintReady }));
    onUpdate({ sprintReady: newSprintReady });
    
    // Persist to task-registry.json via API
    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskKey: localTask.key, sprintReady: newSprintReady }),
      });
    } catch (error) {
      console.error("Failed to persist sprint-ready status:", error);
    }
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

            {/* New Left Panel Sections */}
            <DescriptionSection task={localTask} onUpdate={onUpdate} />
            <AcceptanceCriteriaSection task={localTask} onUpdate={onUpdate} />
            <SourceStandupLinkSection task={localTask} />
            <NotesForTheoSection task={localTask} onUpdate={onUpdate} />

            {/* Sprint Ready Toggle */}
            <div className="space-y-4">
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
                <button 
                  onClick={() => {
                    const url = `/standups?standup=${encodeURIComponent(localTask.sourceStandup)}`;
                    window.open(url, '_blank');
                  }}
                  className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  View Source Standup
                </button>
              </div>
            </div>

            {/* Verticals & Initiatives */}
            {(verticals.length > 0 || initiatives.length > 0) && (
              <div>
                <h3 className="font-medium text-slate-200 mb-3">Classification</h3>
                <div className="space-y-2">
                  {verticals.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Verticals</p>
                      <div className="flex flex-wrap gap-1">
                        {verticals.map(v => (
                          <span key={v} className="px-2 py-0.5 rounded text-[10px] font-medium bg-primary-500/15 text-primary-400 border border-primary-500/30">
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {initiatives.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Initiatives</p>
                      <div className="flex flex-wrap gap-1">
                        {initiatives.map(i => (
                          <span key={i} className="px-2 py-0.5 rounded text-[10px] font-medium bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                            {i}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

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