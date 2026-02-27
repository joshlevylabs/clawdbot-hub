"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
  ResponsiveContainer,
} from "recharts";

// ===== Types =====

interface FibonacciData {
  symbol: string;
  current_price: number;
  swing_high: number;
  swing_low: number;
  swing_high_date?: string;
  swing_low_date?: string;
  trend: string;
  swing_quality?: string;
  lookback_period?: string;
  extension_type?: string;
  pullback_low?: number;
  pullback_high?: number;
  pullback_date?: string;
  retracements: Record<string, number>;
  extensions: Record<string, number>;
  nearest_support: number;
  nearest_resistance: number;
  entry_zone: string;
  profit_targets: number[];
}

interface PricePoint {
  date: string;
  close: number;
  high: number | null;
  low: number | null;
}

// ===== Helpers =====

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCompactDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function findSwingDate(
  history: PricePoint[],
  targetPrice: number,
  type: "high" | "low"
): string | null {
  if (!history.length) return null;
  let best = history[0];
  let bestDiff = Infinity;
  for (const p of history) {
    const val = type === "high" ? (p.high ?? p.close) : (p.low ?? p.close);
    const diff = Math.abs(val - targetPrice);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = p;
    }
  }
  return best.date;
}

function FibChartTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-slate-800/95 border border-slate-600 rounded-lg px-3 py-2 shadow-xl text-xs">
      <div className="text-slate-400">{formatCompactDate(p.date)}</div>
      <div className="text-slate-200 font-semibold">
        ${formatCurrency(p.close)}
      </div>
    </div>
  );
}

function FibLabel({ value, fill }: { value: string; fill: string }) {
  return (
    <text
      textAnchor="start"
      fill={fill}
      fontSize={9}
      fontWeight={500}
      opacity={0.85}
      dy={-4}
      dx={4}
    >
      {value}
    </text>
  );
}

function SwingLabel({ value, fill }: { value: string; fill: string }) {
  return (
    <text
      textAnchor="middle"
      fill={fill}
      fontSize={14}
      fontWeight={700}
      dy={-16}
    >
      {value}
    </text>
  );
}

// ===== Main Component =====

interface FibonacciInlineChartProps {
  symbol: string;
  fibonacci: FibonacciData;
  height?: number;
}

export default function FibonacciInlineChart({
  symbol,
  fibonacci: fib,
  height = 280,
}: FibonacciInlineChartProps) {
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/price-history?symbol=${encodeURIComponent(symbol)}&period=${fib.lookback_period || "6mo"}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setPriceHistory(json.data || []);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [symbol, fib.lookback_period]);

  const currentPrice = fib.current_price;
  const swingHigh = fib.swing_high;
  const swingLow = fib.swing_low;
  const isUptrend = fib.trend === "uptrend";
  const has3Point = !!(fib.pullback_low || fib.pullback_high);
  const pullbackPrice = isUptrend ? fib.pullback_low : fib.pullback_high;

  const pointA = isUptrend ? swingLow : swingHigh;
  const pointB = isUptrend ? swingHigh : swingLow;

  const pointADate = isUptrend
    ? (fib.swing_low_date || findSwingDate(priceHistory, pointA, "low"))
    : (fib.swing_high_date || findSwingDate(priceHistory, pointA, "high"));
  const pointBDate = isUptrend
    ? (fib.swing_high_date || findSwingDate(priceHistory, pointB, "high"))
    : (fib.swing_low_date || findSwingDate(priceHistory, pointB, "low"));
  const pullbackDate = has3Point ? (fib.pullback_date || null) : null;

  const lastDate =
    priceHistory.length > 0 ? priceHistory[priceHistory.length - 1].date : null;

  // Y-axis domain
  const allPrices = priceHistory.map((p) => p.close);
  const allExtensions = Object.values(fib.extensions || {});
  const allRetracements = Object.values(fib.retracements || {});
  const allValues = [
    ...allPrices,
    swingHigh,
    swingLow,
    currentPrice,
    ...allRetracements,
    ...allExtensions.filter(
      (v) => isUptrend
        ? v <= swingHigh + (swingHigh - swingLow) * 0.8
        : v >= swingLow - (swingHigh - swingLow) * 0.8
    ),
  ];
  const dataMin = Math.min(...allValues.filter(v => isFinite(v)));
  const dataMax = Math.max(...allValues.filter(v => isFinite(v)));
  const range = dataMax - dataMin || 1;
  const yMin = Math.floor((dataMin - range * 0.05) * 100) / 100;
  const yMax = Math.ceil((dataMax + range * 0.05) * 100) / 100;

  const retracementEntries = Object.entries(fib.retracements || {}).sort(
    (a, b) => parseFloat(a[0]) - parseFloat(b[0])
  );
  const extensionEntries = Object.entries(fib.extensions || {}).sort(
    (a, b) => parseFloat(a[0]) - parseFloat(b[0])
  );

  if (loading) {
    return (
      <div style={{ height }} className="bg-slate-800/50 rounded-xl flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
          <span className="text-xs text-slate-500">Loading price data…</span>
        </div>
      </div>
    );
  }

  if (error || priceHistory.length === 0) {
    return (
      <div style={{ height }} className="bg-slate-800/50 rounded-xl flex items-center justify-center text-slate-500 text-xs">
        Chart unavailable
      </div>
    );
  }

  return (
    <div style={{ height }} className="-mx-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={priceHistory}
          margin={{ top: 16, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={`fibGrad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="date"
            tickFormatter={formatCompactDate}
            tick={{ fontSize: 9, fill: "#64748b" }}
            axisLine={{ stroke: "#334155" }}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={50}
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 9, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v.toFixed(0)}`}
            width={48}
          />
          <Tooltip content={<FibChartTooltip />} />

          {/* Entry zone band */}
          {fib.retracements?.["38.2"] != null && fib.retracements?.["61.8"] != null && (
            <ReferenceArea
              y1={fib.retracements["38.2"]}
              y2={fib.retracements["61.8"]}
              fill="#22c55e"
              fillOpacity={0.06}
              strokeOpacity={0}
            />
          )}

          {/* Retracement levels */}
          {retracementEntries.map(([pct, price]) => {
            const pctNum = parseFloat(pct);
            const isAnchor = pctNum === 0 || pctNum === 100;
            const isAbove = price > currentPrice;
            const isEntryZone = pctNum >= 38.2 && pctNum <= 61.8;
            const color = isAnchor ? "#22d3ee" : isEntryZone ? "#fbbf24" : isAbove ? "#34d399" : "#f87171";
            const label = isAnchor
              ? `${pctNum === 0 ? "High" : "Low"} $${formatCurrency(price)}`
              : `${pct}% $${formatCurrency(price)}`;
            return (
              <ReferenceLine
                key={`ret-${pct}`}
                y={price}
                stroke={color}
                strokeDasharray={isAnchor ? "3 3" : "6 4"}
                strokeOpacity={isAnchor ? 0.35 : 0.5}
                label={<FibLabel value={label} fill={color} />}
              />
            );
          })}

          {/* Extension levels */}
          {extensionEntries.map(([pct, price]) => (
            <ReferenceLine
              key={`ext-${pct}`}
              y={price}
              stroke="#38bdf8"
              strokeDasharray="4 6"
              strokeOpacity={0.45}
              label={<FibLabel value={`${pct}% $${formatCurrency(price)}`} fill="#38bdf8" />}
            />
          ))}

          {/* Current price */}
          <ReferenceLine
            y={currentPrice}
            stroke="#ffffff"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            strokeOpacity={0.8}
            label={<FibLabel value={`Now $${formatCurrency(currentPrice)}`} fill="#ffffff" />}
          />

          {/* Price area */}
          <Area
            type="monotone"
            dataKey="close"
            stroke="#818cf8"
            strokeWidth={2}
            fill={`url(#fibGrad-${symbol})`}
            dot={false}
            activeDot={{ r: 3, fill: "#818cf8", stroke: "#1e293b", strokeWidth: 2 }}
          />

          {/* Point A */}
          {pointADate && (
            <ReferenceDot
              x={pointADate}
              y={
                isUptrend
                  ? (priceHistory.find((p) => p.date === pointADate)?.low || pointA)
                  : (priceHistory.find((p) => p.date === pointADate)?.high || pointA)
              }
              r={7}
              fill="#f472b6"
              stroke="#be185d"
              strokeWidth={2}
              label={<SwingLabel value="A" fill="#f472b6" />}
            />
          )}

          {/* Point B */}
          {pointBDate && (
            <ReferenceDot
              x={pointBDate}
              y={
                isUptrend
                  ? (priceHistory.find((p) => p.date === pointBDate)?.high || pointB)
                  : (priceHistory.find((p) => p.date === pointBDate)?.low || pointB)
              }
              r={7}
              fill="#22d3ee"
              stroke="#0e7490"
              strokeWidth={2}
              label={<SwingLabel value="B" fill="#22d3ee" />}
            />
          )}

          {/* Point C — Pullback */}
          {has3Point && pullbackDate && (
            <ReferenceDot
              x={pullbackDate}
              y={
                isUptrend
                  ? (priceHistory.find((p) => p.date === pullbackDate)?.low || pullbackPrice || 0)
                  : (priceHistory.find((p) => p.date === pullbackDate)?.high || pullbackPrice || 0)
              }
              r={7}
              fill="#fbbf24"
              stroke="#b45309"
              strokeWidth={2}
              label={<SwingLabel value="C" fill="#fbbf24" />}
            />
          )}

          {/* Current price dot */}
          {lastDate && (
            <ReferenceDot
              x={lastDate}
              y={priceHistory[priceHistory.length - 1]?.close ?? currentPrice}
              r={5}
              fill="#ffffff"
              stroke="#64748b"
              strokeWidth={2}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
