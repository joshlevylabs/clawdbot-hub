"use client";

import { useState } from 'react';
import { Target, Flame, Hash, Eye, EyeOff } from 'lucide-react';
import FaithRadarChart from './FaithRadarChart';
import DimensionBar from './DimensionBar';
import type { FaithDimension, FaithTradition, FaithCompassState } from '@/lib/faith-supabase';

interface CompassDashboardProps {
  dimensions: FaithDimension[];
  traditions: FaithTradition[];
  compass: FaithCompassState | null;
}

export default function CompassDashboard({ dimensions, traditions, compass }: CompassDashboardProps) {
  const [visibleTraditions, setVisibleTraditions] = useState<Set<string>>(new Set());

  const toggleTradition = (slug: string) => {
    setVisibleTraditions((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const showAll = () => {
    setVisibleTraditions(new Set(traditions.map((t) => t.slug)));
  };

  const hideAll = () => {
    setVisibleTraditions(new Set());
  };

  const scores = compass?.dimension_scores || {};
  const hasData = Object.keys(scores).length > 0;

  // Find primary/secondary tradition objects
  const primaryTradition = traditions.find(t => t.name === compass?.primary_alignment);
  const secondaryTradition = traditions.find(t => t.name === compass?.secondary_alignment);

  // Calculate secondary confidence using same formula
  let secondaryConfidence = 0;
  if (secondaryTradition && hasData) {
    const dimKeys = Object.keys(scores);
    let sum = 0;
    for (const key of dimKeys) {
      const diff = (scores[key] || 5) - (secondaryTradition.canonical_scores?.[key] || 5);
      sum += diff * diff;
    }
    const dist = Math.sqrt(sum);
    const maxDist = Math.sqrt(dimKeys.length * 81);
    secondaryConfidence = Math.round(Math.max(0, (1 - dist / maxDist)) * 100);
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <Hash className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-slate-500 uppercase tracking-wide">Responses</span>
          </div>
          <p className="text-2xl font-bold text-slate-100">{compass?.total_responses || 0}</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-slate-500 uppercase tracking-wide">Streak</span>
          </div>
          <p className="text-2xl font-bold text-slate-100">{compass?.streak_days || 0} <span className="text-sm text-slate-500">days</span></p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-500 uppercase tracking-wide">Alignment</span>
          </div>
          {hasData ? (
            <div className="flex items-center gap-4">
              <div>
                <span className="text-lg font-bold text-slate-100">
                  {primaryTradition?.icon} {compass?.primary_alignment}
                </span>
                <span className="text-sm text-amber-400 ml-2">{compass?.alignment_confidence}%</span>
              </div>
              {compass?.secondary_alignment && (
                <>
                  <span className="text-slate-600">|</span>
                  <div>
                    <span className="text-sm text-slate-300">
                      {secondaryTradition?.icon} {compass?.secondary_alignment}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">{secondaryConfidence}%</span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Complete lessons to discover your alignment</p>
          )}
        </div>
      </div>

      {/* Radar Chart */}
      <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-100">Faith Compass</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={showAll}
              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-700/50 rounded transition-colors"
            >
              <Eye className="w-3 h-3" /> Show All
            </button>
            <button
              onClick={hideAll}
              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-700/50 rounded transition-colors"
            >
              <EyeOff className="w-3 h-3" /> Hide All
            </button>
          </div>
        </div>

        {!hasData ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Target className="w-12 h-12 text-slate-600 mb-3" />
            <p className="text-slate-400 font-medium">Your compass awaits</p>
            <p className="text-sm text-slate-500 mt-1">Start selecting perspectives from daily lessons to build your faith compass</p>
          </div>
        ) : (
          <FaithRadarChart
            dimensions={dimensions}
            userScores={scores}
            traditions={traditions}
            visibleTraditions={visibleTraditions}
          />
        )}

        {/* Tradition toggles */}
        <div className="flex flex-wrap gap-2 mt-4">
          {traditions.map((t) => {
            const isVisible = visibleTraditions.has(t.slug);
            return (
              <button
                key={t.slug}
                onClick={() => toggleTradition(t.slug)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  isVisible
                    ? 'border-opacity-50 text-white'
                    : 'border-slate-700 text-slate-500 hover:text-slate-300'
                }`}
                style={isVisible ? { borderColor: t.color, backgroundColor: `${t.color}20`, color: t.color } : undefined}
              >
                <span>{t.icon}</span>
                <span>{t.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dimension Scores */}
      {hasData && (
        <div>
          <h3 className="font-semibold text-slate-100 mb-3">Dimension Scores</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dimensions.map((dim) => (
              <DimensionBar
                key={dim.slug}
                name={dim.name}
                leftLabel={dim.left_label}
                rightLabel={dim.right_label}
                score={scores[dim.slug] || 5}
                color="#f59e0b"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
