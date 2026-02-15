"use client";

import { useState } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { FaithDimension, FaithTradition } from '@/lib/faith-supabase';

interface FaithRadarChartProps {
  dimensions: FaithDimension[];
  userScores: Record<string, number>;
  traditions: FaithTradition[];
  visibleTraditions?: Set<string>; // tradition slugs that are toggled on
}

export default function FaithRadarChart({
  dimensions,
  userScores,
  traditions,
  visibleTraditions,
}: FaithRadarChartProps) {
  const [hoveredDim, setHoveredDim] = useState<string | null>(null);

  // Build data points for each dimension
  const data = dimensions.map((dim) => {
    const point: Record<string, any> = {
      dimension: dim.name.replace(/ \/ /g, '/\n').replace(/ & /g, ' &\n'),
      slug: dim.slug,
      fullName: dim.name,
      leftLabel: dim.left_label,
      rightLabel: dim.right_label,
      user: userScores[dim.slug] || 0,
    };

    // Add each tradition's canonical score
    for (const t of traditions) {
      point[t.slug] = t.canonical_scores?.[dim.slug] || 0;
    }

    return point;
  });

  const hasUserData = Object.keys(userScores).length > 0;

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid
            stroke="#334155"
            strokeDasharray="3 3"
          />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{
              fill: '#94a3b8',
              fontSize: 11,
              fontWeight: 500,
            }}
            className="cursor-pointer"
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 10]}
            tick={{ fill: '#475569', fontSize: 10 }}
            tickCount={6}
            axisLine={false}
          />

          {/* Tradition overlays (outline only) */}
          {traditions.map((t) => {
            if (visibleTraditions && !visibleTraditions.has(t.slug)) return null;
            return (
              <Radar
                key={t.slug}
                name={t.name}
                dataKey={t.slug}
                stroke={t.color}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                fill={t.color}
                fillOpacity={0.03}
                dot={false}
              />
            );
          })}

          {/* User radar (filled) */}
          {hasUserData && (
            <Radar
              name="Your Compass"
              dataKey="user"
              stroke="#f59e0b"
              strokeWidth={2.5}
              fill="#f59e0b"
              fillOpacity={0.15}
              dot={{
                r: 4,
                fill: '#f59e0b',
                stroke: '#1e293b',
                strokeWidth: 2,
              }}
            />
          )}

          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const dimData = payload[0]?.payload;
              return (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl max-w-xs">
                  <p className="font-semibold text-slate-100 text-sm mb-1">{dimData?.fullName}</p>
                  <div className="flex justify-between text-xs text-slate-500 mb-2">
                    <span>{dimData?.leftLabel}</span>
                    <span>↔</span>
                    <span>{dimData?.rightLabel}</span>
                  </div>
                  {hasUserData && dimData?.user > 0 && (
                    <p className="text-amber-400 text-sm font-medium">
                      Your score: {dimData.user.toFixed(1)}
                    </p>
                  )}
                </div>
              );
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
