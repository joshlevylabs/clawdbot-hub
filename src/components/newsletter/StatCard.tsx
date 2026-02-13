"use client";

import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
}

export function StatCard({ label, value, icon: Icon, color = "text-primary-400" }: StatCardProps) {
  return (
    <div className="bg-slate-850 rounded-xl border border-slate-800 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg bg-slate-800 ${color}`}>
          <Icon className="w-5 h-5" strokeWidth={1.5} />
        </div>
        <span className="text-sm text-slate-400 font-medium">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-slate-100">{value}</p>
    </div>
  );
}
