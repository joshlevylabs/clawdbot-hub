"use client";

import { useState } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import type { FaithTradition, FaithPerspective } from '@/lib/faith-supabase';

interface TraditionCardProps {
  tradition: FaithTradition;
  perspective: FaithPerspective;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

export default function TraditionCard({
  tradition,
  perspective,
  isSelected,
  onSelect,
  disabled = false,
}: TraditionCardProps) {
  const [showCitations, setShowCitations] = useState(false);
  const citations = perspective.source_citations || [];

  return (
    <div
      className={`relative rounded-xl border transition-all duration-300 overflow-hidden ${
        isSelected
          ? 'ring-2 ring-offset-1 ring-offset-slate-900 bg-slate-800/80'
          : 'bg-slate-800/40 hover:bg-slate-800/60 border-slate-700/50'
      }`}
      style={{
        borderColor: isSelected ? tradition.color : undefined,
      }}
    >
      {/* Color accent bar */}
      <div className="h-1" style={{ backgroundColor: tradition.color }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{tradition.icon}</span>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-100 text-sm">{tradition.name}</h3>
          </div>
          {isSelected && (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: tradition.color }}
            >
              <Check className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* Perspective text */}
        <p className="text-sm text-slate-300 leading-relaxed mb-3">
          {perspective.perspective_text}
        </p>

        {/* Citations */}
        {citations.length > 0 && (
          <div className="mb-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCitations(!showCitations);
              }}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-400 transition-colors"
            >
              {showCitations ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {citations.length} source{citations.length !== 1 ? 's' : ''}
            </button>
            {showCitations && (
              <div className="mt-2 space-y-1">
                {citations.map((cite, i) => (
                  <p key={i} className="text-xs text-slate-500 italic pl-3 border-l border-slate-700">
                    {cite}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Select button */}
        <button
          onClick={onSelect}
          disabled={disabled || isSelected}
          className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-all ${
            isSelected
              ? 'text-white cursor-default'
              : disabled
              ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
          }`}
          style={isSelected ? { backgroundColor: tradition.color } : undefined}
        >
          {isSelected ? '✓ Selected' : 'This Resonates'}
        </button>
      </div>
    </div>
  );
}
