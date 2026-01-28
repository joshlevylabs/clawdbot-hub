"use client";

import { useState, useEffect } from "react";
import { useHubStore, Skill } from "@/lib/store";
import { Plus, Trash2, X, Zap, Code, ToggleLeft, ToggleRight } from "lucide-react";

export default function SkillsPage() {
  const { skills, addSkill, updateSkill, deleteSkill, initialize } = useHubStore();
  const [showModal, setShowModal] = useState(false);
  const [newSkill, setNewSkill] = useState({
    name: "",
    description: "",
    trigger: "",
    enabled: true,
  });

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleAdd = () => {
    if (newSkill.name && newSkill.trigger) {
      addSkill(newSkill);
      setNewSkill({ name: "", description: "", trigger: "", enabled: true });
      setShowModal(false);
    }
  };

  const toggleEnabled = (id: string, enabled: boolean) => {
    updateSkill(id, { enabled: !enabled });
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100 flex items-center gap-3">
            <Zap className="w-6 h-6 text-accent-500" strokeWidth={1.5} />
            Skills
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Custom capabilities and automations</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          Add Skill
        </button>
      </div>

      {/* Skills List */}
      <div className="space-y-4">
        {skills.map((skill) => (
          <div
            key={skill.id}
            className={`bg-slate-850 rounded-xl border p-5 transition-all ${
              skill.enabled ? "border-slate-800" : "border-slate-800/50 opacity-60"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  skill.enabled ? "bg-accent-600/20" : "bg-slate-800"
                }`}>
                  <Zap className={`w-5 h-5 ${
                    skill.enabled ? "text-accent-400" : "text-slate-600"
                  }`} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-200">{skill.name}</h3>
                  <p className="text-slate-500 mt-1 text-sm">{skill.description}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <Code className="w-4 h-4 text-slate-600" strokeWidth={1.5} />
                    <code className="text-sm bg-slate-800 px-2.5 py-1 rounded text-accent-400 font-mono">
                      {skill.trigger}
                    </code>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleEnabled(skill.id, skill.enabled)}
                  className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                >
                  {skill.enabled ? (
                    <ToggleRight className="w-7 h-7 text-accent-500" strokeWidth={1.5} />
                  ) : (
                    <ToggleLeft className="w-7 h-7" strokeWidth={1.5} />
                  )}
                </button>
                <button
                  onClick={() => deleteSkill(skill.id)}
                  className="p-2 text-slate-500 hover:text-status-error hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-800 text-sm text-slate-500">
              <span>Used {skill.usageCount} times</span>
              {skill.lastUsed && (
                <span>Last used: {new Date(skill.lastUsed).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        ))}

        {skills.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <Zap className="w-12 h-12 mx-auto mb-4 text-slate-700" strokeWidth={1.5} />
            <p>No skills yet. Add your first skill to get started.</p>
          </div>
        )}
      </div>

      {/* Add Skill Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-850 rounded-xl border border-slate-800 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-200">Add Skill</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-300 p-1">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5 font-medium">Name</label>
                <input
                  type="text"
                  value={newSkill.name}
                  onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-800 rounded-lg border border-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-sm"
                  placeholder="Skill name"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5 font-medium">Description</label>
                <textarea
                  value={newSkill.description}
                  onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-800 rounded-lg border border-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 resize-none text-sm"
                  rows={3}
                  placeholder="What does this skill do?"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5 font-medium">Trigger</label>
                <input
                  type="text"
                  value={newSkill.trigger}
                  onChange={(e) => setNewSkill({ ...newSkill, trigger: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-800 rounded-lg border border-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 font-mono text-sm"
                  placeholder="e.g., SOT: <idea>"
                />
              </div>
              <button
                onClick={handleAdd}
                className="w-full py-2.5 btn btn-primary"
              >
                Add Skill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
