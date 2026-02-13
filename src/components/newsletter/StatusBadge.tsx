"use client";

const statusStyles: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  draft: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  paused: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  sent: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  scheduled: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  unsubscribed: "bg-red-500/15 text-red-400 border-red-500/30",
};

export function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] || statusStyles.draft;
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${style}`}>
      {status}
    </span>
  );
}
