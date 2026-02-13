"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Activity, Target, TrendingUp, Loader2 } from "lucide-react";
import { FibonacciAnalysisContent } from "@/components/FibonacciModal";

// ===== Types =====

interface MRESignalData {
  asset_class: string;
  symbol: string;
  signal: string;
  signal_strength: number;
  price: number;
  regime: string;
  hold_days: number;
  expected_sharpe: number;
  expected_accuracy: number;
  fibonacci: {
    nearest_support: number;
    nearest_resistance: number;
    entry_zone: string;
    profit_targets: number[];
    retracements: Record<string, number>;
    extensions: Record<string, number>;
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
    current_price: number;
  };
  regime_details: {
    regime: string;
    confidence: number;
    momentum_20d: number;
    regime_stage: string;
    regime_days: number;
    predicted_remaining_days: number;
    above_ema_20?: boolean;
    above_ema_50?: boolean;
    above_ema_200?: boolean;
    ema_spread_pct?: number;
  };
}

interface PitRecommendation {
  pit_verdict: string;
  accuracy: string;
  sharpe: number;
  best_horizon: string;
  sma_period: number;
  notes: string;
  pattern: string;
}

interface PitData {
  generated: string;
  version: string;
  global_context: {
    regime: string;
    fear_greed: number;
    thesis: string;
    key_risks: string[];
  };
  assets: Record<string, PitRecommendation>;
}

interface SignalAnalysisModalProps {
  symbol: string;
  onClose: () => void;
}

// ===== Helpers =====

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ===== Main Component =====

export default function SignalAnalysisModal({ symbol, onClose }: SignalAnalysisModalProps) {
  const [signal, setSignal] = useState<MRESignalData | null>(null);
  const [pitData, setPitData] = useState<PitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      try {
        setLoading(true);
        setError(null);

        // Fetch MRE signals and pit fleet in parallel
        const [signalsRes, universeRes, pitRes] = await Promise.all([
          fetch("/data/trading/mre-signals.json"),
          fetch("/data/trading/mre-signals-universe.json"),
          fetch("/data/trading/pit-fleet-recommendations.json"),
        ]);

        if (cancelled) return;

        // Try main signals first, then universe
        let matchedSignal: MRESignalData | null = null;

        if (signalsRes.ok) {
          const signalsJson = await signalsRes.json();
          const signals: MRESignalData[] = signalsJson.signals || signalsJson;
          matchedSignal = signals.find((s) => s.symbol === symbol) || null;
        }

        if (!matchedSignal && universeRes.ok) {
          const universeJson = await universeRes.json();
          const universeSignals: MRESignalData[] = universeJson.signals || universeJson;
          matchedSignal = universeSignals.find((s) => s.symbol === symbol) || null;
        }

        if (!matchedSignal) {
          if (!cancelled) setError(`No MRE signal data found for ${symbol}`);
          if (!cancelled) setLoading(false);
          return;
        }

        if (!cancelled) setSignal(matchedSignal);

        // Pit fleet data (optional)
        if (pitRes.ok) {
          const pitJson: PitData = await pitRes.json();
          if (!cancelled) setPitData(pitJson);
        }

        if (!cancelled) setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load signal data");
          setLoading(false);
        }
      }
    }
    fetchAll();
    return () => { cancelled = true; };
  }, [symbol]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose]
  );
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const pitRec = pitData?.assets?.[symbol] || null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-lg">🔬</span>
            <h2 className="text-xl font-bold text-slate-100">
              {symbol} Signal Analysis
            </h2>
            {signal && (
              <>
                <span className="text-sm font-mono text-slate-400">
                  ${formatCurrency(signal.price)}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-lg border font-bold ${
                  signal.signal === "BUY"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                    : signal.signal === "HOLD"
                    ? "bg-slate-500/20 text-slate-400 border-slate-500/50"
                    : "bg-cyan-500/20 text-cyan-400 border-cyan-500/50"
                }`}>
                  {signal.signal}
                </span>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                <span className="text-sm text-slate-500">Loading signal analysis for {symbol}…</span>
              </div>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex items-center justify-center py-24">
              <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
                <p className="text-red-300">{error}</p>
              </div>
            </div>
          )}

          {/* Loaded */}
          {!loading && !error && signal && (
            <div className="space-y-6 pt-4">

              {/* ═══════════ SECTION 1: MRE Signal Analysis ═══════════ */}
              <div className="bg-slate-850 rounded-xl border border-primary-500/30 overflow-hidden">
                {/* Header */}
                <div className="bg-primary-600/20 border-b border-primary-500/30 px-4 py-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary-400" />
                  <span className="font-semibold text-slate-100">MRE Signal Analysis</span>
                  <span className={`ml-auto inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-xs font-bold ${
                    signal.signal === "BUY"
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                      : signal.signal === "HOLD"
                      ? "bg-slate-500/20 text-slate-400 border-slate-500/50"
                      : "bg-cyan-500/20 text-cyan-400 border-cyan-500/50"
                  }`}>
                    {signal.signal}
                  </span>
                </div>

                <div className="p-4 space-y-4">
                  {/* 6 Metric Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Confidence</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              signal.regime_details.confidence >= 70 ? "bg-emerald-500"
                              : signal.regime_details.confidence >= 50 ? "bg-amber-500"
                              : "bg-red-500"
                            }`}
                            style={{ width: `${signal.regime_details.confidence}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-slate-200">{signal.regime_details.confidence}%</span>
                      </div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Expected Sharpe</p>
                      <p className={`text-lg font-bold ${signal.expected_sharpe >= 1 ? "text-emerald-400" : "text-amber-400"}`}>
                        {signal.expected_sharpe.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Expected Accuracy</p>
                      <p className={`text-lg font-bold ${signal.expected_accuracy >= 60 ? "text-emerald-400" : "text-amber-400"}`}>
                        {signal.expected_accuracy.toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Hold Days</p>
                      <p className="text-lg font-bold text-slate-200">{signal.hold_days}d</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Signal Strength</p>
                      <p className="text-lg font-bold text-slate-200">{(signal.signal_strength * 100).toFixed(0)}%</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Regime</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-medium capitalize ${
                        signal.regime_details.regime === "bull"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                          : signal.regime_details.regime === "bear"
                          ? "bg-red-500/20 text-red-400 border-red-500/40"
                          : "bg-amber-500/20 text-amber-400 border-amber-500/40"
                      }`}>
                        {signal.regime_details.regime === "bull" ? "🟢" : signal.regime_details.regime === "bear" ? "🔴" : "🟡"} {signal.regime_details.regime}
                      </span>
                    </div>
                  </div>

                  {/* MRE Fibonacci Zones */}
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
                      <Target className="w-3.5 h-3.5" /> MRE Fibonacci Zones
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Entry Zone</p>
                        <p className="text-slate-200 font-mono">${signal.fibonacci.entry_zone}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Nearest Support</p>
                        <p className="text-emerald-400 font-mono">${signal.fibonacci.nearest_support.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Nearest Resistance</p>
                        <p className="text-red-400 font-mono">${signal.fibonacci.nearest_resistance.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Profit Targets</p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {signal.fibonacci.profit_targets.map((t, i) => (
                            <span key={i} className="text-emerald-400 font-mono text-xs bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              ${t.toFixed(2)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Regime Details */}
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5" /> Regime Details
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Regime Duration</p>
                        <p className="text-slate-200">{signal.regime_details.regime_days} days</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Regime Stage</p>
                        <p className="text-slate-200 capitalize">{signal.regime_details.regime_stage}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Predicted Remaining</p>
                        <p className="text-slate-200">{signal.regime_details.predicted_remaining_days}d</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">20d Momentum</p>
                        <p className={`font-mono ${signal.regime_details.momentum_20d >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {signal.regime_details.momentum_20d >= 0 ? "+" : ""}{signal.regime_details.momentum_20d.toFixed(2)}%
                        </p>
                      </div>
                      {signal.regime_details.ema_spread_pct !== undefined && (
                        <div>
                          <p className="text-xs text-slate-500">EMA Spread</p>
                          <p className="text-slate-200 font-mono">{signal.regime_details.ema_spread_pct.toFixed(2)}%</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-slate-500">EMA Position</p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {signal.regime_details.above_ema_20 !== undefined && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${signal.regime_details.above_ema_20 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                              {signal.regime_details.above_ema_20 ? "↑" : "↓"} EMA20
                            </span>
                          )}
                          {signal.regime_details.above_ema_50 !== undefined && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${signal.regime_details.above_ema_50 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                              {signal.regime_details.above_ema_50 ? "↑" : "↓"} EMA50
                            </span>
                          )}
                          {signal.regime_details.above_ema_200 !== undefined && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${signal.regime_details.above_ema_200 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                              {signal.regime_details.above_ema_200 ? "↑" : "↓"} EMA200
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pit Agent Fleet Recommendation */}
                  {pitRec && (
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-amber-500/20">
                      <h4 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
                        🤖 Pit Agent Fleet — {symbol}
                      </h4>

                      {/* Verdict */}
                      <div className="mb-3 p-3 rounded-lg bg-slate-800/80 border border-slate-700">
                        <p className="text-sm font-bold text-slate-100">{pitRec.pit_verdict}</p>
                      </div>

                      {/* Key Metrics */}
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-slate-500 uppercase">Backtest Accuracy</p>
                          <p className="text-sm font-bold text-slate-200">{pitRec.accuracy}</p>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-slate-500 uppercase">Backtest Sharpe</p>
                          <p className={`text-sm font-bold ${pitRec.sharpe >= 15 ? "text-emerald-400" : pitRec.sharpe >= 10 ? "text-amber-400" : "text-red-400"}`}>
                            {pitRec.sharpe.toFixed(2)}
                          </p>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-slate-500 uppercase">Optimal Hold</p>
                          <p className="text-sm font-bold text-slate-200">{pitRec.best_horizon}</p>
                        </div>
                      </div>

                      {/* Pattern Recognition */}
                      <div className="mb-3">
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Pattern Recognition</p>
                        <p className="text-sm text-slate-300">{pitRec.pattern}</p>
                      </div>

                      {/* Analyst Notes */}
                      <div className="mb-3">
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Analyst Notes</p>
                        <p className="text-sm text-slate-300">{pitRec.notes}</p>
                      </div>

                      {/* Global Context */}
                      {pitData?.global_context && (
                        <div className="mt-3 pt-3 border-t border-slate-700">
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Market Thesis (MRE {pitData.version})</p>
                          <p className="text-xs text-slate-400 italic">{pitData.global_context.thesis}</p>
                          {pitData.global_context.key_risks.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-red-400/70 uppercase tracking-wide mb-1">Key Risks</p>
                              <ul className="text-xs text-slate-500 space-y-0.5">
                                {pitData.global_context.key_risks.map((risk, i) => (
                                  <li key={i} className="flex items-start gap-1">
                                    <span className="text-red-400/50 mt-0.5">⚠</span> {risk}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ═══════════ SECTION 2: Fibonacci Chart & Analysis ═══════════ */}
              {signal.fibonacci && signal.fibonacci.retracements && (
                <div className="bg-slate-850 rounded-xl border border-indigo-500/30 overflow-hidden">
                  <div className="bg-indigo-600/20 border-b border-indigo-500/30 px-4 py-3 flex items-center gap-2">
                    <span className="text-lg">📐</span>
                    <span className="font-semibold text-slate-100">Fibonacci Chart & Levels</span>
                    <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-md border font-medium uppercase tracking-wide ${
                      signal.fibonacci.trend === "uptrend"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : signal.fibonacci.trend === "downtrend"
                        ? "bg-red-500/20 text-red-400 border-red-500/40"
                        : "bg-amber-500/20 text-amber-400 border-amber-500/40"
                    }`}>
                      {signal.fibonacci.trend}
                    </span>
                  </div>
                  <div className="p-4">
                    <FibonacciAnalysisContent
                      symbol={symbol}
                      fibData={{
                        symbol: symbol,
                        current_price: signal.fibonacci.current_price,
                        swing_high: signal.fibonacci.swing_high,
                        swing_low: signal.fibonacci.swing_low,
                        swing_high_date: signal.fibonacci.swing_high_date,
                        swing_low_date: signal.fibonacci.swing_low_date,
                        trend: signal.fibonacci.trend,
                        swing_quality: signal.fibonacci.swing_quality,
                        lookback_period: signal.fibonacci.lookback_period,
                        extension_type: signal.fibonacci.extension_type,
                        pullback_low: signal.fibonacci.pullback_low,
                        pullback_high: signal.fibonacci.pullback_high,
                        pullback_date: signal.fibonacci.pullback_date,
                        retracements: signal.fibonacci.retracements,
                        extensions: signal.fibonacci.extensions,
                        nearest_support: signal.fibonacci.nearest_support,
                        nearest_resistance: signal.fibonacci.nearest_resistance,
                        entry_zone: signal.fibonacci.entry_zone,
                        profit_targets: signal.fibonacci.profit_targets,
                      }}
                    />
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
