"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Shield,
  Zap,
  Activity,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
} from "lucide-react";

// ============ TYPES ============

interface SeriesDataPoint {
  phase: string;
  performance: number;
}

interface ChartSeries {
  name: string;
  assets: string[];
  role: string;
  color: string;
  data: SeriesDataPoint[];
}

interface QuarterlyDataPoint {
  date: string;
  value: number;
}

interface IndividualAsset {
  name: string;
  data: QuarterlyDataPoint[];
}

interface RotationSequenceItem {
  rank: number;
  asset: string;
  name: string;
  lead_lag: number;
  type: string;
}

interface RotationChartData {
  timestamp: string;
  cycle_phases: string[];
  current_phase_index: number;
  current_phase_label: string;
  uncertainty_range: [number, number];
  series: ChartSeries[];
  quarterly_data: Record<string, QuarterlyDataPoint[]>;
  individual_assets: Record<string, IndividualAsset>;
  rotation_sequence: RotationSequenceItem[];
}

interface LeaderLaggard {
  symbol: string;
  return_3m: number;
  trend: string;
}

interface RoleActivation {
  status: string;
  assets: string[];
  note: string;
}

interface RotationStatus {
  timestamp: string;
  as_of_date: string;
  current_phase: string;
  current_regime: string;
  confidence: number;
  crash_mode: boolean;
  crash_score: number;
  spy: {
    price: number;
    drawdown_from_ath: number;
  };
  cycle_detail: {
    phase_duration_days: number;
    transition_probability: number;
    transition_target: string;
    breadth_pct: number;
    assets_above_sma200: number;
    total_assets: number;
  };
  leaders: LeaderLaggard[];
  laggards: LeaderLaggard[];
  role_activation: Record<string, RoleActivation>;
  warnings: string[];
  rotation_pattern: string;
}

// ============ CONSTANTS ============

const ROLE_CONFIG: Record<string, { icon: typeof Shield; label: string; color: string; bg: string; border: string }> = {
  crisis_hedge: { icon: Shield, label: "Crisis Hedge", color: "text-red-400", bg: "bg-red-500/20", border: "border-red-500/30" },
  defensive: { icon: Shield, label: "Defensive", color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/30" },
  risk_on: { icon: Zap, label: "Risk-On", color: "text-green-400", bg: "bg-green-500/20", border: "border-green-500/30" },
  cyclical: { icon: Activity, label: "Cyclical", color: "text-yellow-400", bg: "bg-yellow-500/20", border: "border-yellow-500/30" },
  momentum: { icon: TrendingUp, label: "Momentum", color: "text-purple-400", bg: "bg-purple-500/20", border: "border-purple-500/30" },
  all_weather: { icon: Eye, label: "All-Weather", color: "text-gray-300", bg: "bg-gray-500/20", border: "border-gray-500/30" },
};

const STATUS_COLORS: Record<string, string> = {
  STANDBY: "text-gray-500",
  ACTIVE: "text-green-400",
  MIXED: "text-yellow-400",
  TREND_FOLLOWING: "text-purple-400",
  ALWAYS_ON: "text-gray-300",
};

// ============ COMPONENTS ============

function PhaseIndicator({ phase, confidence, crashMode }: { phase: string; confidence: number; crashMode: boolean }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 font-semibold text-sm">
        {phase}
      </span>
      <span className={`text-sm font-mono ${confidence >= 70 ? "text-green-400" : confidence >= 50 ? "text-yellow-400" : "text-red-400"}`}>
        {confidence}% confidence
      </span>
      {crashMode ? (
        <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 text-xs font-semibold animate-pulse">
          🚨 CRASH MODE
        </span>
      ) : (
        <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500/70 border border-green-500/20 text-xs">
          ✅ Normal
        </span>
      )}
    </div>
  );
}

// Custom tooltip for the cycle chart
function CycleTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string; payload: Record<string, unknown> }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl max-w-xs">
      <div className="text-sm font-semibold text-gray-200 mb-2">{label}</div>
      <div className="space-y-1">
        {payload
          .sort((a, b) => b.value - a.value)
          .map((entry) => (
            <div key={entry.name} className="flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-gray-300">{entry.name}</span>
              </div>
              <span className="font-mono text-gray-200">{entry.value}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

// Custom tooltip for quarterly chart
function QuarterlyTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl max-w-xs">
      <div className="text-sm font-semibold text-gray-200 mb-2">{label}</div>
      <div className="space-y-1">
        {payload
          .sort((a, b) => b.value - a.value)
          .map((entry) => (
            <div key={entry.name} className="flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-gray-300">{entry.name}</span>
              </div>
              <span className={`font-mono ${entry.value >= 100 ? "text-green-400" : "text-red-400"}`}>
                {entry.value >= 100 ? "+" : ""}{(entry.value - 100).toFixed(1)}%
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

// Rotation Cycle Chart (full cycle view)
function RotationCycleChart({
  chartData,
  expandedGroup,
  onGroupClick,
}: {
  chartData: RotationChartData;
  expandedGroup: string | null;
  onGroupClick: (name: string) => void;
}) {
  // Transform series data into Recharts format
  const data = chartData.cycle_phases.map((phase, idx) => {
    const point: Record<string, string | number> = { phase };
    chartData.series.forEach((s) => {
      point[s.name] = s.data[idx]?.performance ?? 0;
    });
    return point;
  });

  // Calculate uncertainty band phase labels
  const uncertaintyLow = chartData.uncertainty_range[0];
  const uncertaintyHigh = chartData.uncertainty_range[1];
  const lowPhaseIdx = Math.floor(uncertaintyLow);
  const highPhaseIdx = Math.min(Math.ceil(uncertaintyHigh), chartData.cycle_phases.length - 1);
  const lowPhase = chartData.cycle_phases[lowPhaseIdx];
  const highPhase = chartData.cycle_phases[highPhaseIdx];

  // Current position phase
  const currentPhaseIdx = Math.round(chartData.current_phase_index);
  const currentPhase = chartData.cycle_phases[Math.min(currentPhaseIdx, chartData.cycle_phases.length - 1)];

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="phase"
            stroke="#9ca3af"
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            tickLine={{ stroke: "#4b5563" }}
          />
          <YAxis
            stroke="#9ca3af"
            tick={{ fill: "#9ca3af", fontSize: 12 }}
            tickLine={{ stroke: "#4b5563" }}
            label={{ value: "Relative Performance", angle: -90, position: "insideLeft", fill: "#6b7280", fontSize: 12 }}
          />
          <Tooltip content={<CycleTooltip />} />

          {/* Uncertainty band */}
          <ReferenceArea
            x1={lowPhase}
            x2={highPhase}
            fill="#f59e0b"
            fillOpacity={0.08}
            stroke="#f59e0b"
            strokeOpacity={0.3}
            strokeDasharray="4 4"
          />

          {/* "You Are Here" reference line */}
          <ReferenceLine
            x={currentPhase}
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="8 4"
            label={{
              value: "📍 YOU ARE HERE",
              position: "top",
              fill: "#f59e0b",
              fontSize: 13,
              fontWeight: 600,
            }}
          />

          {/* Series lines */}
          {chartData.series.map((s) => (
            <Line
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stroke={s.color}
              strokeWidth={expandedGroup === s.name ? 3.5 : 2}
              dot={{ r: expandedGroup === s.name ? 5 : 3, fill: s.color, stroke: s.color }}
              activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
              opacity={expandedGroup && expandedGroup !== s.name ? 0.25 : 1}
              onClick={() => onGroupClick(s.name)}
              style={{ cursor: "pointer" }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Legend with clickable groups */}
      <div className="flex flex-wrap gap-3 justify-center mt-2 px-4">
        {chartData.series.map((s) => (
          <button
            key={s.name}
            onClick={() => onGroupClick(s.name)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              expandedGroup === s.name
                ? "ring-2 ring-white/50 bg-gray-700"
                : expandedGroup
                  ? "opacity-40 hover:opacity-70"
                  : "hover:bg-gray-700/50"
            }`}
          >
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-gray-300">{s.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Quarterly Performance Chart (recent data)
function QuarterlyChart({
  chartData,
  expandedGroup,
}: {
  chartData: RotationChartData;
  expandedGroup: string | null;
}) {
  const quarterly = chartData.quarterly_data;

  // Build unified data array indexed by date
  const dateSet = new Set<string>();
  Object.values(quarterly).forEach((points) => {
    points.forEach((p) => dateSet.add(p.date));
  });
  const dates = Array.from(dateSet).sort();

  const data = dates.map((date) => {
    const point: Record<string, string | number> = { date: date.slice(0, 7) }; // YYYY-MM
    Object.entries(quarterly).forEach(([group, points]) => {
      const match = points.find((p) => p.date === date);
      if (match) point[group] = match.value;
    });

    // If a group is expanded, add individual asset lines
    if (expandedGroup) {
      const series = chartData.series.find((s) => s.name === expandedGroup);
      if (series) {
        series.assets.forEach((asset) => {
          const assetData = chartData.individual_assets[asset];
          if (assetData) {
            const match = assetData.data.find((p) => p.date === date);
            if (match) point[asset] = match.value;
          }
        });
      }
    }

    return point;
  });

  // Determine which series to show
  const showIndividual = expandedGroup && chartData.series.find((s) => s.name === expandedGroup);
  const INDIVIDUAL_COLORS = ["#f472b6", "#fb923c", "#a3e635", "#22d3ee", "#c084fc", "#fbbf24"];

  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <YAxis
          stroke="#9ca3af"
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          domain={["dataMin - 5", "dataMax + 5"]}
          label={{ value: "Relative to SPY (100=start)", angle: -90, position: "insideLeft", fill: "#6b7280", fontSize: 11 }}
        />
        <Tooltip content={<QuarterlyTooltip />} />
        <ReferenceLine y={100} stroke="#6b7280" strokeDasharray="4 4" label={{ value: "Baseline", fill: "#6b7280", fontSize: 11 }} />

        {/* Group area lines */}
        {chartData.series.map((s) => (
          <Area
            key={s.name}
            type="monotone"
            dataKey={s.name}
            stroke={s.color}
            fill={s.color}
            fillOpacity={expandedGroup === s.name ? 0.15 : expandedGroup ? 0.02 : 0.08}
            strokeWidth={expandedGroup === s.name ? 2.5 : expandedGroup ? 1 : 1.5}
            opacity={expandedGroup && expandedGroup !== s.name ? 0.2 : 1}
          />
        ))}

        {/* Individual asset lines when group is expanded */}
        {showIndividual &&
          showIndividual.assets.map((asset, i) => (
            <Line
              key={asset}
              type="monotone"
              dataKey={asset}
              stroke={INDIVIDUAL_COLORS[i % INDIVIDUAL_COLORS.length]}
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}

        <Legend
          wrapperStyle={{ fontSize: 11 }}
          formatter={(value: string) => <span className="text-gray-400 text-xs">{value}</span>}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Expanded Group Detail Panel
function ExpandedGroupPanel({
  group,
  chartData,
  status,
}: {
  group: string;
  chartData: RotationChartData;
  status: RotationStatus | null;
}) {
  const series = chartData.series.find((s) => s.name === group);
  if (!series) return null;

  return (
    <div className="mt-4 p-4 bg-gray-800/70 border border-gray-700 rounded-xl">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: series.color }} />
        <h3 className="text-lg font-semibold text-gray-200">{group}</h3>
        <span className="text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded">{series.role}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {series.assets.map((asset) => {
          const momentum = status?.leaders.find((l) => l.symbol === asset) || status?.laggards.find((l) => l.symbol === asset);
          const assetData = chartData.individual_assets[asset];
          const latestValue = assetData?.data[assetData.data.length - 1]?.value ?? null;
          const change = latestValue ? (latestValue - 100).toFixed(1) : null;

          return (
            <div key={asset} className="p-3 bg-gray-900/60 rounded-lg border border-gray-700/50">
              <div className="font-mono font-semibold text-sm">{asset}</div>
              {assetData && <div className="text-xs text-gray-500">{assetData.name.replace(/ vs SPY$/, "")}</div>}
              {change !== null && (
                <div className={`text-sm font-mono mt-1 ${parseFloat(change) >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {parseFloat(change) >= 0 ? "+" : ""}{change}%
                </div>
              )}
              {momentum && (
                <div className="text-xs text-gray-500 mt-0.5">
                  3m: {momentum.return_3m >= 0 ? "+" : ""}{momentum.return_3m}%
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// "You Are Here" Info Panel
function CycleInfoPanel({ status }: { status: RotationStatus }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
        <div className="text-xs text-gray-500 mb-1">Current Phase</div>
        <div className="text-lg font-semibold text-amber-400">{status.current_phase}</div>
      </div>
      <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
        <div className="text-xs text-gray-500 mb-1">Phase Duration</div>
        <div className="text-lg font-semibold text-white">{status.cycle_detail.phase_duration_days}d</div>
      </div>
      <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
        <div className="text-xs text-gray-500 mb-1">Transition →</div>
        <div className="text-lg font-semibold text-white">{status.cycle_detail.transition_target}</div>
        <div className="text-xs text-gray-500">{status.cycle_detail.transition_probability}% probability</div>
      </div>
      <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
        <div className="text-xs text-gray-500 mb-1">Market Breadth</div>
        <div className="text-lg font-semibold text-white">{status.cycle_detail.breadth_pct.toFixed(0)}%</div>
        <div className="text-xs text-gray-500">{status.cycle_detail.assets_above_sma200}/{status.cycle_detail.total_assets} above SMA200</div>
      </div>
      <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
        <div className="text-xs text-gray-500 mb-1">SPY</div>
        <div className="text-lg font-semibold text-white">${status.spy.price.toFixed(2)}</div>
        <div className="text-xs text-gray-500">{(status.spy.drawdown_from_ath * 100).toFixed(1)}% from ATH</div>
      </div>
    </div>
  );
}

// Sector Leadership Table
function LeadershipTable({ leaders, laggards }: { leaders: LeaderLaggard[]; laggards: LeaderLaggard[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
        <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> Leading Sectors
        </h3>
        <div className="space-y-2">
          {leaders.map((l) => (
            <div key={l.symbol} className="flex items-center justify-between text-sm">
              <span className="font-mono font-semibold">{l.symbol}</span>
              <span className="text-green-400 font-mono">+{l.return_3m.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
        <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
          <TrendingDown className="w-4 h-4" /> Lagging Sectors
        </h3>
        <div className="space-y-2">
          {laggards.map((l) => (
            <div key={l.symbol} className="flex items-center justify-between text-sm">
              <span className="font-mono font-semibold">{l.symbol}</span>
              <span className={`font-mono ${l.return_3m >= 0 ? "text-green-400" : "text-red-400"}`}>
                {l.return_3m >= 0 ? "+" : ""}{l.return_3m.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Role Activation Grid
function RoleActivationGrid({ activation }: { activation: Record<string, RoleActivation> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Object.entries(activation).map(([role, info]) => {
        const config = ROLE_CONFIG[role] || ROLE_CONFIG.all_weather;
        const Icon = config.icon;
        const statusColor = STATUS_COLORS[info.status] || "text-gray-400";

        return (
          <div key={role} className={`p-3 rounded-xl border ${config.border} ${config.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${config.color}`} />
                <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
              </div>
              <span className={`text-xs font-mono ${statusColor}`}>{info.status}</span>
            </div>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {info.assets.map((a) => (
                <span key={a} className="text-xs font-mono bg-gray-900/60 px-1.5 py-0.5 rounded">{a}</span>
              ))}
            </div>
            <div className="text-xs text-gray-500">{info.note}</div>
          </div>
        );
      })}
    </div>
  );
}

// Lead/Lag Rotation Sequence Table
function RotationSequenceTable({ sequence }: { sequence: RotationSequenceItem[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-700/30 transition-colors"
      >
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          📈 Lead/Lag Rotation Sequence
        </h3>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="text-xs text-gray-500 mb-3">Assets ordered by how far they lead/lag SPY at cycle turns</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-700">
                  <th className="text-left py-2 pr-3">#</th>
                  <th className="text-left py-2 pr-3">Asset</th>
                  <th className="text-left py-2 pr-3">Name</th>
                  <th className="text-right py-2 pr-3">Lead/Lag</th>
                  <th className="text-left py-2">Type</th>
                </tr>
              </thead>
              <tbody>
                {sequence.map((item) => (
                  <tr key={item.asset} className="border-b border-gray-800 hover:bg-gray-700/20">
                    <td className="py-2 pr-3 text-gray-500">{item.rank}</td>
                    <td className="py-2 pr-3 font-mono font-semibold">{item.asset}</td>
                    <td className="py-2 pr-3 text-gray-400">{item.name}</td>
                    <td className={`py-2 pr-3 text-right font-mono ${item.lead_lag < 0 ? "text-cyan-400" : item.lead_lag > 0 ? "text-orange-400" : "text-gray-400"}`}>
                      {item.lead_lag > 0 ? "+" : ""}{item.lead_lag}d
                    </td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        item.type === "leading" ? "bg-cyan-500/20 text-cyan-400" :
                        item.type === "lagging" ? "bg-orange-500/20 text-orange-400" :
                        "bg-gray-500/20 text-gray-400"
                      }`}>
                        {item.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Warnings Panel
function WarningsPanel({ warnings }: { warnings: string[] }) {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
      <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm mb-2">
        <AlertTriangle className="w-4 h-4" />
        Rotation Signals
      </div>
      <div className="space-y-1.5">
        {warnings.map((w, i) => (
          <div key={i} className="text-sm text-amber-200/80 flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">•</span>
            <span>{w}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ MAIN PAGE ============

type ViewMode = "cycle" | "quarterly";

export default function RotationPage() {
  const [chartData, setChartData] = useState<RotationChartData | null>(null);
  const [status, setStatus] = useState<RotationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("cycle");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [chartRes, statusRes] = await Promise.all([
        fetch("/data/trading/rotation-chart.json?" + Date.now()),
        fetch("/data/trading/rotation-status.json?" + Date.now()),
      ]);

      if (chartRes.ok) {
        const chartJson = await chartRes.json();
        setChartData(chartJson);
      }
      if (statusRes.ok) {
        const statusJson = await statusRes.json();
        setStatus(statusJson);
      }

      if (!chartRes.ok && !statusRes.ok) {
        setError("Rotation data not yet available");
      } else {
        setError(null);
      }
    } catch {
      setError("Failed to load rotation data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGroupClick = (name: string) => {
    setExpandedGroup((prev) => (prev === name ? null : name));
  };

  // Loading state
  if (loading && !chartData && !status) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <span className="text-gray-400">Loading rotation data...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !chartData && !status) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">{error}</p>
          <div className="flex items-center gap-4 justify-center">
            <Link href="/mre" className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 text-sm">
              ← Back to MRE
            </Link>
            <button onClick={fetchData} className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 text-sm">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
          <div>
            <Link href="/mre" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 mb-2">
              <ArrowLeft className="w-4 h-4" /> Back to MRE Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              🔄 Sector Rotation
            </h1>
            {status && (
              <div className="mt-2">
                <PhaseIndicator phase={status.current_phase} confidence={status.confidence} crashMode={status.crash_mode} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 self-start">
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-sm border border-gray-700"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            {status && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                {status.as_of_date}
              </div>
            )}
          </div>
        </div>

        {/* "You Are Here" Info Cards */}
        {status && (
          <div className="mb-6">
            <CycleInfoPanel status={status} />
          </div>
        )}

        {/* Warnings */}
        {status && <div className="mb-6"><WarningsPanel warnings={status.warnings} /></div>}

        {/* Chart Section */}
        {chartData && (
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 sm:p-6 mb-6">
            {/* View Toggle */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className="text-lg font-semibold text-gray-200">
                {viewMode === "cycle" ? "Business Cycle Overlay" : "Recent Performance (12m)"}
              </h2>
              <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                <button
                  onClick={() => setViewMode("cycle")}
                  className={`px-4 py-1.5 rounded text-xs font-medium transition-colors ${
                    viewMode === "cycle" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Full Cycle
                </button>
                <button
                  onClick={() => setViewMode("quarterly")}
                  className={`px-4 py-1.5 rounded text-xs font-medium transition-colors ${
                    viewMode === "quarterly" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Current Year
                </button>
              </div>
            </div>

            {/* Chart */}
            {viewMode === "cycle" ? (
              <RotationCycleChart chartData={chartData} expandedGroup={expandedGroup} onGroupClick={handleGroupClick} />
            ) : (
              <QuarterlyChart chartData={chartData} expandedGroup={expandedGroup} />
            )}

            {/* Expanded Group Detail */}
            {expandedGroup && (
              <ExpandedGroupPanel group={expandedGroup} chartData={chartData} status={status} />
            )}

            {/* Click hint */}
            <div className="text-center text-xs text-gray-600 mt-3">
              Click a sector group in the legend to expand individual assets
            </div>
          </div>
        )}

        {/* Leadership + Roles Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Sector Leadership */}
          {status && (
            <div>
              <h2 className="text-lg font-semibold text-gray-200 mb-3 flex items-center gap-2">
                📊 Sector Leadership
                <span className="text-xs text-gray-500 font-normal">3-month relative strength</span>
              </h2>
              <LeadershipTable leaders={status.leaders} laggards={status.laggards} />
            </div>
          )}

          {/* Role Activation */}
          {status && (
            <div>
              <h2 className="text-lg font-semibold text-gray-200 mb-3 flex items-center gap-2">
                🎯 Role Activation Status
              </h2>
              <RoleActivationGrid activation={status.role_activation} />
            </div>
          )}
        </div>

        {/* Lead/Lag Table */}
        {chartData && <div className="mb-6"><RotationSequenceTable sequence={chartData.rotation_sequence} /></div>}

        {/* Pattern Label */}
        {status && (
          <div className="text-center text-sm text-gray-500 mb-8">
            Current Pattern: <span className="text-amber-400 font-medium">{status.rotation_pattern}</span>
            {" · "}
            Confidence: <span className="text-gray-300">{status.confidence}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
