"use client";

import { useState, useEffect, useMemo } from "react";
import {
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Beaker,
  Shield,
  Gauge,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  Activity,
  Award,
} from "lucide-react";

// ============ TYPES ============

interface WalkForwardResult {
  oos_win_rate: number;
  oos_sharpe: number;
  oos_avg_return: number;
  oos_trade_count: number;
  windows_tested: number;
}

interface WalkForwardTicker {
  sector: string;
  asset_class: string;
  strategies: Record<string, WalkForwardResult>;
}

interface WalkForwardData {
  generated: string;
  runtime_seconds: number;
  tickers_validated: number;
  results: Record<string, WalkForwardTicker>;
}

interface ParamGridStrategy {
  best_params: Record<string, number>;
  composite_score: number;
  win_rate: number;
  avg_return: number;
  sharpe: number;
  max_drawdown: number;
  trade_count: number;
}

interface ParamGridTicker {
  sector: string;
  asset_class: string;
  best_strategy: string;
  best_composite_score: number;
  strategies: Record<string, ParamGridStrategy>;
}

interface ParamGridData {
  generated: string;
  runtime_seconds: number;
  tickers_optimized: number;
  results: Record<string, ParamGridTicker>;
}

interface MonteCarloTicker {
  sector: string;
  asset_class: string;
  best_strategy: string;
  base_composite_score: number;
  trials: number;
  median_return: number;
  pct_5th: number;
  pct_95th: number;
  consistency_score: number;
  robustness_score: number;
}

interface MonteCarloData {
  generated: string;
  runtime_seconds: number;
  assets_tested: number;
  trials_per_asset: number;
  results: Record<string, MonteCarloTicker>;
}

interface CalibrationTicker {
  confidence_multiplier: number;
  best_strategy: string;
  optimal_params: Record<string, number>;
  confirmation_threshold: number;
  regime_preference: Record<string, string>;
  robustness_score: number;
  walk_forward_oos_wr: number;
  walk_forward_oos_sharpe: number;
  total_trades_25yr: number;
  monte_carlo_median_return: number;
  monte_carlo_5th_pct: number;
  sector: string;
  asset_class: string;
  grid_composite_score: number;
}

interface CalibrationData {
  generated: string;
  synthesis_runtime_seconds: number;
  tickers_calibrated: number;
  summary: {
    avg_confidence: number;
    median_confidence: number;
    avg_robustness: number;
  };
  calibration: Record<string, CalibrationTicker>;
}

interface VersionData {
  signals: string;
  cycle: string;
  pit: string;
  paper: string;
  backtest: string;
  config: string;
}

// ============ HELPERS ============

function scoreColor(val: number, thresholds: [number, number] = [0.5, 0.7]): string {
  if (val >= thresholds[1]) return "text-emerald-400";
  if (val >= thresholds[0]) return "text-amber-400";
  return "text-red-400";
}

function pctColor(val: number): string {
  return val >= 0 ? "text-emerald-400" : "text-red-400";
}

function formatPct(val: number): string {
  return `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`;
}

// ============ SUB COMPONENTS ============

function VersionBadges({ versions }: { versions: VersionData }) {
  const items = [
    { label: "Signals", version: versions.signals, icon: "📡" },
    { label: "Cycle", version: versions.cycle, icon: "🔄" },
    { label: "Pit", version: versions.pit, icon: "⚙️" },
    { label: "Paper", version: versions.paper, icon: "📋" },
    { label: "Backtest", version: versions.backtest, icon: "📊" },
    { label: "Config", version: versions.config, icon: "🔧" },
  ];

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-3">
        <Award className="w-4 h-4 text-primary-400" />
        MRE V13 Semver Versions
      </h3>
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {items.map((item) => (
          <div key={item.label} className="bg-slate-900/50 rounded-lg p-3 text-center">
            <span className="text-lg">{item.icon}</span>
            <div className="text-xs text-slate-500 mt-1">{item.label}</div>
            <div className="text-sm font-mono font-bold text-primary-400 mt-0.5">v{item.version}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalibrationSummary({ data }: { data: CalibrationData }) {
  const tickers = Object.entries(data.calibration).sort(
    ([, a], [, b]) => b.confidence_multiplier - a.confidence_multiplier
  );

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-3">
        <Gauge className="w-4 h-4 text-cyan-400" />
        Calibration Confidence ({data.tickers_calibrated} tickers)
      </h3>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">Avg Confidence</div>
          <div className="text-xl font-bold text-emerald-400">
            {(data.summary.avg_confidence * 100).toFixed(0)}%
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">Median Confidence</div>
          <div className="text-xl font-bold text-emerald-400">
            {(data.summary.median_confidence * 100).toFixed(0)}%
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">Avg Robustness</div>
          <div className="text-xl font-bold text-amber-400">
            {(data.summary.avg_robustness * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Per-ticker table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 uppercase border-b border-slate-700">
              <th className="text-left py-2 px-2">Ticker</th>
              <th className="text-left py-2 px-2">Sector</th>
              <th className="text-right py-2 px-2">Confidence</th>
              <th className="text-right py-2 px-2">Robustness</th>
              <th className="text-left py-2 px-2">Best Strategy</th>
              <th className="text-right py-2 px-2">WF Sharpe</th>
              <th className="text-right py-2 px-2">WF Win Rate</th>
              <th className="text-right py-2 px-2">MC Median</th>
              <th className="text-right py-2 px-2">Trades (25yr)</th>
            </tr>
          </thead>
          <tbody>
            {tickers.map(([symbol, t]) => (
              <tr key={symbol} className="border-b border-slate-800/50 hover:bg-slate-700/20">
                <td className="py-2 px-2 font-mono font-semibold text-slate-200">{symbol}</td>
                <td className="py-2 px-2 text-slate-400 text-xs">{t.sector}</td>
                <td className="py-2 px-2 text-right">
                  <span className={`font-mono font-bold ${scoreColor(t.confidence_multiplier, [0.7, 0.85])}`}>
                    {(t.confidence_multiplier * 100).toFixed(0)}%
                  </span>
                </td>
                <td className="py-2 px-2 text-right">
                  <span className={`font-mono ${scoreColor(t.robustness_score, [0.1, 0.3])}`}>
                    {(t.robustness_score * 100).toFixed(1)}%
                  </span>
                </td>
                <td className="py-2 px-2 text-slate-300 text-xs capitalize">
                  {t.best_strategy.replace(/_/g, " ")}
                </td>
                <td className={`py-2 px-2 text-right font-mono ${pctColor(t.walk_forward_oos_sharpe)}`}>
                  {t.walk_forward_oos_sharpe.toFixed(2)}
                </td>
                <td className={`py-2 px-2 text-right font-mono ${scoreColor(t.walk_forward_oos_wr / 100, [0.5, 0.55])}`}>
                  {t.walk_forward_oos_wr.toFixed(1)}%
                </td>
                <td className={`py-2 px-2 text-right font-mono ${pctColor(t.monte_carlo_median_return)}`}>
                  {formatPct(t.monte_carlo_median_return)}
                </td>
                <td className="py-2 px-2 text-right font-mono text-slate-400">
                  {t.total_trades_25yr.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WalkForwardSection({ data }: { data: WalkForwardData }) {
  const [expanded, setExpanded] = useState(false);

  // Aggregate stats
  const allResults = Object.entries(data.results).flatMap(([symbol, t]) =>
    Object.entries(t.strategies).map(([strategy, r]) => ({ symbol, strategy, ...r }))
  );

  const avgSharpe = allResults.reduce((s, r) => s + r.oos_sharpe, 0) / allResults.length;
  const avgWinRate = allResults.reduce((s, r) => s + r.oos_win_rate, 0) / allResults.length;
  const totalTrades = allResults.reduce((s, r) => s + r.oos_trade_count, 0);

  // Top performers: best Sharpe per ticker
  const topByTicker = Object.entries(data.results)
    .map(([symbol, t]) => {
      const best = Object.entries(t.strategies).sort(([, a], [, b]) => b.oos_sharpe - a.oos_sharpe)[0];
      return { symbol, strategy: best[0], ...best[1], sector: t.sector };
    })
    .sort((a, b) => b.oos_sharpe - a.oos_sharpe);

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <Beaker className="w-4 h-4 text-violet-400" />
          Walk-Forward Validation ({data.tickers_validated} tickers, 24 OOS windows)
        </h3>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {/* Always-visible summary */}
      <div className="grid grid-cols-3 gap-3 mt-3">
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">Avg OOS Sharpe</div>
          <div className={`text-xl font-bold ${pctColor(avgSharpe)}`}>{avgSharpe.toFixed(2)}</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">Avg OOS Win Rate</div>
          <div className={`text-xl font-bold ${scoreColor(avgWinRate / 100, [0.5, 0.55])}`}>
            {avgWinRate.toFixed(1)}%
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">Total OOS Trades</div>
          <div className="text-xl font-bold text-slate-200">{totalTrades.toLocaleString()}</div>
        </div>
      </div>

      {/* Expanded: top performers table */}
      {expanded && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 uppercase border-b border-slate-700">
                <th className="text-left py-2 px-2">Ticker</th>
                <th className="text-left py-2 px-2">Sector</th>
                <th className="text-left py-2 px-2">Best Strategy</th>
                <th className="text-right py-2 px-2">OOS Sharpe</th>
                <th className="text-right py-2 px-2">OOS Win Rate</th>
                <th className="text-right py-2 px-2">Avg Return</th>
                <th className="text-right py-2 px-2">OOS Trades</th>
              </tr>
            </thead>
            <tbody>
              {topByTicker.map((t) => (
                <tr key={t.symbol} className="border-b border-slate-800/50 hover:bg-slate-700/20">
                  <td className="py-2 px-2 font-mono font-semibold text-slate-200">{t.symbol}</td>
                  <td className="py-2 px-2 text-slate-400 text-xs">{t.sector}</td>
                  <td className="py-2 px-2 text-slate-300 text-xs capitalize">{t.strategy.replace(/_/g, " ")}</td>
                  <td className={`py-2 px-2 text-right font-mono font-bold ${pctColor(t.oos_sharpe)}`}>
                    {t.oos_sharpe.toFixed(3)}
                  </td>
                  <td className={`py-2 px-2 text-right font-mono ${scoreColor(t.oos_win_rate / 100, [0.5, 0.55])}`}>
                    {t.oos_win_rate.toFixed(1)}%
                  </td>
                  <td className={`py-2 px-2 text-right font-mono ${pctColor(t.oos_avg_return)}`}>
                    {formatPct(t.oos_avg_return)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-slate-400">{t.oos_trade_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ParamGridSection({ data }: { data: ParamGridData }) {
  const [expanded, setExpanded] = useState(false);

  const tickers = Object.entries(data.results)
    .sort(([, a], [, b]) => b.best_composite_score - a.best_composite_score);

  const avgComposite = tickers.reduce((s, [, t]) => s + t.best_composite_score, 0) / tickers.length;

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-400" />
          Parameter Grid Search ({data.tickers_optimized} tickers)
        </h3>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">Avg Composite Score</div>
          <div className="text-xl font-bold text-amber-400">{avgComposite.toFixed(3)}</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">Runtime</div>
          <div className="text-xl font-bold text-slate-300">{data.runtime_seconds.toFixed(1)}s</div>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 uppercase border-b border-slate-700">
                <th className="text-left py-2 px-2">Ticker</th>
                <th className="text-left py-2 px-2">Best Strategy</th>
                <th className="text-right py-2 px-2">Composite</th>
                <th className="text-right py-2 px-2">Win Rate</th>
                <th className="text-right py-2 px-2">Sharpe</th>
                <th className="text-right py-2 px-2">Max DD</th>
                <th className="text-left py-2 px-2">Optimal Params</th>
              </tr>
            </thead>
            <tbody>
              {tickers.map(([symbol, t]) => {
                const bestStrat = t.strategies[t.best_strategy];
                return (
                  <tr key={symbol} className="border-b border-slate-800/50 hover:bg-slate-700/20">
                    <td className="py-2 px-2 font-mono font-semibold text-slate-200">{symbol}</td>
                    <td className="py-2 px-2 text-slate-300 text-xs capitalize">{t.best_strategy.replace(/_/g, " ")}</td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-amber-400">{t.best_composite_score.toFixed(3)}</td>
                    <td className={`py-2 px-2 text-right font-mono ${scoreColor((bestStrat?.win_rate ?? 0) / 100, [0.5, 0.55])}`}>
                      {bestStrat?.win_rate.toFixed(1)}%
                    </td>
                    <td className={`py-2 px-2 text-right font-mono ${pctColor(bestStrat?.sharpe ?? 0)}`}>
                      {bestStrat?.sharpe.toFixed(3)}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-red-400">
                      {bestStrat?.max_drawdown.toFixed(1)}%
                    </td>
                    <td className="py-2 px-2 text-xs text-slate-400">
                      {bestStrat?.best_params
                        ? Object.entries(bestStrat.best_params)
                            .map(([k, v]) => `${k}=${v}`)
                            .join(", ")
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MonteCarloSection({ data }: { data: MonteCarloData }) {
  const [expanded, setExpanded] = useState(false);

  const tickers = Object.entries(data.results)
    .sort(([, a], [, b]) => b.robustness_score - a.robustness_score);

  const avgRobustness = tickers.reduce((s, [, t]) => s + t.robustness_score, 0) / tickers.length;
  const avgConsistency = tickers.reduce((s, [, t]) => s + t.consistency_score, 0) / tickers.length;

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          Monte Carlo Robustness ({data.assets_tested} assets, {data.trials_per_asset} trials each)
        </h3>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">Avg Robustness</div>
          <div className={`text-xl font-bold ${scoreColor(avgRobustness, [0.1, 0.25])}`}>
            {(avgRobustness * 100).toFixed(1)}%
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">Avg Consistency</div>
          <div className={`text-xl font-bold ${scoreColor(avgConsistency, [0.1, 0.25])}`}>
            {(avgConsistency * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 uppercase border-b border-slate-700">
                <th className="text-left py-2 px-2">Ticker</th>
                <th className="text-left py-2 px-2">Best Strategy</th>
                <th className="text-right py-2 px-2">Robustness</th>
                <th className="text-right py-2 px-2">Consistency</th>
                <th className="text-right py-2 px-2">Median Return</th>
                <th className="text-right py-2 px-2">5th %ile</th>
                <th className="text-right py-2 px-2">95th %ile</th>
              </tr>
            </thead>
            <tbody>
              {tickers.map(([symbol, t]) => (
                <tr key={symbol} className="border-b border-slate-800/50 hover:bg-slate-700/20">
                  <td className="py-2 px-2 font-mono font-semibold text-slate-200">{symbol}</td>
                  <td className="py-2 px-2 text-slate-300 text-xs capitalize">{t.best_strategy.replace(/_/g, " ")}</td>
                  <td className={`py-2 px-2 text-right font-mono font-bold ${scoreColor(t.robustness_score, [0.1, 0.3])}`}>
                    {(t.robustness_score * 100).toFixed(1)}%
                  </td>
                  <td className={`py-2 px-2 text-right font-mono ${scoreColor(t.consistency_score, [0.1, 0.25])}`}>
                    {(t.consistency_score * 100).toFixed(1)}%
                  </td>
                  <td className={`py-2 px-2 text-right font-mono ${pctColor(t.median_return)}`}>
                    {formatPct(t.median_return)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-red-400">{formatPct(t.pct_5th)}</td>
                  <td className="py-2 px-2 text-right font-mono text-emerald-400">{formatPct(t.pct_95th)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============ MAIN COMPONENT ============

export default function OptimizerResults() {
  const [walkForward, setWalkForward] = useState<WalkForwardData | null>(null);
  const [paramGrid, setParamGrid] = useState<ParamGridData | null>(null);
  const [monteCarlo, setMonteCarlo] = useState<MonteCarloData | null>(null);
  const [calibration, setCalibration] = useState<CalibrationData | null>(null);
  const [versions, setVersions] = useState<VersionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const ts = Date.now();
      const [wfRes, pgRes, mcRes, calRes, verRes] = await Promise.all([
        fetch(`/data/trading/optimization/walk_forward.json?${ts}`),
        fetch(`/data/trading/optimization/param_grid.json?${ts}`),
        fetch(`/data/trading/optimization/monte_carlo.json?${ts}`),
        fetch(`/data/trading/optimization/calibration_20260210.json?${ts}`),
        fetch(`/data/trading/mre-versions.json?${ts}`),
      ]);

      if (!wfRes.ok || !pgRes.ok || !mcRes.ok || !calRes.ok || !verRes.ok) {
        throw new Error("Failed to load one or more optimizer files");
      }

      setWalkForward(await wfRes.json());
      setParamGrid(await pgRes.json());
      setMonteCarlo(await mcRes.json());
      setCalibration(await calRes.json());
      setVersions(await verRes.json());
    } catch (e) {
      setError("Failed to load optimizer results");
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

  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-300">{error}</p>
          <button onClick={fetchAll} className="mt-4 px-4 py-2 bg-primary-600 rounded-lg text-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-900/30 to-cyan-900/30 rounded-xl p-4 border border-violet-700/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Zap className="w-5 h-5 text-violet-400" />
              V13 Universe Optimizer — 5-Phase Quant Pipeline
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Walk-forward validation → Parameter grid search → Regime-conditional analysis → Monte Carlo robustness → Final calibration
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

      {/* Version Badges */}
      {versions && <VersionBadges versions={versions} />}

      {/* Calibration (always visible — most important) */}
      {calibration && <CalibrationSummary data={calibration} />}

      {/* Walk Forward (collapsible) */}
      {walkForward && <WalkForwardSection data={walkForward} />}

      {/* Param Grid (collapsible) */}
      {paramGrid && <ParamGridSection data={paramGrid} />}

      {/* Monte Carlo (collapsible) */}
      {monteCarlo && <MonteCarloSection data={monteCarlo} />}

      {/* Pipeline metadata */}
      <div className="bg-slate-800/30 rounded-lg p-3 text-xs text-slate-500 text-center">
        Pipeline generated: {calibration?.generated ? new Date(calibration.generated).toLocaleString() : "—"} ·
        Total runtime: {((walkForward?.runtime_seconds ?? 0) + (paramGrid?.runtime_seconds ?? 0) + (monteCarlo?.runtime_seconds ?? 0) + (calibration?.synthesis_runtime_seconds ?? 0)).toFixed(1)}s
      </div>
    </div>
  );
}
