"use client";

import { Clock } from "lucide-react";

export function CadenceBadge({ cadence }: { cadence: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-700/50 text-slate-400 border border-slate-600">
      <Clock className="w-3 h-3" />
      {cadence}
    </span>
  );
}
