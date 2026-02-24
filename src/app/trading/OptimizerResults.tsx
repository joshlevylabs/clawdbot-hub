"use client";

import { useState, useEffect } from "react";
import {
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Clock,
  ShieldAlert,
  Activity,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ============ TYPES ============

interface StrategyMetrics {
  name: string;
  version: string;
  lastAccuracy: number;
  lastSharpe: number;
  lastWinRate: number;
  profitFactor: number;
  improvements: string;
  optimalParams: Record<string, number>;
}

interface BacktestSummary {
  lastRun: string;
  backtesterVersion: string;
  universeSize: number;
  coreAssets: number;
  lookbackYears: number;
  runtime_seconds: number;
  tickers_calibrated: number;
  strategies: Record<string, StrategyMetrics>;
}

interface OptimizerRun {
  id: string;
  date: string;
  runtime_seconds: number;
  strategies_optimized: string[];
  changes: {
    strategy: string;
    metric: string;
    before: number;
    after: number;
    delta: number;
  }[];
  net_improvement: number;
  notes: string;
}

interface OptimizerRunsData {
  generated: string;
  runs: OptimizerRun[];
}

// ============ HELPERS ============

function deltaIcon(delta: number) {
  if (delta > 0.001) return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (delta < -0.001) return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-slate-500" />;
}

function deltaColor(delta: number): string {
  if (delta > 0.001) return "text-emerald-400";
  if (delta < -0.001) return "text-red-400";
  return "text-slate-500";
}

function formatMetric(val: number, isPercent: boolean = false): string {
  if (isPercent) return `${(val * 100).toFixed(1)}%`;
  return val.toFixed(2);
}

function healthScore(strategies: Record<string, StrategyMetrics>): {
  score: number;
  label: string;
  color: string;
} {
  const strats = Object.values(strategies);
  if (strats.length === 0) return { score: 0, label: "No Data", color: "text-slate-500" };

  // Weighted score: accuracy (35%), win rate (30%), profit factor (20%), sharpe (15%)
  const avgAccuracy = strats.reduce((s, st) => s + st.lastAccuracy, 0) / strats.length;
  const avgSharpe = strats.reduce((s, st) => s + st.lastSharpe, 0) / strats.length;
  const avgWinRate = strats.reduce((s, st) => s + st.lastWinRate, 0) / strats.length;
  const avgPF = strats.reduce((s, st) => s + Math.min(st.profitFactor, 5), 0) / strats.length;

  // Normalize each to 0-100
  // Accuracy: already 0-100 scale
  const accScore = Math.min(100, avgAccuracy);
  // Sharpe: per-trade Sharpe from backtests typically 0.05-0.30; 0.15+ is good, 0.25+ is excellent
  const sharpeScore = Math.min(100, avgSharpe * 333); // 0.30 sharpe = 100
  // Win rate: 0-1 scale, 0.55+ is good
  const wrScore = avgWinRate * 100;
  // Profit factor: 2.0+ is good, 3.0+ is excellent
  const pfScore = Math.min(100, avgPF * 33); // 3.0 PF = 100

  const score = Math.round(accScore * 0.35 + wrScore * 0.30 + pfScore * 0.20 + sharpeScore * 0.15);

  if (score >= 75) return { score, label: "Excellent", color: "text-emerald-400" };
  if (score >= 55) return { score, label: "Good", color: "text-amber-400" };
  return { score, label: "Needs Work", color: "text-red-400" };
}

// ============ MAIN COMPONENT ============

export default function OptimizerResults() {
  const [summary, setSummary] = useState<BacktestSummary | null>(null);
  const [optimizerRuns, setOptimizerRuns] = useState<OptimizerRunsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasRunHistory, setHasRunHistory] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const ts = Date.now();

      // Always fetch backtest summary
      const summaryRes = await fetch(`/data/trading/backtest-summary.json?${ts}`);
      if (!summaryRes.ok) throw new Error("Failed to load backtest summary");
      const summaryData: BacktestSummary = await summaryRes.json();
      setSummary(summaryData);

      // Try to fetch optimizer runs (may not exist yet)
      try {
        const runsRes = await fetch(`/data/trading/optimization/optimizer-runs.json?${ts}`);
        if (runsRes.ok) {
          const runsData: OptimizerRunsData = await runsRes.json();
          setOptimizerRuns(runsData);
          setHasRunHistory(true);
        } else {
          setHasRunHistory(false);
        }
      } catch {
        setHasRunHistory(false);
      }
    } catch (e) {
      setError("Failed to load optimizer data");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-300">{error || "No data available"}</p>
          <button onClick={fetchAll} className="mt-4 px-4 py-2 bg-primary-600 rounded-lg text-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const strategies = summary.strategies;
  const health = healthScore(strategies);
  const lastRunDate = new Date(summary.lastRun);
  const degradedStrategies = Object.entries(strategies).filter(
    ([, s]) => s.lastSharpe < 0.05 || s.lastWinRate < 0.45
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-900/30 to-emerald-900/30 rounded-xl p-4 border border-violet-700/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Zap className="w-5 h-5 text-violet-400" />
              Optimization Improvement Tracker
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              How is the optimizer improving our trading system?
            </p>
          </div>
          <button
            onClick={fetchAll}
            className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Overnight Summary + System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Last Run Info */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <h3 className="text-xs text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            Last Optimization Run
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Date</span>
              <span className="text-slate-200 text-sm font-mono">
                {lastRunDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Runtime</span>
              <span className="text-slate-200 text-sm font-mono">
                {summary.runtime_seconds.toFixed(1)}s
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Universe</span>
              <span className="text-slate-200 text-sm font-mono">
                {summary.universeSize} tickers
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Backtester</span>
              <span className="text-slate-200 text-sm font-mono">
                v{summary.backtesterVersion}
              </span>
            </div>
          </div>
        </div>

        {/* System Health Score */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 flex flex-col items-center justify-center">
          <h3 className="text-xs text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" />
            System Health Score
          </h3>
          <div className={`text-5xl font-bold ${health.color}`}>{health.score}</div>
          <div className={`text-sm font-medium mt-1 ${health.color}`}>{health.label}</div>
          <div className="text-xs text-slate-600 mt-2">
            Across {Object.keys(strategies).length} strategies
          </div>
        </div>

        {/* Strategies Count */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <h3 className="text-xs text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" />
            Strategy Overview
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Active Strategies</span>
              <span className="text-slate-200 text-sm font-bold">{Object.keys(strategies).length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Calibrated Tickers</span>
              <span className="text-slate-200 text-sm font-mono">{summary.tickers_calibrated}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Lookback</span>
              <span className="text-slate-200 text-sm font-mono">{summary.lookbackYears} years</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Core Assets</span>
              <span className="text-slate-200 text-sm font-mono">{summary.coreAssets}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Degradation Alerts */}
      {degradedStrategies.length > 0 && (
        <div className="bg-red-900/20 rounded-xl p-4 border border-red-500/30">
          <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4" />
            Degradation Warnings ({degradedStrategies.length})
          </h3>
          <div className="space-y-2">
            {degradedStrategies.map(([key, s]) => (
              <div key={key} className="flex items-center justify-between bg-red-900/10 rounded-lg p-3">
                <div>
                  <span className="text-sm font-medium text-red-300">{s.name}</span>
                  <span className="text-xs text-red-400/70 ml-2">v{s.version}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  {s.lastSharpe < 0.05 && (
                    <span className="text-red-400">Sharpe: {s.lastSharpe.toFixed(3)} ⚠️</span>
                  )}
                  {s.lastWinRate < 0.45 && (
                    <span className="text-red-400">Win Rate: {(s.lastWinRate * 100).toFixed(1)}% ⚠️</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategy Improvement Dashboard */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          Strategy Performance Dashboard
        </h3>
        <div className="space-y-3">
          {Object.entries(strategies).map(([key, strat]) => (
            <div key={key} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/30">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">{strat.name}</h4>
                  <span className="text-xs text-slate-500">v{strat.version}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    strat.lastAccuracy >= 70 ? "bg-emerald-900/50 text-emerald-400" :
                    strat.lastAccuracy >= 50 ? "bg-amber-900/50 text-amber-400" :
                    "bg-red-900/50 text-red-400"
                  }`}>
                    {strat.lastAccuracy.toFixed(1)}% accuracy
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="text-center">
                  <div className="text-xs text-slate-500 mb-1">Win Rate</div>
                  <div className={`text-lg font-bold ${
                    strat.lastWinRate >= 0.6 ? "text-emerald-400" :
                    strat.lastWinRate >= 0.5 ? "text-amber-400" :
                    "text-red-400"
                  }`}>
                    {(strat.lastWinRate * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-500 mb-1">Sharpe</div>
                  <div className={`text-lg font-bold ${
                    strat.lastSharpe >= 0.5 ? "text-emerald-400" :
                    strat.lastSharpe >= 0.1 ? "text-amber-400" :
                    "text-red-400"
                  }`}>
                    {strat.lastSharpe.toFixed(3)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-500 mb-1">Profit Factor</div>
                  <div className={`text-lg font-bold ${
                    strat.profitFactor >= 2 ? "text-emerald-400" :
                    strat.profitFactor >= 1.5 ? "text-amber-400" :
                    "text-red-400"
                  }`}>
                    {strat.profitFactor.toFixed(2)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-500 mb-1">Accuracy</div>
                  <div className={`text-lg font-bold ${
                    strat.lastAccuracy >= 70 ? "text-emerald-400" :
                    strat.lastAccuracy >= 50 ? "text-amber-400" :
                    "text-red-400"
                  }`}>
                    {strat.lastAccuracy.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Recent improvements note */}
              {strat.improvements && (
                <div className="mt-3 pt-3 border-t border-slate-700/30">
                  <p className="text-xs text-slate-400">
                    <span className="text-emerald-400 font-medium">Latest improvements:</span>{" "}
                    {strat.improvements}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Optimization History */}
      {hasRunHistory && optimizerRuns && optimizerRuns.runs.length > 0 ? (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <button
            onClick={() => setHistoryExpanded(!historyExpanded)}
            className="w-full flex items-center justify-between"
          >
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-400" />
              Optimization Run History ({optimizerRuns.runs.length} runs)
            </h3>
            {historyExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {/* Summary always visible */}
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="bg-slate-900/50 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500">Total Runs</div>
              <div className="text-xl font-bold text-violet-400">{optimizerRuns.runs.length}</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500">Avg Net Improvement</div>
              <div className={`text-xl font-bold ${
                (optimizerRuns.runs.reduce((s, r) => s + r.net_improvement, 0) / optimizerRuns.runs.length) >= 0
                  ? "text-emerald-400" : "text-red-400"
              }`}>
                {((optimizerRuns.runs.reduce((s, r) => s + r.net_improvement, 0) / optimizerRuns.runs.length) * 100).toFixed(2)}%
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500">Latest Run</div>
              <div className="text-lg font-bold text-slate-200">
                {new Date(optimizerRuns.runs[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            </div>
          </div>

          {historyExpanded && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase border-b border-slate-700">
                    <th className="text-left py-2 px-2">Date</th>
                    <th className="text-left py-2 px-2">Strategies</th>
                    <th className="text-right py-2 px-2">Runtime</th>
                    <th className="text-right py-2 px-2">Changes</th>
                    <th className="text-right py-2 px-2">Net Improvement</th>
                    <th className="text-left py-2 px-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {optimizerRuns.runs.map((run) => (
                    <tr key={run.id} className="border-b border-slate-800/50 hover:bg-slate-700/20">
                      <td className="py-2 px-2 font-mono text-slate-300">
                        {new Date(run.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                      <td className="py-2 px-2 text-xs text-slate-400">
                        {run.strategies_optimized.join(", ")}
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-slate-400">
                        {run.runtime_seconds.toFixed(1)}s
                      </td>
                      <td className="py-2 px-2 text-right font-mono text-slate-300">
                        {run.changes.length}
                      </td>
                      <td className={`py-2 px-2 text-right font-mono font-bold ${deltaColor(run.net_improvement)}`}>
                        {run.net_improvement >= 0 ? "+" : ""}{(run.net_improvement * 100).toFixed(2)}%
                        <span className="ml-1">{deltaIcon(run.net_improvement) && (run.net_improvement > 0 ? "↑" : run.net_improvement < 0 ? "↓" : "→")}</span>
                      </td>
                      <td className="py-2 px-2 text-xs text-slate-500 max-w-[200px] truncate">
                        {run.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Placeholder when no run history exists */
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 border-dashed">
          <div className="text-center">
            <Clock className="w-8 h-8 text-violet-400/50 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-300 mb-2">
              Optimization Run History
            </h3>
            <p className="text-sm text-slate-500 max-w-lg mx-auto">
              Optimization run history will appear here after the next overnight optimization cycle.
              Current system metrics from the latest backtest are shown above as a baseline.
            </p>
            <p className="text-xs text-slate-600 mt-3">
              When the optimizer runs, it will log parameter changes, before/after metrics, and net
              improvement for each strategy — building a timeline of how the system improves over time.
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-slate-800/30 rounded-lg p-3 text-xs text-slate-500 text-center">
        Backtest summary generated: {lastRunDate.toLocaleString()} ·
        Backtester v{summary.backtesterVersion} ·
        {summary.universeSize} tickers · {summary.lookbackYears}yr lookback
      </div>
    </div>
  );
}
