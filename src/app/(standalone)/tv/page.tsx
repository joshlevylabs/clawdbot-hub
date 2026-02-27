"use client";

// Import the full trading page directly — same components, same data
// This renders at /tv with a standalone layout (no Hub sidebar)
import dynamic from "next/dynamic";

const TradingPage = dynamic(() => import("../../trading/page"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
        <span className="text-sm text-slate-500">Loading Trading Dashboard…</span>
      </div>
    </div>
  ),
});

export default function StandaloneTradingPage() {
  return <TradingPage />;
}
