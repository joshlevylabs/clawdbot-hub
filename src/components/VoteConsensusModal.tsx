"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Star, TrendingUp, TrendingDown, Loader2, AlertTriangle } from "lucide-react";

// ===== Types =====

interface VoteConsensusModalProps {
  symbol: string;
  onClose: () => void;
}

interface UniverseSignalData {
  symbol: string;
  signal: string;
  signal_strength: number;
  signal_source?: string;
  strategies_agreeing: number;
  strategy_votes: {
    fear_greed: boolean;
    regime_confirmation: boolean;
    rsi_oversold: boolean;
    mean_reversion: boolean;
    momentum: boolean;
  };
  asset_class: string;
  sector: string;
  price: number;
  regime: string;
  hold_days: number;
  is_core: boolean;
  expected_accuracy: number;
  expected_sharpe: number;
  rsi_14?: number;
  return_5d?: number;
  current_fg?: number;
  momentum_20d?: number;
  role: string;
}

interface UniverseData {
  signals: {
    by_asset_class: UniverseSignalData[];
  };
}

// ===== Strategy Configuration =====

const STRATEGIES = [
  {
    key: "fear_greed" as const,
    name: "Fear & Greed",
    emoji: "😰",
    description: "Market sentiment extremes",
  },
  {
    key: "regime_confirmation" as const,
    name: "Regime Confirmation",
    emoji: "📈",
    description: "Trend regime validation",
  },
  {
    key: "rsi_oversold" as const,
    name: "RSI Oversold",
    emoji: "📉",
    description: "Technical oversold conditions",
  },
  {
    key: "mean_reversion" as const,
    name: "Mean Reversion",
    emoji: "🔄",
    description: "Price reversion opportunities",
  },
  {
    key: "momentum" as const,
    name: "Momentum",
    emoji: "🚀",
    description: "Trend continuation signals",
  },
];

// ===== Helper Functions =====

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getConsensusMessage(count: number): string {
  switch (count) {
    case 5: return "🏆 Full consensus — strongest possible signal";
    case 4: return "🔥 Near-consensus — very strong conviction";
    case 3: return "✅ Majority agreement — moderate conviction";
    case 2: return "⚠️ Split vote — proceed with caution";
    case 1: return "🟡 Single strategy — low conviction";
    default: return "⛔ No strategy votes — no signal";
  }
}

function getMissingStrategyMessage(strategy: string, signal: UniverseSignalData): string {
  switch (strategy) {
    case "fear_greed":
      return `F&G currently at ${signal.current_fg?.toFixed(1) || 'N/A'} — needs to drop into fear territory`;
    case "regime_confirmation":
      return `Regime is ${signal.regime} — needs bullish confirmation`;
    case "rsi_oversold":
      return `RSI at ${signal.rsi_14?.toFixed(1) || 'N/A'} — needs to drop below 30`;
    case "mean_reversion":
      return `5d return is ${signal.return_5d?.toFixed(1) || 'N/A'}% — needs a deeper pullback`;
    case "momentum":
      return `Momentum is ${signal.momentum_20d?.toFixed(1) || 'N/A'}% — needs stronger upward momentum`;
    default:
      return "Conditions need to change for this strategy";
  }
}

// ===== Main Component =====

export default function VoteConsensusModal({ symbol, onClose }: VoteConsensusModalProps) {
  const [signal, setSignal] = useState<UniverseSignalData | null>(null);
  const [allSignals, setAllSignals] = useState<UniverseSignalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/data/trading/mre-signals-universe.json?" + Date.now());
        if (!response.ok) throw new Error("Failed to fetch universe signals");
        
        const data: UniverseData = await response.json();
        const signals = data.signals.by_asset_class;
        
        const matchedSignal = signals.find(s => s.symbol === symbol);
        if (!matchedSignal) {
          if (!cancelled) setError(`No signal data found for ${symbol}`);
          return;
        }

        if (!cancelled) {
          setSignal(matchedSignal);
          setAllSignals(signals);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load signal data");
          console.error(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    
    fetchData();
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

  // Find similar consensus tickers
  const similarTickers = signal ? allSignals
    .filter(s => s.symbol !== signal.symbol && 
                Math.abs(s.strategies_agreeing - signal.strategies_agreeing) <= 1)
    .sort((a, b) => b.strategies_agreeing - a.strategies_agreeing)
    .slice(0, 8) : [];

  // Get missing strategies
  const missingStrategies = signal ? STRATEGIES.filter(strategy => 
    !signal.strategy_votes[strategy.key]
  ) : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
              <span className="text-sm text-slate-500">Loading consensus data for {symbol}…</span>
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-center justify-center py-24">
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
              <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Loaded */}
        {!loading && !error && signal && (
          <>
            {/* Header */}
            <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-lg">🗳️</span>
                <h2 className="text-xl font-bold text-slate-100">
                  {symbol} Vote Consensus
                </h2>
                <span className={`text-xs px-2.5 py-0.5 rounded-lg border font-bold ${
                  signal.strategies_agreeing >= 3
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                    : signal.strategies_agreeing >= 1
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                    : "bg-red-500/20 text-red-400 border-red-500/50"
                }`}>
                  {signal.strategies_agreeing}/5 Votes
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 pb-6 space-y-6 pt-4">
              
              {/* Quick Info Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Price</p>
                  <p className="text-lg font-bold text-slate-200">${formatCurrency(signal.price)}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Regime</p>
                  <p className={`text-sm font-semibold capitalize flex items-center gap-1 ${
                    signal.regime === "bull" ? "text-emerald-400" :
                    signal.regime === "bear" ? "text-red-400" :
                    "text-amber-400"
                  }`}>
                    {signal.regime === "bull" ? <TrendingUp className="w-3 h-3" /> :
                     signal.regime === "bear" ? <TrendingDown className="w-3 h-3" /> : null}
                    {signal.regime}
                  </p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Sector</p>
                  <p className="text-sm text-slate-300 truncate">{signal.sector}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-xs text-slate-500">Expected Accuracy</p>
                  <p className="text-lg font-bold text-slate-200">{signal.expected_accuracy.toFixed(0)}%</p>
                </div>
              </div>

              {/* Consensus Score */}
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Consensus Score</h3>
                
                {/* Progress Bar */}
                <div className="flex mb-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className={`flex-1 h-4 border-r border-slate-900 last:border-r-0 ${
                        i <= signal.strategies_agreeing 
                          ? "bg-emerald-500" 
                          : "bg-slate-700"
                      } ${i === 1 ? "rounded-l-lg" : ""} ${i === 5 ? "rounded-r-lg" : ""}`}
                    />
                  ))}
                </div>
                
                {/* Label */}
                <p className="text-slate-300 font-medium">
                  {getConsensusMessage(signal.strategies_agreeing)}
                </p>
              </div>

              {/* Strategy Votes Breakdown */}
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Strategy Votes Breakdown</h3>
                
                <div className="space-y-3">
                  {STRATEGIES.map(strategy => {
                    const isVoting = signal.strategy_votes[strategy.key];
                    return (
                      <div key={strategy.key} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{strategy.emoji}</span>
                          <div>
                            <p className="text-sm font-medium text-slate-200">{strategy.name}</p>
                            <p className="text-xs text-slate-500">{strategy.description}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-lg border text-xs font-bold ${
                          isVoting 
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                            : "bg-slate-700/50 text-slate-400 border-slate-600"
                        }`}>
                          {isVoting ? "✓ YES" : "✗ NO"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* What's Needed for Full Consensus */}
              {missingStrategies.length > 0 && (
                <div className="bg-amber-900/20 rounded-xl border border-amber-500/30 p-6">
                  <h3 className="text-lg font-semibold text-amber-400 mb-4">What's Needed for Full Consensus</h3>
                  
                  <div className="space-y-2">
                    {missingStrategies.map(strategy => (
                      <div key={strategy.key} className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">⚠️</span>
                        <p className="text-sm text-amber-200">
                          <span className="font-medium">{strategy.name}:</span>{" "}
                          {getMissingStrategyMessage(strategy.key, signal)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Similar Consensus Tickers */}
              {similarTickers.length > 0 && (
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                  <h3 className="text-lg font-semibold text-slate-100 mb-4">Similar Consensus Tickers</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {similarTickers.map(ticker => (
                      <div key={ticker.symbol} className="bg-slate-900/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-mono font-semibold text-slate-200">
                            {ticker.symbol}
                          </span>
                          {ticker.is_core && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                        </div>
                        
                        {/* Vote dots */}
                        <div className="flex items-center gap-1 mb-1">
                          {STRATEGIES.map(strategy => (
                            <div
                              key={strategy.key}
                              className={`w-2 h-2 rounded-full ${
                                ticker.strategy_votes[strategy.key]
                                  ? "bg-emerald-400"
                                  : "bg-slate-600"
                              }`}
                            />
                          ))}
                          <span className="text-xs text-slate-400 ml-1">
                            {ticker.strategies_agreeing}/5
                          </span>
                        </div>
                        
                        <p className="text-xs text-slate-500 truncate">{ticker.sector}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </>
        )}
      </div>
    </div>
  );
}