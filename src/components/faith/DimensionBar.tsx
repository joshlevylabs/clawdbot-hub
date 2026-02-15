"use client";

interface DimensionBarProps {
  name: string;
  leftLabel: string;
  rightLabel: string;
  score: number; // 1-10
  color?: string;
}

export default function DimensionBar({ name, leftLabel, rightLabel, score, color = '#6366f1' }: DimensionBarProps) {
  const percentage = ((score - 1) / 9) * 100;

  return (
    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-200">{name}</span>
        <span className="text-sm font-mono text-slate-400">{score.toFixed(1)}</span>
      </div>
      <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
        {/* Score marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm transition-all duration-500"
          style={{ left: `calc(${percentage}% - 6px)`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-slate-500 max-w-[45%] truncate">{leftLabel}</span>
        <span className="text-[10px] text-slate-500 max-w-[45%] truncate text-right">{rightLabel}</span>
      </div>
    </div>
  );
}
