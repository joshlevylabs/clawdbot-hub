"use client";

import { useState } from "react";
import { useHubStore, Task } from "@/lib/store";
import { Plus, GripVertical, Trash2, X } from "lucide-react";

const columns: { id: Task["status"]; title: string; color: string }[] = [
  { id: "backlog", title: "Backlog", color: "bg-gray-500" },
  { id: "in-progress", title: "In Progress", color: "bg-accent-blue" },
  { id: "review", title: "Review", color: "bg-accent-yellow" },
  { id: "done", title: "Done", color: "bg-accent-green" },
];

export default function TasksPage() {
  const { tasks, addTask, deleteTask, moveTask } = useHubStore();
  const [showModal, setShowModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium" as Task["priority"] });
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<Task["status"] | null>(null);

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

  // Mobile: move task via button
  const handleMobileMove = (taskId: string, status: Task["status"]) => {
    moveTask(taskId, status);
    setSelectedColumn(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Tasks</h1>
          <p className="text-gray-400 mt-1 text-sm lg:text-base">
            <span className="hidden sm:inline">Drag and drop to organize your work</span>
            <span className="sm:hidden">Tap a task to move it</span>
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-accent-purple rounded-lg hover:bg-accent-purple/80 transition-colors w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          Add Task
        </button>
      </div>

      {/* Kanban Board - Desktop: Grid, Mobile: Vertical Stack */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0 overflow-auto">
        {columns.map((column) => (
          <div
            key={column.id}
            className="bg-dark-800 rounded-xl border border-dark-600 flex flex-col min-h-[200px] lg:min-h-0"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id)}
          >
            {/* Column Header */}
            <div className="p-3 lg:p-4 border-b border-dark-600 sticky top-0 bg-dark-800 z-10">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${column.color}`} />
                <h3 className="font-semibold text-sm lg:text-base">{column.title}</h3>
                <span className="ml-auto text-gray-500 text-sm">
                  {tasks.filter((t) => t.status === column.id).length}
                </span>
              </div>
            </div>

            {/* Tasks */}
            <div className="flex-1 p-2 lg:p-3 space-y-2 overflow-auto">
              {tasks
                .filter((t) => t.status === column.id)
                .map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task.id)}
                    onClick={() => setSelectedColumn(selectedColumn === task.id ? null : task.id as any)}
                    className={`bg-dark-700 rounded-lg p-3 cursor-grab active:cursor-grabbing border border-transparent hover:border-dark-500 transition-all ${
                      draggedTask === task.id ? "opacity-50 rotate-2" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0 hidden lg:block" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-gray-400 mt-1 truncate">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              task.priority === "high"
                                ? "bg-accent-red/20 text-accent-red"
                                : task.priority === "medium"
                                ? "bg-accent-yellow/20 text-accent-yellow"
                                : "bg-gray-500/20 text-gray-400"
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>
                        
                        {/* Mobile Move Buttons */}
                        {selectedColumn === task.id && (
                          <div className="flex flex-wrap gap-1 mt-3 lg:hidden">
                            {columns.filter(c => c.id !== task.status).map((col) => (
                              <button
                                key={col.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMobileMove(task.id, col.id);
                                }}
                                className={`px-2 py-1 rounded text-xs ${col.color} text-white`}
                              >
                                → {col.title}
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
                        className="text-gray-500 hover:text-accent-red transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl border border-dark-600 p-6 w-full max-w-md max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Add Task</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-3 bg-dark-700 rounded-lg border border-dark-600 focus:border-accent-purple focus:outline-none text-base"
                  placeholder="Task title"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-3 py-3 bg-dark-700 rounded-lg border border-dark-600 focus:border-accent-purple focus:outline-none resize-none text-base"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as Task["priority"] })}
                  className="w-full px-3 py-3 bg-dark-700 rounded-lg border border-dark-600 focus:border-accent-purple focus:outline-none text-base"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <button
                onClick={handleAddTask}
                className="w-full py-3 bg-accent-purple rounded-lg hover:bg-accent-purple/80 transition-colors font-medium text-base"
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
