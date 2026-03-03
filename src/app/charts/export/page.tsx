"use client";

/**
 * Public chart export page for newsletter screenshots.
 * No auth required — secured by ?key= parameter.
 * Usage: /charts/export?key=newsletter-2026&range=1W
 * 
 * Screenshot this page to get pixel-perfect charts matching the Hub.
 */

import { useEffect, useState } from "react";
import PerformanceChart from "@/components/PerformanceChart";

export default function ChartExportPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [range, setRange] = useState<string>("1Y");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get("key") || "";
    const r = params.get("range") || "1Y";
    setRange(r);

    fetch(`/api/charts/newsletter?key=${key}&range=${r}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B11] flex items-center justify-center">
        <p className="text-slate-400">Loading chart data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B0B11] flex items-center justify-center">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  // Transform snapshots to match PerformanceChart expected format
  const snapshots = (data?.dailySnapshots || []).map((s: any) => ({
    date: s.date,
    equity: s.equity,
    spy_price: s.spy_close || s.spy_price,
    spy_baseline: s.spy_baseline,
    cash: s.cash,
    positions_value: s.positions_value,
    daily_pnl: s.daily_pnl,
    total_pnl: s.total_pnl,
    total_pnl_pct: s.total_pnl_pct,
  }));

  const intradaySnapshots = (data?.intradaySnapshots || []).map((s: any) => ({
    id: s.id,
    timestamp: s.timestamp,
    equity: s.equity,
    cash: s.cash,
    positions_value: s.positions_value,
    daily_pnl: s.daily_pnl,
    daily_pnl_pct: s.daily_pnl_pct,
    total_pnl: s.total_pnl,
    total_pnl_pct: s.total_pnl_pct,
    spy_price: s.spy_price || s.spy_close,
    spy_baseline: s.spy_baseline,
    open_positions: s.open_positions,
  }));

  // Map URL range param → PerformanceChart TimeRange
  const rangeMap: Record<string, "1D" | "1W" | "1M" | "3M" | "1Y"> = {
    "1D": "1D",
    "1W": "1W",
    "1M": "1M",
    "3M": "3M",
    "1Y": "1Y",
    // lowercase aliases
    "1d": "1D",
    "1w": "1W",
    "1m": "1M",
    "3m": "3M",
    "1y": "1Y",
    all: "1Y",
  };
  const defaultTimeRange = rangeMap[range] || "1Y";

  return (
    <div className="min-h-screen bg-[#0B0B11] p-4">
      <div className="max-w-[640px] mx-auto">
        <PerformanceChart
          snapshots={snapshots}
          intradaySnapshots={intradaySnapshots}
          startingCapital={data?.startingCapital || 100000}
          defaultTimeRange={defaultTimeRange}
        />
      </div>
      {/* Hidden marker for screenshot automation to know chart is loaded */}
      <div id="chart-ready" data-ready="true" style={{ display: "none" }} />
    </div>
  );
}
