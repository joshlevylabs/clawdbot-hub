"use client";

import { useState, useEffect } from "react";
import { useHubStore, Task } from "@/lib/store";
import { Plus, GripVertical, Trash2, X, RefreshCw } from "lucide-react";

const columns: { id: Task["status"]; title: string; color: string }[] = [
  { id: "backlog", title: "Backlog", color: "bg-slate-600" },
  { id: "in-progress", title: "In Progress", color: "bg-primary-600" },
  { id: "review", title: "Review", color: "bg-accent-600" },
  { id: "done", title: "Done", color: "bg-status-success" },
];

export default function TasksPage() {
  const { tasks, addTask, deleteTask, moveTask, initialize, loading } = useHubStore();
  const [showModal, setShowModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium" as Task["priority"] });
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleAddTask = () => {
    if (newTask.title.trim()) {
      addTask({
        title: newTask.title,
        description: newTask.description,
        status: "backlog",
        priority: newTask.priority,
      });
      setNewTask({ title: "", description: "", priority: "medium" });
      setShowModal(false);
    }
  };

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (status: Task["status"]) => {
    if (draggedTask) {
      moveTask(draggedTask, status);
      setDraggedTask(null);
    }
  };

  const handleMobileMove = (taskId: string, status: Task["status"]) => {
    moveTask(taskId, status);
    setSelectedTask(null);
  };

  const handleRefresh = () => {
    initialize();
  };

  const priorityStyles = {
    high: "bg-status-error/15 text-status-error border-status-error/30",
    medium: "bg-status-warning/15 text-status-warning border-status-warning/30",
    low: "bg-slate-700/50 text-slate-400 border-slate-600",
  };

  return (
    <div className="h-full flex flex-col max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Tasks</h1>
          <p className="text-slate-500 mt-1 text-sm">
            <span className="hidden sm:inline">Drag and drop to organize your work</span>
            <span className="sm:hidden">Tap a task to move it</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="btn btn-ghost flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} strokeWidth={1.5} />
            Sync
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} />
            Add Task
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0 overflow-auto">
        {columns.map((column) => (
          <div
            key={column.id}
            className="bg-slate-850 rounded-xl border border-slate-800 flex flex-col min-h-[200px] lg:min-h-0"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id)}
          >
            {/* Column Header */}
            <div className="p-4 border-b border-slate-800 sticky top-0 bg-slate-850 z-10">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${column.color}`} />
                <h3 className="font-medium text-slate-300 text-sm">{column.title}</h3>
                <span className="ml-auto text-slate-600 text-sm font-medium">
                  {tasks.filter((t) => t.status === column.id).length}
                </span>
              </div>
            </div>

            {/* Tasks */}
            <div className="flex-1 p-3 space-y-2 overflow-auto">
              {tasks
                .filter((t) => t.status === column.id)
                .map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task.id)}
                    onClick={() => setSelectedTask(selectedTask === task.id ? null : task.id)}
                    className={`bg-slate-800/80 rounded-lg p-3 cursor-grab active:cursor-grabbing border border-slate-700/50 hover:border-slate-600 transition-all ${
                      draggedTask === task.id ? "opacity-50 rotate-1 scale-105" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0 hidden lg:block" strokeWidth={1.5} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-200">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-slate-500 mt-1 truncate">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2.5">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${priorityStyles[task.priority]}`}>
                            {task.priority}
                          </span>
                        </div>
                        
                        {/* Mobile Move Buttons */}
                        {selectedTask === task.id && (
                          <div className="flex flex-wrap gap-1.5 mt-3 lg:hidden">
                            {columns.filter(c => c.id !== task.status).map((col) => (
                              <button
                                key={col.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMobileMove(task.id, col.id);
                                }}
                                className={`px-2.5 py-1 rounded text-xs font-medium ${col.color} text-white`}
                              >
                                {col.title}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTask(task.id);
                        }}
                        className="text-slate-600 hover:text-status-error transition-colors p-1 rounded hover:bg-slate-700"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                ))}
              
              {tasks.filter((t) => t.status === column.id).length === 0 && (
                <div className="text-center py-8 text-slate-600 text-sm">
                  No tasks
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-slate-850 rounded-xl border border-slate-800 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-200">Add Task</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-300 p-1">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5 font-medium">Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-800 rounded-lg border border-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-sm"
                  placeholder="Task title"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5 font-medium">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-800 rounded-lg border border-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none text-sm"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5 font-medium">Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as Task["priority"] })}
                  className="w-full px-3 py-2.5 bg-slate-800 rounded-lg border border-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <button
                onClick={handleAddTask}
                className="w-full py-2.5 btn btn-primary"
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
