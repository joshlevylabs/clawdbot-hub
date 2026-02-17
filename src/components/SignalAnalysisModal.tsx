"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Activity, Target, TrendingUp, Loader2, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
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
  fibonacci?: {
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
  regime_details?: {
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
  confidence_multiplier: number;
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

interface UniverseSignalData {
  symbol: string;
  signal: string;
  signal_strength: number;
  signal_source?: string;
  strategies_agreeing?: number;
  strategy_votes?: {
    fear_greed: boolean;
    regime_confirmation: boolean;
    rsi_oversold: boolean;
    mean_reversion: boolean;
    momentum: boolean;
  };
  signal_track?: string;
  rsi_14?: number;
  bb_position?: string;
  dip_5d_pct?: number;
  return_5d?: number;
  momentum_20d?: number;
  volatility_20d?: number;
  price: number;
  regime: string;
}

// ===== Helpers =====

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ===== Parse helpers for Pit notes =====

function parseEMAs(notes: string): Record<string, number> {
  const emas: Record<string, number> = {};
  const emaRegex = /EMA(\d+)=\$?([\d,.]+)/g;
  let match;
  while ((match = emaRegex.exec(notes)) !== null) {
    emas[match[1]] = parseFloat(match[2].replace(/,/g, ""));
  }
  return emas;
}

function parseSupportResistance(notes: string): { support: string | null; resistance: string | null } {
  const supportMatch = notes.match(/Support near \$?([\d,.]+)/i);
  const resistanceMatch = notes.match(/[Rr]esistance near \$?([\d,.]+)/i);
  return {
    support: supportMatch ? supportMatch[1] : null,
    resistance: resistanceMatch ? resistanceMatch[1] : null,
  };
}

function parseRSI(pattern: string): number | null {
  const rsiMatch = pattern.match(/RSI[^\d]*?(\d+)/i);
  return rsiMatch ? parseInt(rsiMatch[1]) : null;
}

function getVerdictColor(verdict: string): string {
  const v = verdict.toUpperCase();
  if (v.startsWith("STRONG BUY")) return "bg-emerald-500/30 text-emerald-300 border-emerald-400/60";
  if (v.startsWith("STRONG SELL")) return "bg-red-500/30 text-red-300 border-red-400/60";
  if (v.startsWith("BUY")) return "bg-green-500/20 text-green-400 border-green-500/50";
  if (v.startsWith("CAUTIOUS BUY")) return "bg-green-500/20 text-green-400 border-green-500/50";
  if (v.startsWith("CAUTIOUS")) return "bg-amber-500/20 text-amber-400 border-amber-500/50";
  if (v.startsWith("HOLD")) return "bg-amber-500/20 text-amber-400 border-amber-500/50";
  if (v.startsWith("SELL") || v.startsWith("AVOID")) return "bg-red-500/20 text-red-400 border-red-500/50";
  return "bg-slate-500/20 text-slate-400 border-slate-500/50";
}

function getVerdictLabel(verdict: string): string {
  const v = verdict.toUpperCase();
  return v.split("—")[0].split("–")[0].trim();
}

function generateCautionFlags(pitRec: PitRecommendation, universeSignal: UniverseSignalData | null): string[] {
  const flags: string[] = [];
  const rsi = parseRSI(pitRec.pattern);
  if (rsi && rsi > 70) flags.push(`RSI overbought at ${rsi}`);
  if (rsi && rsi < 30) flags.push(`RSI oversold at ${rsi}`);
  if (universeSignal?.bb_position === "above_upper") flags.push("Price above upper Bollinger Band");
  if (universeSignal?.return_5d && universeSignal.return_5d > 10) flags.push(`Already up ${universeSignal.return_5d.toFixed(1)}% in 5d`);
  if (universeSignal?.return_5d && universeSignal.return_5d < -10) flags.push(`Down ${Math.abs(universeSignal.return_5d).toFixed(1)}% in 5d — possible falling knife`);
  const rangeMatch = pitRec.notes.match(/currently at (\d+)% of range/);
  if (rangeMatch && parseInt(rangeMatch[1]) > 90) flags.push(`Near top of 6-month range (${rangeMatch[1]}%)`);
  if (pitRec.pattern.includes("volume dry-up")) flags.push("Volume dry-up — weak conviction");
  if (pitRec.pattern.includes("MACD bearish crossover")) flags.push("MACD bearish crossover");
  if (pitRec.pattern.includes("rising wedge")) flags.push("Rising wedge pattern — potential reversal");
  if (pitRec.sharpe < 0) flags.push(`Negative Sharpe ratio (${pitRec.sharpe.toFixed(2)})`);
  return flags;
}

function generateBottomLine(pitRec: PitRecommendation, universeSignal: UniverseSignalData | null, cautionFlags: string[]): string {
  const v = pitRec.pit_verdict.toUpperCase();
  const rsi = parseRSI(pitRec.pattern);
  const emas = parseEMAs(pitRec.notes);
  const emaCount = Object.keys(emas).length;
  const isStackedBullish = pitRec.pattern.includes("above stacked EMAs");
  const isStackedBearish = pitRec.pattern.includes("below stacked EMAs");
  const consensus = universeSignal?.strategies_agreeing ?? 0;
  const hasCautions = cautionFlags.length > 0;

  if (v.startsWith("STRONG BUY")) {
    let line = "Strong bullish structure";
    if (isStackedBullish && emaCount >= 2) line += " with stacked EMAs";
    if (rsi && rsi > 70) line += ". Momentum is real but entering overbought territory";
    else line += ". Momentum supports the trend";
    if (consensus >= 3) line += `. ${consensus}/5 strategies confirm`;
    if (hasCautions) line += ". Ride with trailing stop; fresh entries may want to wait for a pullback";
    else line += ". Favorable setup for entry or adding to position";
    return line + ".";
  }
  if (v.startsWith("STRONG SELL")) {
    let line = "Bearish structure dominates";
    if (isStackedBearish) line += " — price below all major EMAs";
    line += ". Avoid new entries, consider reducing exposure";
    if (pitRec.sharpe < 0) line += ". Negative Sharpe confirms poor risk-adjusted returns";
    return line + ".";
  }
  if (v.startsWith("CAUTIOUS BUY") || v.startsWith("BUY")) {
    let line = "Bullish bias";
    if (isStackedBullish) line += " with favorable EMA alignment";
    if (pitRec.pattern.includes("MACD positive")) line += ", MACD supports upward momentum";
    if (hasCautions) line += `. Watch out: ${cautionFlags[0].toLowerCase()}`;
    if (consensus >= 3) line += `. Good consensus (${consensus}/5 strategies)`;
    if (v.startsWith("CAUTIOUS")) line += ". Size accordingly — moderate conviction only";
    else line += ". Reasonable entry if risk is managed";
    return line + ".";
  }
  if (v.startsWith("HOLD")) {
    let line = "No strong directional edge right now";
    if (pitRec.pattern.includes("MACD histogram falling")) line += " — momentum fading";
    if (consensus <= 1) line += `. Weak consensus (${consensus}/5)`;
    line += ". Hold existing positions, but don't add aggressively";
    return line + ".";
  }
  // Default
  return `Mixed signals. ${pitRec.pit_verdict.split("—")[1]?.trim() || "Monitor for clearer direction."}.`;
}

// ===== Chris's Take Component =====

function ChrisTakeSection({ pitRec, pitData, universeSignal, symbol }: {
  pitRec: PitRecommendation | null;
  pitData: PitData | null;
  universeSignal: UniverseSignalData | null;
  symbol: string;
}) {
  const [expanded, setExpanded] = useState(!!pitRec);

  if (!pitRec) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-2">
          <span className="text-lg">📈</span>
          <span className="font-semibold text-slate-400">Chris&apos;s Take — {symbol}</span>
        </div>
        <div className="px-4 pb-4">
          <p className="text-sm text-slate-600 italic">
            No Pit analysis available for {symbol}. The Pit fleet runs nightly against active signals — check back after the next optimization cycle.
          </p>
        </div>
      </div>
    );
  }

  const rsi = parseRSI(pitRec.pattern);
  const emas = parseEMAs(pitRec.notes);
  const { support, resistance } = parseSupportResistance(pitRec.notes);
  const cautionFlags = generateCautionFlags(pitRec, universeSignal);
  const bottomLine = generateBottomLine(pitRec, universeSignal, cautionFlags);
  const verdictLabel = getVerdictLabel(pitRec.pit_verdict);
  const verdictColor = getVerdictColor(pitRec.pit_verdict);

  // Parse accuracy fields
  const accuracyMatch5d = pitRec.accuracy.match(/5d return: ([+-]?[\d.]+%)/);
  const accuracyMatch20d = pitRec.accuracy.match(/20d return: ([+-]?[\d.]+%)/);

  // Strategy votes from universe
  const votes = universeSignal?.strategy_votes;
  const firingStrategies = votes
    ? Object.entries(votes).filter(([, v]) => v).map(([k]) => k.replace(/_/g, " "))
    : [];

  // EMA alignment
  const emaKeys = Object.keys(emas).sort((a, b) => parseInt(a) - parseInt(b));
  const emaValues = emaKeys.map(k => emas[k]);
  const isEmaFullyBullish = emaValues.length >= 2 && emaValues.every((v, i) => i === 0 || v < emaValues[i - 1]);

  return (
    <div className="bg-slate-800/50 rounded-xl border border-indigo-500/30 overflow-hidden">
      {/* Header — clickable to expand/collapse */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full bg-indigo-600/15 border-b border-indigo-500/30 px-4 py-3 flex items-center justify-between hover:bg-indigo-600/25 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg">📈</span>
          <span className="font-semibold text-slate-100">Chris&apos;s Take</span>
          <span className="text-slate-400">—</span>
          <span className="font-bold text-slate-200">{symbol}</span>
          <span className={`inline-flex px-2 py-0.5 rounded-lg border text-xs font-bold ${verdictColor}`}>
            {verdictLabel}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Verdict */}
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Pit Fleet Verdict</p>
            <p className="text-sm font-bold text-slate-100">{pitRec.pit_verdict}</p>
          </div>

          {/* Pattern */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Pattern</p>
            <p className="text-sm text-slate-300">{pitRec.pattern}</p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {rsi !== null && (
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-xs text-slate-500">RSI</p>
                <p className={`text-lg font-bold ${rsi > 70 ? "text-red-400" : rsi < 30 ? "text-emerald-400" : "text-slate-200"}`}>
                  {rsi}
                </p>
                <p className="text-[10px] text-slate-600">
                  {rsi > 70 ? "Overbought" : rsi < 30 ? "Oversold" : "Neutral"}
                </p>
              </div>
            )}
            <div className="bg-slate-900/50 rounded-lg p-3">
              <p className="text-xs text-slate-500">Sharpe</p>
              <p className={`text-lg font-bold ${pitRec.sharpe >= 3 ? "text-emerald-400" : pitRec.sharpe >= 1 ? "text-amber-400" : "text-red-400"}`}>
                {pitRec.sharpe.toFixed(2)}
              </p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <p className="text-xs text-slate-500">Confidence Mult.</p>
              <p className={`text-lg font-bold ${pitRec.confidence_multiplier >= 1.2 ? "text-emerald-400" : pitRec.confidence_multiplier >= 1.0 ? "text-slate-200" : "text-amber-400"}`}>
                {pitRec.confidence_multiplier}x
              </p>
              <p className="text-[10px] text-slate-600">
                {pitRec.confidence_multiplier >= 1.2 ? "Boosted" : pitRec.confidence_multiplier >= 1.0 ? "Standard" : "Dampened"}
              </p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <p className="text-xs text-slate-500">Best Horizon</p>
              <p className="text-lg font-bold text-slate-200">{pitRec.best_horizon}</p>
            </div>
          </div>

          {/* Accuracy */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/50 rounded-lg p-3">
              <p className="text-xs text-slate-500">5d Backtested Return</p>
              <p className={`text-sm font-bold font-mono ${accuracyMatch5d && accuracyMatch5d[1].startsWith("+") ? "text-emerald-400" : "text-red-400"}`}>
                {accuracyMatch5d ? accuracyMatch5d[1] : "—"}
              </p>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <p className="text-xs text-slate-500">20d Backtested Return</p>
              <p className={`text-sm font-bold font-mono ${accuracyMatch20d && accuracyMatch20d[1].startsWith("+") ? "text-emerald-400" : "text-red-400"}`}>
                {accuracyMatch20d ? accuracyMatch20d[1] : "—"}
              </p>
            </div>
          </div>

          {/* Support / Resistance + EMA Stack */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Support / Resistance */}
            {(support || resistance) && (
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Support / Resistance</p>
                <div className="flex items-center gap-4 text-sm">
                  {support && (
                    <div>
                      <span className="text-[10px] text-emerald-500 uppercase">Support</span>
                      <p className="font-mono font-bold text-emerald-400">${support}</p>
                    </div>
                  )}
                  {support && resistance && <span className="text-slate-600">|</span>}
                  {resistance && (
                    <div>
                      <span className="text-[10px] text-red-500 uppercase">Resistance</span>
                      <p className="font-mono font-bold text-red-400">${resistance}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* EMA Stack */}
            {emaKeys.length > 0 && (
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">EMA Stack</p>
                <div className="flex flex-wrap gap-2">
                  {emaKeys.map(k => (
                    <span key={k} className="text-xs font-mono bg-slate-800 px-2 py-1 rounded border border-slate-700">
                      <span className="text-slate-500">EMA{k}=</span>
                      <span className="text-slate-200">${emas[k].toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </span>
                  ))}
                </div>
                <p className="text-[10px] mt-1.5">
                  {isEmaFullyBullish ? (
                    <span className="text-emerald-400">✅ Fully bullish alignment (shorter EMAs above longer)</span>
                  ) : pitRec.pattern.includes("below stacked EMAs") ? (
                    <span className="text-red-400">🔴 Bearish alignment (price below EMAs)</span>
                  ) : (
                    <span className="text-amber-400">🟡 Mixed EMA positioning</span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* MRE Signal Summary (from universe data) */}
          {universeSignal && (
            <div className="bg-slate-900/50 rounded-lg p-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">MRE Signal Summary</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-[10px] text-slate-500">Signal</p>
                  <span className={`inline-flex px-1.5 py-0.5 rounded border text-xs font-bold ${
                    universeSignal.signal === "BUY"
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                      : "bg-slate-500/20 text-slate-400 border-slate-500/50"
                  }`}>
                    {universeSignal.signal}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Consensus</p>
                  <p className="font-bold text-slate-200">{universeSignal.strategies_agreeing ?? 0}/5</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Signal Track</p>
                  <p className="text-slate-300 capitalize">{universeSignal.signal_track ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Signal Strength</p>
                  <p className="font-mono font-bold text-slate-200">{universeSignal.signal_strength || "—"}</p>
                </div>
              </div>
              {firingStrategies.length > 0 && (
                <div className="mt-2">
                  <p className="text-[10px] text-slate-500 mb-1">Strategies Firing</p>
                  <div className="flex flex-wrap gap-1">
                    {firingStrategies.map(s => (
                      <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 capitalize">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Caution Flags */}
          {cautionFlags.length > 0 && (
            <div className="bg-amber-900/20 rounded-lg p-3 border border-amber-500/30">
              <p className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Caution Flags
              </p>
              <ul className="space-y-1">
                {cautionFlags.map((flag, i) => (
                  <li key={i} className="text-xs text-amber-300/80 flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5">⚠️</span> {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Bottom Line */}
          <div className="bg-indigo-900/20 rounded-lg p-3 border border-indigo-500/30">
            <p className="text-xs font-bold text-indigo-400 mb-1 flex items-center gap-1.5">
              💡 Bottom Line
            </p>
            <p className="text-sm text-slate-200">{bottomLine}</p>
          </div>

          {/* Global Context (from pit data) */}
          {pitData?.global_context && (
            <div className="pt-3 border-t border-slate-700/50">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Market Context (Pit Fleet v{pitData.version})</p>
              <p className="text-xs text-slate-400 italic">{pitData.global_context.thesis}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===== Main Component =====

export default function SignalAnalysisModal({ symbol, onClose }: SignalAnalysisModalProps) {
  const [signal, setSignal] = useState<MRESignalData | null>(null);
  const [pitData, setPitData] = useState<PitData | null>(null);
  const [universeSignal, setUniverseSignal] = useState<UniverseSignalData | null>(null);
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
          fetch("/data/trading/pit-recommendations.json"),
        ]);

        if (cancelled) return;

        // Try main signals first, then universe
        let matchedSignal: MRESignalData | null = null;

        if (signalsRes.ok) {
          const signalsJson = await signalsRes.json();
          const signals: MRESignalData[] = signalsJson.signals?.by_asset_class || signalsJson.signals || [];
          matchedSignal = signals.find((s: any) => s.symbol === symbol) || null;
        }

        // Also try to find universe signal data for Chris's Take
        let matchedUniverse: UniverseSignalData | null = null;

        if (universeRes.ok) {
          const universeJson = await universeRes.json();
          const universeSignals = universeJson.signals?.by_asset_class || universeJson.signals || [];
          if (!matchedSignal) {
            matchedSignal = universeSignals.find((s: any) => s.symbol === symbol) || null;
          }
          matchedUniverse = universeSignals.find((s: any) => s.symbol === symbol) || null;
        }

        if (!matchedSignal) {
          if (!cancelled) setError(`No MRE signal data found for ${symbol}`);
          if (!cancelled) setLoading(false);
          return;
        }

        if (!cancelled) setSignal(matchedSignal);
        if (!cancelled) setUniverseSignal(matchedUniverse);

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
                    {/* Regime Confidence — how confident the regime detection is */}
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Regime Confidence</p>
                      {signal.regime_details ? (
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
                      ) : (
                        <p className="text-sm text-slate-500 mt-1">—</p>
                      )}
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Expected Sharpe</p>
                      <p className={`text-lg font-bold ${signal.expected_sharpe >= 1 ? "text-emerald-400" : "text-amber-400"}`}>
                        {signal.expected_sharpe?.toFixed(2) ?? "—"}
                      </p>
                    </div>
                    {/* Backtest Accuracy — historical win rate */}
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Backtest Win Rate</p>
                      <p className={`text-lg font-bold ${signal.expected_accuracy >= 60 ? "text-emerald-400" : "text-amber-400"}`}>
                        {signal.expected_accuracy?.toFixed(1) ?? "—"}%
                      </p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Hold Days</p>
                      <p className="text-lg font-bold text-slate-200">{signal.hold_days}d</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Signal Strength</p>
                      <p className="text-lg font-bold text-slate-200">
                        {signal.signal_strength != null 
                          ? `${(signal.signal_strength > 1 ? signal.signal_strength : signal.signal_strength * 100).toFixed(1)}%` 
                          : "—"}
                      </p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Regime</p>
                      {signal.regime_details ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-medium capitalize ${
                          signal.regime_details.regime === "bull"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                            : signal.regime_details.regime === "bear"
                            ? "bg-red-500/20 text-red-400 border-red-500/40"
                            : "bg-amber-500/20 text-amber-400 border-amber-500/40"
                        }`}>
                          {signal.regime_details.regime === "bull" ? "🟢" : signal.regime_details.regime === "bear" ? "🔴" : "🟡"} {signal.regime_details.regime}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-medium capitalize bg-slate-500/20 text-slate-400 border-slate-500/40">
                          {signal.regime || "—"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* MRE Fibonacci Zones — only if data exists */}
                  {signal.fibonacci && (
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
                          <p className="text-emerald-400 font-mono">${signal.fibonacci.nearest_support?.toFixed(2) ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Nearest Resistance</p>
                          <p className="text-red-400 font-mono">${signal.fibonacci.nearest_resistance?.toFixed(2) ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Profit Targets</p>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {(signal.fibonacci.profit_targets || []).map((t: number, i: number) => (
                              <span key={i} className="text-emerald-400 font-mono text-xs bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                ${t.toFixed(2)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Regime Details — only if data exists */}
                  {signal.regime_details && (
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
                  )}

                  {/* Pit Agent Fleet Recommendation */}
                  {!pitRec && (
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                      <h4 className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-2">
                        🤖 Pit Agent Fleet — {symbol}
                      </h4>
                      <p className="text-sm text-slate-600 italic">
                        Pit analysis not yet available for {symbol}. The Pit fleet runs nightly against active signals — check back after the next optimization cycle.
                      </p>
                    </div>
                  )}
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

              {/* ═══════════ SECTION 2: Chris's Take ═══════════ */}
              <ChrisTakeSection
                pitRec={pitRec}
                pitData={pitData}
                universeSignal={universeSignal}
                symbol={symbol}
              />

              {/* ═══════════ SECTION 3: Fibonacci Chart & Analysis ═══════════ */}
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
