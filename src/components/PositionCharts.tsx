"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  ResponsiveContainer,
} from "recharts";
import { Ruler } from "lucide-react";
import FibonacciModal from "./FibonacciModal";

// ===== Types =====

interface Position {
  id: string;
  symbol: string;
  qty: number;
  entry_price: number;
  current_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  signal_confidence: number | null;
  signal_regime: string | null;
  opened_at: string;
  hold_days: number | null;
  notes: string | null;
}

interface PricePoint {
  date: string;
  close: number;
  high: number | null;
  low: number | null;
}

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

interface MRESignal {
  symbol: string;
  fibonacci?: FibonacciData;
}

interface PositionChartData {
  position: Position;
  priceHistory: PricePoint[];
  stopLoss: number;
  takeProfit: number;
  loading: boolean;
  error: boolean;
  fibonacci?: FibonacciData;
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

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

// ===== Fetch MRE Signals for Stop/Target Fallbacks =====

async function fetchMRESignals(): Promise<MRESignal[]> {
  try {
    const [coreRes, uniRes] = await Promise.allSettled([
      fetch("/data/trading/mre-signals.json"),
      fetch("/data/trading/mre-signals-universe.json"),
    ]);
    const results: MRESignal[] = [];
    for (const res of [coreRes, uniRes]) {
      if (res.status === "fulfilled" && res.value.ok) {
        const data = await res.value.json();
        const signals = data?.signals?.by_asset_class || [];
        for (const s of signals) {
          results.push({
            symbol: s.symbol,
            fibonacci: s.fibonacci || undefined,
          });
        }
      }
    }
    return results;
  } catch {
    return [];
  }
}

function getStopAndTarget(
  position: Position,
  mreSignals: MRESignal[]
): { stopLoss: number; takeProfit: number } {
  // Use position values if available
  if (position.stop_loss != null && position.take_profit != null) {
    return {
      stopLoss: position.stop_loss,
      takeProfit: position.take_profit,
    };
  }

  // Try to find in MRE signals
  const mre = mreSignals.find(
    (s) => s.symbol.toUpperCase() === position.symbol.toUpperCase()
  );

  let stopLoss = position.stop_loss;
  let takeProfit = position.take_profit;

  if (mre?.fibonacci) {
    if (stopLoss == null && mre.fibonacci.retracements?.["78.6"]) {
      stopLoss = mre.fibonacci.retracements["78.6"];
    }
    if (takeProfit == null && mre.fibonacci.profit_targets?.[0]) {
      takeProfit = mre.fibonacci.profit_targets[0];
    }
  }

  // Fallback: 5% stop, 10% target from entry
  return {
    stopLoss: stopLoss ?? position.entry_price * 0.95,
    takeProfit: takeProfit ?? position.entry_price * 1.1,
  };
}

// ===== Custom Tooltip =====

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 shadow-xl text-xs">
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

// ===== Single Position Chart Card =====

function PositionChartCard({ chartData }: { chartData: PositionChartData }) {
  const { position, priceHistory, stopLoss, takeProfit, loading, error, fibonacci } =
    chartData;
  const [showFibModal, setShowFibModal] = useState(false);

  const currentPrice = position.current_price || position.entry_price;
  const pnl = (currentPrice - position.entry_price) * position.qty;
  const pnlPct =
    ((currentPrice - position.entry_price) / position.entry_price) * 100;
  const isProfit = pnl >= 0;
  const value = currentPrice * position.qty;
  const holdDays = Math.floor(
    (Date.now() - new Date(position.opened_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Chart colors
  const lineColor = isProfit ? "#34d399" : "#f87171";
  const gradientId = `gradient-${position.id}`;

  // Find the entry date in price data (closest date to opened_at)
  const openedDate = position.opened_at.split("T")[0];
  const entryPoint = priceHistory.find((p) => p.date >= openedDate);

  // Calculate Y-axis domain: include stop, target, and all prices
  const allPrices = priceHistory.map((p) => p.close);
  const minPrice = Math.min(
    ...allPrices,
    stopLoss,
    position.entry_price,
    currentPrice
  );
  const maxPrice = Math.max(
    ...allPrices,
    takeProfit,
    position.entry_price,
    currentPrice
  );
  const padding = (maxPrice - minPrice) * 0.08;
  const yMin = Math.floor((minPrice - padding) * 100) / 100;
  const yMax = Math.ceil((maxPrice + padding) * 100) / 100;

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-slate-100">
            {position.symbol}
          </span>
          {position.signal_regime && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium uppercase tracking-wide ${
                position.signal_regime === "bull"
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                  : position.signal_regime === "bear"
                  ? "bg-red-500/20 text-red-400 border-red-500/40"
                  : "bg-amber-500/20 text-amber-400 border-amber-500/40"
              }`}
            >
              {position.signal_regime}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-right">
          <span
            className={`text-sm font-bold font-mono ${
              isProfit ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {formatPercent(pnlPct)}
          </span>
          <div className="text-xs text-slate-500">
            <span className="font-mono">{position.qty}</span> × $
            {formatCurrency(currentPrice)}
          </div>
          {fibonacci && (
            <button
              onClick={() => setShowFibModal(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-primary-400 transition-colors"
              title="Fibonacci Analysis"
            >
              <Ruler size={12} />
              <span>Fib</span>
            </button>
          )}
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-[180px] bg-slate-900/50 rounded-lg animate-pulse flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
        </div>
      ) : error || priceHistory.length === 0 ? (
        <div className="h-[180px] bg-slate-900/50 rounded-lg flex items-center justify-center text-slate-600 text-sm">
          Chart unavailable
        </div>
      ) : (
        <div className="h-[180px] -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={priceHistory}
              margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={lineColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="date"
                tickFormatter={formatCompactDate}
                tick={{ fontSize: 10, fill: "#64748b" }}
                axisLine={{ stroke: "#334155" }}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                domain={[yMin, yMax]}
                tick={{ fontSize: 10, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v.toFixed(0)}`}
                width={50}
              />
              <Tooltip content={<ChartTooltip />} />

              {/* Stop loss line */}
              <ReferenceLine
                y={stopLoss}
                stroke="#f87171"
                strokeDasharray="4 4"
                strokeOpacity={0.6}
                label={{
                  value: "Stop",
                  position: "insideBottomLeft",
                  fill: "#f87171",
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />

              {/* Take profit line */}
              <ReferenceLine
                y={takeProfit}
                stroke="#34d399"
                strokeDasharray="4 4"
                strokeOpacity={0.6}
                label={{
                  value: "Target",
                  position: "insideTopLeft",
                  fill: "#34d399",
                  fontSize: 10,
                  fontWeight: 600,
                }}
              />

              {/* Entry price line */}
              <ReferenceLine
                y={position.entry_price}
                stroke="#94a3b8"
                strokeDasharray="3 3"
                strokeOpacity={0.4}
              />

              {/* Price area */}
              <Area
                type="monotone"
                dataKey="close"
                stroke={lineColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: lineColor,
                  stroke: "#1e293b",
                  strokeWidth: 2,
                }}
              />

              {/* Entry point dot */}
              {entryPoint && (
                <ReferenceDot
                  x={entryPoint.date}
                  y={entryPoint.close}
                  r={5}
                  fill="#1e293b"
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Stats row */}
      <div className="mt-3 pt-3 border-t border-slate-700/50">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="text-slate-500">
            Entry{" "}
            <span className="text-slate-300 font-mono">
              ${formatCurrency(position.entry_price)}
            </span>
            <span className="text-slate-600"> → </span>
            <span
              className={`font-mono font-medium ${
                isProfit ? "text-emerald-400" : "text-red-400"
              }`}
            >
              ${formatCurrency(currentPrice)}
            </span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-500">
            Stop{" "}
            <span className="text-red-400/70 font-mono">
              ${formatCurrency(stopLoss)}
            </span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-500">
            Target{" "}
            <span className="text-emerald-400/70 font-mono">
              ${formatCurrency(takeProfit)}
            </span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-500">
            Days{" "}
            <span className="text-slate-300 font-mono">
              {holdDays}
              {position.hold_days ? `/${position.hold_days}` : ""}
            </span>
          </span>
        </div>
      </div>

      {/* Fibonacci Modal */}
      {showFibModal && fibonacci && (
        <FibonacciModal
          symbol={position.symbol}
          fibonacci={fibonacci}
          onClose={() => setShowFibModal(false)}
        />
      )}
    </div>
  );
}

// ===== Main Component =====

export default function PositionCharts({
  positions,
}: {
  positions: Position[];
}) {
  const [chartDataMap, setChartDataMap] = useState<
    Map<string, PositionChartData>
  >(new Map());

  useEffect(() => {
    if (positions.length === 0) return;

    let cancelled = false;

    async function loadAll() {
      // Fetch MRE signals for stop/target fallbacks
      const mreSignals = await fetchMRESignals();

      // Initialize loading state for all positions
      const initial = new Map<string, PositionChartData>();
      positions.forEach((pos) => {
        const { stopLoss, takeProfit } = getStopAndTarget(pos, mreSignals);
        const mre = mreSignals.find(
          (s) => s.symbol.toUpperCase() === pos.symbol.toUpperCase()
        );
        initial.set(pos.id, {
          position: pos,
          priceHistory: [],
          stopLoss,
          takeProfit,
          loading: true,
          error: false,
          fibonacci: mre?.fibonacci,
        });
      });
      if (!cancelled) setChartDataMap(new Map(initial));

      // Fetch all price histories in parallel
      const results = await Promise.allSettled(
        positions.map(async (pos) => {
          // Determine period based on hold days
          const holdDays = Math.floor(
            (Date.now() - new Date(pos.opened_at).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          let period = "1mo";
          if (holdDays > 120) period = "6mo";
          else if (holdDays > 60) period = "3mo";
          else if (holdDays > 25) period = "1mo";
          else if (holdDays > 10) period = "1mo";
          else period = "1mo";

          const res = await fetch(
            `/api/price-history?symbol=${encodeURIComponent(pos.symbol)}&period=${period}`
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          return { positionId: pos.id, data: json.data as PricePoint[] };
        })
      );

      // Update chart data with results
      if (cancelled) return;

      setChartDataMap((prev) => {
        const updated = new Map(prev);
        results.forEach((result, idx) => {
          const pos = positions[idx];
          const existing = updated.get(pos.id);
          if (!existing) return;

          if (result.status === "fulfilled") {
            updated.set(pos.id, {
              ...existing,
              priceHistory: result.value.data,
              loading: false,
              error: false,
            });
          } else {
            updated.set(pos.id, {
              ...existing,
              loading: false,
              error: true,
            });
          }
        });
        return updated;
      });
    }

    loadAll();

    return () => {
      cancelled = true;
    };
  }, [positions]);

  if (positions.length === 0) return null;

  const chartEntries = Array.from(chartDataMap.values());

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {chartEntries.length > 0
          ? chartEntries.map((cd) => (
              <PositionChartCard key={cd.position.id} chartData={cd} />
            ))
          : // Show skeleton cards while initializing
            positions.map((pos) => (
              <div
                key={pos.id}
                className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-5 w-12 bg-slate-700 rounded animate-pulse" />
                  <div className="h-4 w-16 bg-slate-700/50 rounded animate-pulse" />
                </div>
                <div className="h-[180px] bg-slate-900/50 rounded-lg animate-pulse" />
                <div className="mt-3 pt-3 border-t border-slate-700/50">
                  <div className="h-3 w-3/4 bg-slate-700/50 rounded animate-pulse" />
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
