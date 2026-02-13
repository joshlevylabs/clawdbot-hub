"use client";

import { useState, useEffect, useCallback } from "react";
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
import { X } from "lucide-react";

// ===== Types =====

interface FibonacciData {
  symbol: string;
  current_price: number;
  swing_high: number;
  swing_low: number;
  trend: string;
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

interface FibonacciModalProps {
  symbol: string;
  fibonacci: FibonacciData;
  onClose: () => void;
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

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Find the date in price history where a given value is closest to a target
function findSwingDate(
  priceHistory: PricePoint[],
  target: number,
  field: "high" | "low"
): string | null {
  let bestDate: string | null = null;
  let bestDiff = Infinity;

  for (const point of priceHistory) {
    const val = field === "high" ? point.high : point.low;
    if (val == null) continue;
    const diff = Math.abs(val - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestDate = point.date;
    }
  }
  return bestDate;
}

// ===== Custom Tooltip =====

function FibChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 shadow-xl text-xs z-50">
      <p className="text-slate-400 mb-1">{formatCompactDate(data.date)}</p>
      <p className="text-slate-100 font-mono font-bold">
        ${formatCurrency(data.close)}
      </p>
      {data.high != null && (
        <p className="text-slate-500">
          H: ${formatCurrency(data.high)} / L: ${formatCurrency(data.low)}
        </p>
      )}
    </div>
  );
}

// ===== Custom Label for Reference Lines =====

function FibLabel({
  viewBox,
  value,
  fill,
}: {
  viewBox?: any;
  value: string;
  fill: string;
}) {
  if (!viewBox) return null;
  return (
    <text
      x={viewBox.width + viewBox.x - 4}
      y={viewBox.y - 4}
      fill={fill}
      fontSize={9}
      fontWeight={600}
      textAnchor="end"
      fontFamily="monospace"
    >
      {value}
    </text>
  );
}

// ===== Swing Point Label =====

function SwingLabel({
  viewBox,
  value,
  fill,
}: {
  viewBox?: any;
  value: string;
  fill: string;
}) {
  if (!viewBox) return null;
  return (
    <text
      x={viewBox.cx}
      y={viewBox.cy - 12}
      fill={fill}
      fontSize={11}
      fontWeight={700}
      textAnchor="middle"
    >
      {value}
    </text>
  );
}

// ===== Main Modal Component =====

export default function FibonacciModal({
  symbol,
  fibonacci,
  onClose,
}: FibonacciModalProps) {
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Fetch 3-month price history
  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/price-history?symbol=${encodeURIComponent(symbol)}&period=3mo`
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
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const fib = fibonacci;
  const currentPrice = fib.current_price;
  const swingHigh = fib.swing_high;
  const swingLow = fib.swing_low;

  // Find swing point dates
  const swingHighDate = findSwingDate(priceHistory, swingHigh, "high");
  const swingLowDate = findSwingDate(priceHistory, swingLow, "low");
  const lastDate =
    priceHistory.length > 0 ? priceHistory[priceHistory.length - 1].date : null;

  // Calculate Y-axis domain
  const allPrices = priceHistory.map((p) => p.close);
  const allExtensions = Object.values(fib.extensions || {});
  const allRetracements = Object.values(fib.retracements || {});
  const allValues = [
    ...allPrices,
    swingHigh,
    swingLow,
    currentPrice,
    ...allRetracements,
    // Only include extensions that aren't too far away (within 20% of swing range)
    ...allExtensions.filter(
      (v) => v <= swingHigh + (swingHigh - swingLow) * 0.8
    ),
  ];
  const dataMin = Math.min(...allValues);
  const dataMax = Math.max(...allValues);
  const range = dataMax - dataMin;
  const yMin = Math.floor((dataMin - range * 0.05) * 100) / 100;
  const yMax = Math.ceil((dataMax + range * 0.05) * 100) / 100;

  // Retracement level status
  function getLevelStatus(
    pct: string,
    price: number
  ): { label: string; color: string } {
    const pctNum = parseFloat(pct);
    if (pctNum === 0) return { label: "Swing High", color: "text-cyan-400" };
    if (pctNum === 100) return { label: "Swing Low", color: "text-cyan-400" };
    if (pctNum >= 38.2 && pctNum <= 61.8)
      return { label: "Entry Zone", color: "text-amber-400" };
    if (pctNum === 78.6)
      return { label: "Support (Stop)", color: "text-red-400" };
    if (price > currentPrice)
      return { label: "Resistance", color: "text-emerald-400" };
    return { label: "Support", color: "text-red-400" };
  }

  // Sort retracement entries by percentage
  const retracementEntries = Object.entries(fib.retracements || {}).sort(
    (a, b) => parseFloat(a[0]) - parseFloat(b[0])
  );

  const extensionEntries = Object.entries(fib.extensions || {}).sort(
    (a, b) => parseFloat(a[0]) - parseFloat(b[0])
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg">📐</span>
            <h2 className="text-xl font-bold text-slate-100">
              {symbol} Fibonacci Analysis
            </h2>
            <span className="text-sm font-mono text-slate-400">
              ${formatCurrency(currentPrice)}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium uppercase tracking-wide ${
                fib.trend === "uptrend"
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                  : fib.trend === "downtrend"
                  ? "bg-red-500/20 text-red-400 border-red-500/40"
                  : "bg-amber-500/20 text-amber-400 border-amber-500/40"
              }`}
            >
              {fib.trend}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Chart */}
        <div className="px-6 pt-4">
          {loading ? (
            <div className="h-[400px] bg-slate-800/50 rounded-xl flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
                <span className="text-sm text-slate-500">
                  Loading 3-month price data…
                </span>
              </div>
            </div>
          ) : error || priceHistory.length === 0 ? (
            <div className="h-[400px] bg-slate-800/50 rounded-xl flex items-center justify-center text-slate-500">
              Chart unavailable
            </div>
          ) : (
            <div className="h-[400px] -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={priceHistory}
                  margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="fibGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#818cf8"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="#818cf8"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <XAxis
                    dataKey="date"
                    tickFormatter={formatCompactDate}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={{ stroke: "#334155" }}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={60}
                  />
                  <YAxis
                    domain={[yMin, yMax]}
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v.toFixed(0)}`}
                    width={55}
                  />
                  <Tooltip content={<FibChartTooltip />} />

                  {/* Entry zone band (38.2% to 61.8%) */}
                  {fib.retracements?.["38.2"] != null &&
                    fib.retracements?.["61.8"] != null && (
                      <ReferenceArea
                        y1={fib.retracements["38.2"]}
                        y2={fib.retracements["61.8"]}
                        fill="#22c55e"
                        fillOpacity={0.06}
                        strokeOpacity={0}
                      />
                    )}

                  {/* Retracement levels */}
                  {retracementEntries
                    .filter(
                      ([pct]) =>
                        pct !== "0.0" && pct !== "100.0"
                    )
                    .map(([pct, price]) => {
                      const isAbove = price > currentPrice;
                      const color = isAbove ? "#34d399" : "#f87171";
                      const pctNum = parseFloat(pct);
                      const isEntryZone = pctNum >= 38.2 && pctNum <= 61.8;
                      return (
                        <ReferenceLine
                          key={`ret-${pct}`}
                          y={price}
                          stroke={isEntryZone ? "#fbbf24" : color}
                          strokeDasharray="6 4"
                          strokeOpacity={0.5}
                          label={
                            <FibLabel
                              value={`${pct}% — $${formatCurrency(price)}`}
                              fill={isEntryZone ? "#fbbf24" : color}
                            />
                          }
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
                      label={
                        <FibLabel
                          value={`${pct}% — $${formatCurrency(price)}`}
                          fill="#38bdf8"
                        />
                      }
                    />
                  ))}

                  {/* Current price line */}
                  <ReferenceLine
                    y={currentPrice}
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    strokeOpacity={0.8}
                    label={
                      <FibLabel
                        value={`Current $${formatCurrency(currentPrice)}`}
                        fill="#ffffff"
                      />
                    }
                  />

                  {/* Price area */}
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke="#818cf8"
                    strokeWidth={2}
                    fill="url(#fibGradient)"
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: "#818cf8",
                      stroke: "#1e293b",
                      strokeWidth: 2,
                    }}
                  />

                  {/* Swing High dot (Point A) */}
                  {swingHighDate && (
                    <ReferenceDot
                      x={swingHighDate}
                      y={
                        priceHistory.find((p) => p.date === swingHighDate)
                          ?.close || swingHigh
                      }
                      r={6}
                      fill="#22d3ee"
                      stroke="#0e7490"
                      strokeWidth={2}
                      label={<SwingLabel value="A" fill="#22d3ee" />}
                    />
                  )}

                  {/* Swing Low dot (Point B) */}
                  {swingLowDate && (
                    <ReferenceDot
                      x={swingLowDate}
                      y={
                        priceHistory.find((p) => p.date === swingLowDate)
                          ?.close || swingLow
                      }
                      r={6}
                      fill="#f472b6"
                      stroke="#be185d"
                      strokeWidth={2}
                      label={<SwingLabel value="B" fill="#f472b6" />}
                    />
                  )}

                  {/* Current price dot (Point C) */}
                  {lastDate && (
                    <ReferenceDot
                      x={lastDate}
                      y={currentPrice}
                      r={6}
                      fill="#ffffff"
                      stroke="#64748b"
                      strokeWidth={2}
                      label={<SwingLabel value="C (Now)" fill="#ffffff" />}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Data Tables */}
        <div className="px-6 pb-6 pt-2 space-y-5">
          {/* Retracement Levels Table */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
              <span>📊</span>
              Retracement Levels
              <span className="text-slate-500 font-normal">
                (from swing high ${formatCurrency(swingHigh)})
              </span>
            </h3>
            <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">
                      Level
                    </th>
                    <th className="text-right px-3 py-2 text-slate-500 font-medium">
                      Price
                    </th>
                    <th className="text-right px-3 py-2 text-slate-500 font-medium">
                      vs Current
                    </th>
                    <th className="text-right px-3 py-2 text-slate-500 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {retracementEntries.map(([pct, price]) => {
                    const diff =
                      ((price - currentPrice) / currentPrice) * 100;
                    const status = getLevelStatus(pct, price);
                    const isAbove = price > currentPrice;
                    return (
                      <tr
                        key={`ret-row-${pct}`}
                        className="border-b border-slate-700/30 last:border-0 hover:bg-slate-700/20"
                      >
                        <td className="px-3 py-1.5 text-slate-300 font-mono">
                          {pct}%
                        </td>
                        <td className="px-3 py-1.5 text-right text-slate-200 font-mono">
                          ${formatCurrency(price)}
                        </td>
                        <td
                          className={`px-3 py-1.5 text-right font-mono ${
                            isAbove ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {diff >= 0 ? "+" : ""}
                          {diff.toFixed(1)}%
                        </td>
                        <td
                          className={`px-3 py-1.5 text-right font-medium ${status.color}`}
                        >
                          {status.label}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Extension Levels Table */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
              <span>🎯</span>
              Extension Levels
              <span className="text-slate-500 font-normal">
                (profit targets)
              </span>
            </h3>
            <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left px-3 py-2 text-slate-500 font-medium">
                      Level
                    </th>
                    <th className="text-right px-3 py-2 text-slate-500 font-medium">
                      Price
                    </th>
                    <th className="text-right px-3 py-2 text-slate-500 font-medium">
                      vs Current
                    </th>
                    <th className="text-right px-3 py-2 text-slate-500 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {extensionEntries.map(([pct, price], idx) => {
                    const diff =
                      ((price - currentPrice) / currentPrice) * 100;
                    return (
                      <tr
                        key={`ext-row-${pct}`}
                        className="border-b border-slate-700/30 last:border-0 hover:bg-slate-700/20"
                      >
                        <td className="px-3 py-1.5 text-slate-300 font-mono">
                          {pct}%
                        </td>
                        <td className="px-3 py-1.5 text-right text-slate-200 font-mono">
                          ${formatCurrency(price)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-cyan-400">
                          +{diff.toFixed(1)}%
                        </td>
                        <td className="px-3 py-1.5 text-right font-medium text-cyan-400">
                          Target {idx + 1}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Swing Points Summary */}
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
              <span>📐</span>
              Swing Points
            </h3>
            <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-cyan-400 font-semibold">A (High)</span>
                <p className="text-slate-200 font-mono mt-0.5">
                  ${formatCurrency(swingHigh)}
                </p>
                <p className="text-slate-500">
                  {swingHighDate ? formatFullDate(swingHighDate) : "—"}
                </p>
              </div>
              <div>
                <span className="text-pink-400 font-semibold">B (Low)</span>
                <p className="text-slate-200 font-mono mt-0.5">
                  ${formatCurrency(swingLow)}
                </p>
                <p className="text-slate-500">
                  {swingLowDate ? formatFullDate(swingLowDate) : "—"}
                </p>
              </div>
              <div>
                <span className="text-white font-semibold">C (Now)</span>
                <p className="text-slate-200 font-mono mt-0.5">
                  ${formatCurrency(currentPrice)}
                </p>
                <p className="text-slate-500">
                  {lastDate ? formatFullDate(lastDate) : "—"}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">Trend</span>
                <p
                  className={`font-medium mt-0.5 capitalize ${
                    fib.trend === "uptrend"
                      ? "text-emerald-400"
                      : fib.trend === "downtrend"
                      ? "text-red-400"
                      : "text-amber-400"
                  }`}
                >
                  {fib.trend}
                </p>
                <p className="text-slate-500">
                  Range: ${formatCurrency(swingHigh - swingLow)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
