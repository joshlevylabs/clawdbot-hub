"use client";

import { ChevronUp, ChevronDown, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { ContentConfig } from "@/lib/newsletter-types";

interface ContentBlockCardProps {
  block: ContentConfig;
  isFirst: boolean;
  isLast: boolean;
  onToggle: (id: string, enabled: boolean) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ContentBlockCard({
  block,
  isFirst,
  isLast,
  onToggle,
  onMoveUp,
  onMoveDown,
  onDelete,
}: ContentBlockCardProps) {
  const paramEntries = Object.entries(block.params || {});

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
        block.enabled
          ? "bg-slate-800/80 border-slate-700"
          : "bg-slate-900/50 border-slate-800 opacity-60"
      }`}
    >
      {/* Reorder Buttons */}
      <div className="flex flex-col gap-0.5">
        <button
          onClick={() => onMoveUp(block.id)}
          disabled={isFirst}
          className="p-0.5 text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          onClick={() => onMoveDown(block.id)}
          disabled={isLast}
          className="p-0.5 text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-slate-200 truncate">
            {block.label}
          </h3>
          <span className="text-[10px] font-mono text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">
            {block.source_key}
          </span>
        </div>
        {paramEntries.length > 0 && (
          <div className="flex gap-2 mt-1">
            {paramEntries.map(([key, value]) => (
              <span
                key={key}
                className="text-[11px] text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded"
              >
                {key}: {String(value)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggle(block.id, !block.enabled)}
          className={`transition-colors ${
            block.enabled ? "text-emerald-400 hover:text-emerald-300" : "text-slate-600 hover:text-slate-400"
          }`}
          title={block.enabled ? "Disable" : "Enable"}
        >
          {block.enabled ? (
            <ToggleRight className="w-6 h-6" />
          ) : (
            <ToggleLeft className="w-6 h-6" />
          )}
        </button>
        <button
          onClick={() => onDelete(block.id)}
          className="p-1.5 text-slate-600 hover:text-red-400 transition-colors"
          title="Remove"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
