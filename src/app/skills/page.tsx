"use client";

import { useState } from "react";
import { useHubStore, Skill } from "@/lib/store";
import { Plus, Trash2, X, Sparkles, Code, ToggleLeft, ToggleRight } from "lucide-react";

export default function SkillsPage() {
  const { skills, addSkill, updateSkill, deleteSkill } = useHubStore();
  const [showModal, setShowModal] = useState(false);
  const [newSkill, setNewSkill] = useState({
    name: "",
    description: "",
    trigger: "",
    enabled: true,
  });

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Skills</h1>
          <p className="text-gray-400 mt-1">Custom capabilities and automations</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent-purple rounded-lg hover:bg-accent-purple/80 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Skill
        </button>
      </div>

      {/* Skills List */}
      <div className="space-y-4">
        {skills.map((skill) => (
          <div
            key={skill.id}
            className={`bg-dark-800 rounded-xl border p-6 transition-all ${
              skill.enabled ? "border-dark-600" : "border-dark-700 opacity-60"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-accent-purple/20 rounded-lg">
                  <Sparkles className="w-6 h-6 text-accent-purple" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{skill.name}</h3>
                  <p className="text-gray-400 mt-1">{skill.description}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <Code className="w-4 h-4 text-gray-500" />
                    <code className="text-sm bg-dark-700 px-2 py-1 rounded text-accent-cyan">
                      {skill.trigger}
                    </code>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleEnabled(skill.id, skill.enabled)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {skill.enabled ? (
                    <ToggleRight className="w-8 h-8 text-accent-green" />
                  ) : (
                    <ToggleLeft className="w-8 h-8" />
                  )}
                </button>
                <button
                  onClick={() => deleteSkill(skill.id)}
                  className="p-2 text-gray-400 hover:text-accent-red hover:bg-dark-700 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-dark-600 text-sm text-gray-400">
              <span>Used {skill.usageCount} times</span>
              {skill.lastUsed && (
                <span>Last used: {new Date(skill.lastUsed).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        ))}

        {skills.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No skills yet. Add your first skill to get started.</p>
          </div>
        )}
      </div>

      {/* Add Skill Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-xl border border-dark-600 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Add Skill</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={newSkill.name}
                  onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-700 rounded-lg border border-dark-600 focus:border-accent-purple focus:outline-none"
                  placeholder="Skill name"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea
                  value={newSkill.description}
                  onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-700 rounded-lg border border-dark-600 focus:border-accent-purple focus:outline-none resize-none"
                  rows={3}
                  placeholder="What does this skill do?"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Trigger</label>
                <input
                  type="text"
                  value={newSkill.trigger}
                  onChange={(e) => setNewSkill({ ...newSkill, trigger: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-700 rounded-lg border border-dark-600 focus:border-accent-purple focus:outline-none font-mono"
                  placeholder="e.g., SOT: <idea>"
                />
              </div>
              <button
                onClick={handleAdd}
                className="w-full py-2 bg-accent-purple rounded-lg hover:bg-accent-purple/80 transition-colors font-medium"
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
