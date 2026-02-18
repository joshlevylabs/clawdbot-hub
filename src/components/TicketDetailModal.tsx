"use client";

import { useState, useEffect } from "react";
import {
  X,
  Edit2,
  Check,
  ChevronDown,
  Zap,
  Calendar,
  User,
  Tag,
  FileText,
  MessageSquare,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Link,
  Bot,
  Clock,
  AlertTriangle
} from "lucide-react";
import { Task } from "@/lib/store";

interface TicketDetailModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: (updates: Partial<Task>) => void;
}

// Status options with colors
const statusOptions = [
  { value: "backlog", label: "Backlog", color: "slate", bg: "bg-slate-600" },
  { value: "in-progress", label: "In Progress", color: "blue", bg: "bg-blue-600" },
  { value: "review", label: "Review", color: "amber", bg: "bg-amber-600" },
  { value: "done", label: "Done", color: "emerald", bg: "bg-emerald-600" }
] as const;

// Priority options
const priorityOptions = [
  { value: "low", label: "Low", color: "slate", bg: "bg-slate-600" },
  { value: "medium", label: "Medium", color: "amber", bg: "bg-amber-600" },
  { value: "high", label: "High", color: "red", bg: "bg-red-600" }
] as const;

// Assignee options
const assigneeOptions = ["Theo", "Joshua", "COO", "CTO", "CMO", "CRO", "Agent"];

function EditableTitle({ 
  value, 
  onSave 
}: { 
  value: string; 
  onSave: (newValue: string) => void; 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    if (editValue.trim() && editValue !== value) {
      onSave(editValue.trim());
    }
    setIsEditing(false);
    setEditValue(value);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 mb-4">
        <input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="flex-1 text-2xl font-semibold bg-slate-800 text-white border border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
          onBlur={handleSave}
          autoFocus
        />
        <button
          onClick={handleSave}
          className="p-2 text-emerald-400 hover:text-emerald-300"
        >
          <Check className="w-5 h-5" />
        </button>
        <button
          onClick={handleCancel}
          className="p-2 text-slate-400 hover:text-slate-300"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2 mb-4">
      <h1 className="text-2xl font-semibold text-white flex-1">{value}</h1>
      <button
        onClick={() => setIsEditing(true)}
        className="p-2 text-slate-400 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Edit2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function EditableTextArea({
  value,
  onSave,
  placeholder,
  label
}: {
  value?: string;
  onSave: (newValue: string) => void;
  placeholder: string;
  label: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");

  const handleSave = () => {
    if (editValue !== value) {
      onSave(editValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value || "");
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        <div className="space-y-2">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={placeholder}
            className="w-full h-32 bg-slate-800 text-slate-200 border border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Escape") handleCancel();
            }}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 bg-slate-600 text-slate-200 rounded text-sm hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <div 
        onClick={() => setIsEditing(true)}
        className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg cursor-pointer hover:bg-slate-800/70 transition-colors min-h-24"
      >
        {value ? (
          <p className="text-slate-200 whitespace-pre-wrap">{value}</p>
        ) : (
          <p className="text-slate-500 italic">{placeholder}</p>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ 
  status, 
  onChange 
}: { 
  status: Task["status"]; 
  onChange: (status: Task["status"]) => void; 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const currentStatus = statusOptions.find(s => s.value === status)!;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white ${currentStatus.bg} hover:opacity-90 transition-opacity`}
      >
        {currentStatus.label}
        <ChevronDown className="w-4 h-4" />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20">
            <div className="p-1">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-slate-700/50 transition-colors ${
                    option.value === status ? 'bg-slate-700/50' : ''
                  }`}
                >
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${option.bg}`} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ChecklistSection({ 
  checklist, 
  onUpdate 
}: { 
  checklist?: Array<{ id: string; text: string; completed: boolean }>; 
  onUpdate: (checklist: Array<{ id: string; text: string; completed: boolean }>) => void; 
}) {
  const [newItem, setNewItem] = useState("");

  const items = checklist || [];

  const toggleItem = (id: string) => {
    const updated = items.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    onUpdate(updated);
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    const updated = [...items, {
      id: Date.now().toString(),
      text: newItem.trim(),
      completed: false
    }];
    onUpdate(updated);
    setNewItem("");
  };

  const removeItem = (id: string) => {
    const updated = items.filter(item => item.id !== id);
    onUpdate(updated);
  };

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-slate-200 flex items-center gap-2">
        <CheckSquare className="w-4 h-4" />
        Checklist
      </h3>
      
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 p-2 bg-slate-800/30 rounded-lg group">
            <button
              onClick={() => toggleItem(item.id)}
              className="flex-shrink-0"
            >
              {item.completed ? (
                <CheckSquare className="w-4 h-4 text-emerald-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-400 hover:text-slate-300" />
              )}
            </button>
            <span className={`flex-1 text-sm ${item.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
              {item.text}
            </span>
            <button
              onClick={() => removeItem(item.id)}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 transition-all"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        
        <div className="flex gap-2">
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add checklist item..."
            className="flex-1 text-sm bg-slate-800 text-slate-200 border border-slate-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            onKeyDown={(e) => {
              if (e.key === "Enter") addItem();
            }}
          />
          <button
            onClick={addItem}
            disabled={!newItem.trim()}
            className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ActivityFeed({ 
  activity 
}: { 
  activity?: Array<{ timestamp: string; action: string; user: string; details?: any }>; 
}) {
  const items = activity || [];

  if (items.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="font-medium text-slate-200 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Activity
        </h3>
        <p className="text-slate-500 text-sm italic">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-slate-200 flex items-center gap-2">
        <MessageSquare className="w-4 h-4" />
        Activity
      </h3>
      
      <div className="space-y-2 max-h-48 overflow-auto">
        {items.map((item, i) => (
          <div key={i} className="flex gap-3 p-2 bg-slate-800/30 rounded-lg">
            <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-3 h-3 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-200">{item.action}</p>
              <p className="text-xs text-slate-500">{item.user} • {new Date(item.timestamp).toLocaleString()}</p>
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

  const handleUpdate = (updates: Partial<Task>) => {
    const newTask = { ...localTask, ...updates };
    setLocalTask(newTask);
    onUpdate(updates);
  };

  // Generate ticket ID if not present
  const ticketId = localTask.ticketId || `TH-${localTask.id.slice(-4).toUpperCase()}`;

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this task? This action cannot be undone.")) {
      // TODO: Implement delete functionality
      onClose();
    }
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
                  <span className="text-sm font-mono text-slate-500">{ticketId}</span>
                  <StatusBadge 
                    status={localTask.status} 
                    onChange={(status) => handleUpdate({ status })} 
                  />
                  {localTask.sprintReady && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-emerald-600/20 text-emerald-400 rounded-lg text-xs font-medium">
                      <Zap className="w-3 h-3" />
                      Sprint Ready
                    </div>
                  )}
                </div>
                <EditableTitle
                  value={localTask.title}
                  onSave={(title) => handleUpdate({ title })}
                />
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            <EditableTextArea
              value={localTask.description}
              onSave={(description) => handleUpdate({ description })}
              placeholder="Add a description..."
              label="Description"
            />

            {/* Notes / Agent Analysis */}
            <EditableTextArea
              value={localTask.notes}
              onSave={(notes) => handleUpdate({ notes })}
              placeholder="Agent analysis and notes..."
              label="Notes / Agent Analysis"
            />

            {/* Checklist */}
            <ChecklistSection
              checklist={localTask.checklist}
              onUpdate={(checklist) => handleUpdate({ checklist })}
            />

            {/* Activity Feed */}
            <ActivityFeed activity={localTask.activity} />
          </div>
        </div>

        {/* Sidebar (35%) */}
        <div className="w-96 bg-slate-850 p-6 overflow-auto">
          <div className="space-y-6">
            {/* Status */}
            <div>
              <label className="text-sm font-medium text-slate-400 mb-2 block">Status</label>
              <StatusBadge 
                status={localTask.status} 
                onChange={(status) => handleUpdate({ status })} 
              />
            </div>

            {/* Priority */}
            <div>
              <label className="text-sm font-medium text-slate-400 mb-2 block">Priority</label>
              <div className="relative">
                <select
                  value={localTask.priority}
                  onChange={(e) => handleUpdate({ priority: e.target.value as Task["priority"] })}
                  className="w-full appearance-none bg-slate-800 text-slate-200 border border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Assignee */}
            <div>
              <label className="text-sm font-medium text-slate-400 mb-2 block">Assignee</label>
              <div className="relative">
                <select
                  value={localTask.assignee || ""}
                  onChange={(e) => handleUpdate({ assignee: e.target.value || undefined })}
                  className="w-full appearance-none bg-slate-800 text-slate-200 border border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Unassigned</option>
                  {assigneeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Labels */}
            <div>
              <label className="text-sm font-medium text-slate-400 mb-2 block">Labels</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {(localTask.labels || []).map((label, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 text-slate-200 rounded text-xs"
                  >
                    {label}
                    <button
                      onClick={() => {
                        const newLabels = localTask.labels?.filter((_, idx) => idx !== i) || [];
                        handleUpdate({ labels: newLabels });
                      }}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Add label..."
                className="w-full text-sm bg-slate-800 text-slate-200 border border-slate-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim()) {
                    const newLabels = [...(localTask.labels || []), e.currentTarget.value.trim()];
                    handleUpdate({ labels: newLabels });
                    e.currentTarget.value = "";
                  }
                }}
              />
            </div>

            {/* Components */}
            <div>
              <label className="text-sm font-medium text-slate-400 mb-2 block">Components</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {(localTask.components || []).map((component, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-xs"
                  >
                    {component}
                    <button
                      onClick={() => {
                        const newComponents = localTask.components?.filter((_, idx) => idx !== i) || [];
                        handleUpdate({ components: newComponents });
                      }}
                      className="text-blue-400/70 hover:text-blue-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Add component..."
                className="w-full text-sm bg-slate-800 text-slate-200 border border-slate-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim()) {
                    const newComponents = [...(localTask.components || []), e.currentTarget.value.trim()];
                    handleUpdate({ components: newComponents });
                    e.currentTarget.value = "";
                  }
                }}
              />
            </div>

            {/* Source */}
            <div>
              <label className="text-sm font-medium text-slate-400 mb-2 block">Source</label>
              <input
                type="text"
                value={localTask.source || ""}
                onChange={(e) => handleUpdate({ source: e.target.value || undefined })}
                placeholder="Which standup/trigger created this?"
                className="w-full text-sm bg-slate-800 text-slate-200 border border-slate-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Sprint Ready Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-slate-400">Sprint Ready</label>
                <p className="text-xs text-slate-500">Mark for "Sprint!" action</p>
              </div>
              <button
                onClick={() => handleUpdate({ sprintReady: !localTask.sprintReady })}
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

            {/* Timestamps */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar className="w-4 h-4" />
                <span>Created: {new Date(localTask.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Clock className="w-4 h-4" />
                <span>Updated: {new Date(localTask.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Delete Button */}
            <div className="pt-4 border-t border-slate-700">
              <button
                onClick={handleDelete}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-sm transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Task
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}