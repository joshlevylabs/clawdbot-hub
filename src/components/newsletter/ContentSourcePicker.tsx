"use client";

import { useState } from "react";
import { X, Plus, Database, Heart, Mic, BookOpen, Newspaper } from "lucide-react";

interface SourceDef {
  key: string;
  label: string;
  description: string;
  category: string;
  availableParams: Array<{
    key: string;
    label: string;
    type: string;
    options?: Array<{ value: string; label: string }>;
    default?: string | number;
  }>;
}

interface ContentSourcePickerProps {
  sources: SourceDef[];
  existingKeys: string[];
  onAdd: (sourceKey: string, label: string, params: Record<string, unknown>) => void;
  onClose: () => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  trading: <Database className="w-4 h-4" />,
  marriage: <Heart className="w-4 h-4" />,
  podcast: <Mic className="w-4 h-4" />,
  prayer: <BookOpen className="w-4 h-4" />,
  news: <Newspaper className="w-4 h-4" />,
};

const categoryLabels: Record<string, string> = {
  trading: "Trading",
  marriage: "Marriage",
  podcast: "Podcast",
  prayer: "Prayer & Study",
  news: "News",
};

export function ContentSourcePicker({
  sources,
  existingKeys,
  onAdd,
  onClose,
}: ContentSourcePickerProps) {
  const [selectedSource, setSelectedSource] = useState<SourceDef | null>(null);
  const [params, setParams] = useState<Record<string, unknown>>({});

  // Group sources by category
  const grouped = sources.reduce((acc, source) => {
    const cat = source.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(source);
    return acc;
  }, {} as Record<string, SourceDef[]>);

  const handleSelect = (source: SourceDef) => {
    setSelectedSource(source);
    // Set defaults
    const defaults: Record<string, unknown> = {};
    source.availableParams.forEach((p) => {
      if (p.default !== undefined) defaults[p.key] = p.default;
    });
    setParams(defaults);
  };

  const handleAdd = () => {
    if (!selectedSource) return;
    onAdd(selectedSource.key, selectedSource.label, params);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-850 border border-slate-700 rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-100">Add Content Source</h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {!selectedSource ? (
            // Source List
            <div className="space-y-4">
              {Object.entries(grouped).map(([category, categorySources]) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-slate-500">{categoryIcons[category]}</span>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {categoryLabels[category] || category}
                    </h3>
                  </div>
                  <div className="space-y-1">
                    {categorySources.map((source) => {
                      const addedCount = existingKeys.filter(k => k === source.key).length;
                      return (
                        <button
                          key={source.key}
                          onClick={() => handleSelect(source)}
                          className="w-full text-left p-3 rounded-lg border transition-colors bg-slate-800/60 border-slate-700/50 hover:border-primary-500/50 hover:bg-slate-800 cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-200">
                              {source.label}
                            </span>
                            <div className="flex items-center gap-2">
                              {addedCount > 0 && (
                                <span className="text-[10px] text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded">
                                  ×{addedCount}
                                </span>
                              )}
                              <Plus className="w-4 h-4 text-slate-500" />
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{source.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Param Config
            <div>
              <button
                onClick={() => setSelectedSource(null)}
                className="text-xs text-slate-500 hover:text-slate-300 mb-4 transition-colors"
              >
                ← Back to sources
              </button>
              <h3 className="text-sm font-semibold text-slate-200 mb-1">
                {selectedSource.label}
              </h3>
              <p className="text-xs text-slate-500 mb-4">{selectedSource.description}</p>

              {selectedSource.availableParams.length > 0 ? (
                <div className="space-y-3">
                  {selectedSource.availableParams.map((param) => (
                    <div key={param.key}>
                      <label className="block text-xs text-slate-400 mb-1 font-medium">
                        {param.label}
                      </label>
                      {param.type === "select" && param.options ? (
                        <select
                          value={String(params[param.key] || "")}
                          onChange={(e) =>
                            setParams({ ...params, [param.key]: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:border-primary-500 focus:outline-none"
                        >
                          {param.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="number"
                          value={String(params[param.key] || "")}
                          onChange={(e) =>
                            setParams({
                              ...params,
                              [param.key]: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 focus:border-primary-500 focus:outline-none"
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  No parameters to configure.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedSource && (
          <div className="p-4 border-t border-slate-700">
            <button
              onClick={handleAdd}
              className="w-full btn btn-primary flex items-center justify-center gap-2 text-sm py-2.5"
            >
              <Plus className="w-4 h-4" />
              Add {selectedSource.label}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
