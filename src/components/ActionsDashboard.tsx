"use client";

import { useState, useEffect } from "react";
import {
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  AlertTriangle,
  Zap,
  Shield,
  ShoppingCart,
  LogOut,
  Loader2,
} from "lucide-react";
import PerformanceChart from "@/components/PerformanceChart";

interface FibonacciLevels {
  nearest_support: number;
  nearest_resistance: number;
  entry_zone: string;
  profit_targets: number[];
  retracements: Record<string, number>;
}

interface RegimeDetails {
  regime: string;
  confidence: number;
  momentum_20d: number;
  regime_stage: string;
  predicted_remaining_days: number;
}

interface AssetSignal {
  asset_class: string;
  symbol: string;
  signal: string;
  price: number;
  fibonacci: FibonacciLevels;
  regime_details: RegimeDetails;
  expected_accuracy: number;
}

interface MREData {
  timestamp: string;
  fear_greed: {
    current: number;
    rating: string;
    breakdown: {
      aggregate_score: number;
      rating: string;
    };
  };
  regime: {
    global: string;
  };
  signals: {
    summary: {
      total_buy: number;
      total_hold: number;
    };
    by_asset_class: AssetSignal[];
  };
  prediction_markets: {
    kalshi: {
      signal: string;
      confidence: number;
    };
    polymarket: {
      signal: string;
      confidence: number;
    };
  };
  breadth?: {
    available: boolean;
    signal: string;
    trend_5d: string;
    spread_5d: number;
    spread_10d: number;
    divergence_vs_spy: boolean;
    advancing_days_10d: number;
    spy_5d_return: number;
    rsp_5d_return: number;
  };
}

interface Position {
  symbol: string;
  qty: number;
  entry_price: number;
}

export interface ActionItem {
  symbol: string;
  assetClass: string;
  action: "BUY" | "SELL" | "HOLD" | "WAIT" | "WATCH";
  entry: number | null;
  entryDisplay: string;
  stop: number | null;
  stopDisplay: string;
  target: number | null;
  targetDisplay: string;
  currentPrice: number;
  confidence: number;
  rationale: string;
  priority: number;
}

interface ActionsDashboardProps {
  positions?: Position[];
  cash?: number;
  onTrade?: (symbol: string, side: "buy" | "sell", qty: number, price: number, target?: number, stop?: number) => void;
  tradingEnabled?: boolean;
}

function generateActions(data: MREData): ActionItem[] {
  const actions: ActionItem[] = [];
  const fg = data.fear_greed.current;

  for (const asset of data.signals.by_asset_class) {
    const { symbol, price, fibonacci, regime_details, expected_accuracy, signal } = asset;
    const { regime, confidence, momentum_20d, regime_stage } = regime_details;

    let action: ActionItem["action"] = "HOLD";
    let entry: number | null = null;
    let entryDisplay = "—";
    let stop: number | null = null;
    let stopDisplay = "—";
    let target: number | null = null;
    let targetDisplay = "—";
    let rationale = "";
    let priority = 3;

    // Parse entry zone
    const entryZoneParts = fibonacci.entry_zone.split(" - ").map(Number);
    const entryHigh = entryZoneParts[0];
    const entryLow = entryZoneParts[1];
    const distanceToEntry = ((price - entryHigh) / price) * 100;

    // Decision logic — RESPECT MRE engine signals as source of truth
    if (signal === "BUY") {
      action = "BUY";
      entry = price;
      entryDisplay = `$${price.toFixed(2)}`;
      stop = fibonacci.retracements["78.6"];
      stopDisplay = `$${stop.toFixed(2)}`;
      target = fibonacci.profit_targets[0];
      targetDisplay = `$${target.toFixed(2)}`;
      rationale = `MRE BUY signal. Fear at ${fg.toFixed(0)}, ${regime} regime.`;
      priority = 1;
    } else if (regime === "sideways") {
      action = "WATCH";
      entry = fibonacci.nearest_resistance;
      entryDisplay = `>$${entry.toFixed(2)}`;
      stop = fibonacci.retracements["61.8"];
      stopDisplay = `$${stop.toFixed(2)}`;
      target = fibonacci.profit_targets[0];
      targetDisplay = `$${target.toFixed(2)}`;
      rationale = `Consolidating. Buy breakout above resistance.`;
      priority = 2;
    } else if (regime === "bear") {
      action = "WAIT";
      rationale = `Bear regime. Avoid until trend reversal.`;
      priority = 4;
    } else {
      // Bull regime but MRE says HOLD — show entry levels for reference
      action = "HOLD";
      entry = entryHigh;
      entryDisplay = `$${entryHigh.toFixed(2)} (dip)`;
      target = fibonacci.profit_targets[0];
      targetDisplay = `$${target.toFixed(2)}`;
      rationale = `${regime} regime, ${confidence}% confidence. MRE threshold not met (F&G ${fg.toFixed(0)}).`;
      priority = 3;

      if (momentum_20d > 5) {
        rationale += ` Strong momentum (+${momentum_20d.toFixed(1)}%).`;
      }
    }

    actions.push({
      symbol,
      assetClass: asset.asset_class.replace("_", " "),
      action,
      entry,
      entryDisplay,
      stop,
      stopDisplay,
      target,
      targetDisplay,
      currentPrice: price,
      confidence: Math.round(expected_accuracy),
      rationale,
      priority,
    });
  }

  return actions.sort((a, b) => a.priority - b.priority);
}

function generateThesis(data: MREData): string {
  const fg = data.fear_greed.current;
  const globalRegime = data.regime.global;
  const polySignal = data.prediction_markets?.polymarket?.signal || "NEUTRAL";

  let thesis = "";

  if (fg < 25) {
    thesis += `Extreme fear (${fg.toFixed(0)}) — historically strong buying opportunity. `;
  } else if (fg < 45) {
    thesis += `Fear elevated (${fg.toFixed(0)}) — watch for capitulation entries. `;
  } else if (fg > 75) {
    thesis += `Greed high (${fg.toFixed(0)}) — reduce exposure, don't chase. `;
  } else {
    thesis += `Neutral sentiment (${fg.toFixed(0)}). `;
  }

  if (globalRegime === "bull") {
    thesis += `Bull regime intact — buy dips, don't fight the trend. `;
  } else if (globalRegime === "bear") {
    thesis += `Bear regime — preserve capital, wait for reversal. `;
  } else {
    thesis += `Sideways market — wait for direction or trade ranges. `;
  }

  if (polySignal === "BEARISH") {
    thesis += `Prediction markets lean bearish — stay nimble.`;
  } else if (polySignal === "BULLISH") {
    thesis += `Prediction markets bullish — supports long bias.`;
  }

  return thesis;
}

function ActionIcon({ action }: { action: ActionItem["action"] }) {
  switch (action) {
    case "BUY":
      return <TrendingUp className="w-4 h-4" />;
    case "SELL":
      return <TrendingDown className="w-4 h-4" />;
    case "HOLD":
      return <Minus className="w-4 h-4" />;
    case "WAIT":
      return <Clock className="w-4 h-4" />;
    case "WATCH":
      return <Target className="w-4 h-4" />;
  }
}

function ActionBadge({ action }: { action: ActionItem["action"] }) {
  const styles: Record<ActionItem["action"], string> = {
    BUY: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
    SELL: "bg-red-500/20 text-red-400 border-red-500/50",
    HOLD: "bg-slate-500/20 text-slate-400 border-slate-500/50",
    WAIT: "bg-amber-500/20 text-amber-400 border-amber-500/50",
    WATCH: "bg-cyan-500/20 text-cyan-400 border-cyan-500/50",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${styles[action]}`}>
      <ActionIcon action={action} />
      {action}
    </span>
  );
}

function ConfidenceMeter({ value }: { value: number }) {
  const color = value >= 70 ? "bg-emerald-500" : value >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-slate-400">{value}%</span>
    </div>
  );
}

export default function ActionsDashboard({
  positions = [],
  cash = 0,
  onTrade,
  tradingEnabled = false,
}: ActionsDashboardProps) {
  const [data, setData] = useState<MREData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tradingSymbol, setTradingSymbol] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<{ date: string; equity: number; spy_price: number | null }[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [signalsRes, paperRes] = await Promise.all([
          fetch("/data/trading/mre-signals.json"),
          fetch("/api/paper-trading").catch(() => null),
        ]);
        if (!signalsRes.ok) throw new Error("Failed to load signals");
        const json = await signalsRes.json();
        setData(json);

        // Load snapshots for performance chart
        if (paperRes?.ok) {
          const paperData = await paperRes.json();
          if (paperData.snapshots) {
            setSnapshots(paperData.snapshots);
          }
        }
      } catch (e) {
        setError("Could not load market signals");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 animate-pulse">
        <div className="h-8 bg-slate-700 rounded w-48 mb-4" />
        <div className="h-24 bg-slate-700 rounded" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400" />
        <span className="text-red-300">{error || "No data available"}</span>
      </div>
    );
  }

  const actions = generateActions(data);
  const thesis = generateThesis(data);

  const updated = new Date(data.timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  // Calculate position for each action
  const getPosition = (symbol: string) => positions.find((p) => p.symbol === symbol);

  // Handle trade execution with confidence-weighted sizing
  const handleTrade = (item: ActionItem) => {
    if (!onTrade || !tradingEnabled) return;

    setTradingSymbol(item.symbol);

    const position = getPosition(item.symbol);

    if (item.action === "BUY" && item.entry) {
      // Confidence-weighted position sizing:
      // - 50% confidence = 8% of cash
      // - 70% confidence = 15% of cash  
      // - 90% confidence = 25% of cash
      // Linear interpolation: allocation = 0.08 + (confidence - 50) * 0.00425
      const minAlloc = 0.08;
      const maxAlloc = 0.25;
      const confidenceNormalized = Math.max(50, Math.min(90, item.confidence));
      const allocPct = minAlloc + ((confidenceNormalized - 50) / 40) * (maxAlloc - minAlloc);
      
      const allocation = Math.min(cash * allocPct, cash);
      const shares = Math.floor(allocation / item.currentPrice);

      if (shares > 0) {
        console.log(`BUY ${item.symbol}: ${item.confidence}% confidence → ${(allocPct * 100).toFixed(1)}% allocation ($${allocation.toFixed(0)})`);
        onTrade(item.symbol, "buy", shares, item.currentPrice, item.target || undefined, item.stop || undefined);
      }
    } else if (position && position.qty > 0) {
      // Sell entire position
      onTrade(item.symbol, "sell", position.qty, item.currentPrice);
    }

    setTimeout(() => setTradingSymbol(null), 500);
  };

  return (
    <div className="space-y-4">
      {/* Main Actions Panel */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-primary-500/30 overflow-hidden">
        {/* Header */}
        <div className="bg-primary-600/20 border-b border-primary-500/30 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary-400" />
            <h2 className="font-bold text-lg text-slate-100">Today's Plays</h2>
          </div>
          <span className="text-xs text-slate-500">Updated {updated}</span>
        </div>

        {/* Thesis Banner */}
        <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-700/50">
          <p className="text-sm text-slate-300 italic">
            <span className="text-primary-400 font-medium">Thesis:</span> {thesis}
          </p>
        </div>

        {/* Action Items */}
        <div className="p-4">
          {actions.length === 0 ? (
            <div className="text-center py-6">
              <Shield className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400">No signals. Market in wait mode.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase border-b border-slate-700">
                    <th className="text-left py-2 px-2">Asset</th>
                    <th className="text-left py-2 px-2">Price</th>
                    <th className="text-left py-2 px-2">Signal</th>
                    <th className="text-left py-2 px-2">Position</th>
                    <th className="text-right py-2 px-2">Total P&L</th>
                    <th className="text-left py-2 px-2">Entry</th>
                    <th className="text-left py-2 px-2">Stop</th>
                    <th className="text-left py-2 px-2">Target</th>
                    <th className="text-left py-2 px-2">Confidence</th>
                    {tradingEnabled && <th className="text-center py-2 px-2">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {actions.map((item) => {
                    const position = getPosition(item.symbol);
                    const hasPosition = position && position.qty > 0;
                    const isTrading = tradingSymbol === item.symbol;

                    return (
                      <tr key={item.symbol} className="border-b border-slate-800 hover:bg-slate-800/50">
                        <td className="py-3 px-2">
                          <div>
                            <span className="font-bold text-slate-100">{item.symbol}</span>
                            <p className="text-xs text-slate-500 capitalize">{item.assetClass}</p>
                          </div>
                        </td>
                        <td className="py-3 px-2 font-mono text-sm text-slate-200">
                          ${item.currentPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-2">
                          <ActionBadge action={item.action} />
                        </td>
                        <td className="py-3 px-2">
                          {hasPosition ? (
                            <div className="text-xs">
                              <span className="text-emerald-400 font-mono">{position.qty} shares</span>
                              <p className="text-slate-500">@ ${position.entry_price.toFixed(2)}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {hasPosition ? (() => {
                            const pnl = (item.currentPrice - position.entry_price) * position.qty;
                            const pnlPct = ((item.currentPrice - position.entry_price) / position.entry_price) * 100;
                            const isUp = pnl >= 0;
                            return (
                              <div className="text-xs font-mono">
                                <span className={isUp ? "text-emerald-400" : "text-red-400"}>
                                  {isUp ? "+" : ""}${pnl.toFixed(2)}
                                </span>
                                <p className={isUp ? "text-emerald-400/70" : "text-red-400/70"}>
                                  {isUp ? "+" : ""}{pnlPct.toFixed(2)}%
                                </p>
                              </div>
                            );
                          })() : (
                            <span className="text-xs text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-3 px-2 font-mono text-sm text-slate-300">{item.entryDisplay}</td>
                        <td className="py-3 px-2 font-mono text-sm text-red-400">{item.stopDisplay}</td>
                        <td className="py-3 px-2 font-mono text-sm text-emerald-400">{item.targetDisplay}</td>
                        <td className="py-3 px-2">
                          <ConfidenceMeter value={item.confidence} />
                        </td>
                        {tradingEnabled && (
                          <td className="py-3 px-2 text-center">
                            {item.action === "BUY" && !hasPosition && cash > item.currentPrice ? (
                              <button
                                onClick={() => handleTrade(item)}
                                disabled={isTrading}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                              >
                                {isTrading ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <ShoppingCart className="w-3 h-3" />
                                )}
                                Buy
                              </button>
                            ) : hasPosition ? (
                              <button
                                onClick={() => handleTrade(item)}
                                disabled={isTrading}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                              >
                                {isTrading ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <LogOut className="w-3 h-3" />
                                )}
                                Sell
                              </button>
                            ) : (
                              <span className="text-xs text-slate-500">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                {/* Portfolio Totals Footer */}
                {positions.length > 0 && (() => {
                  const totalPnl = positions.reduce((sum, pos) => {
                    const asset = actions.find(a => a.symbol === pos.symbol);
                    const currentPrice = asset?.currentPrice || pos.entry_price;
                    return sum + (currentPrice - pos.entry_price) * pos.qty;
                  }, 0);
                  const totalCost = positions.reduce((sum, pos) => sum + pos.entry_price * pos.qty, 0);
                  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
                  const totalValue = positions.reduce((sum, pos) => {
                    const asset = actions.find(a => a.symbol === pos.symbol);
                    const currentPrice = asset?.currentPrice || pos.entry_price;
                    return sum + currentPrice * pos.qty;
                  }, 0);
                  const isUp = totalPnl >= 0;
                  return (
                    <tfoot>
                      <tr className="border-t-2 border-slate-600 bg-slate-800/80">
                        <td className="py-3 px-2 font-bold text-slate-100">Portfolio Total</td>
                        <td className="py-3 px-2 font-mono text-sm text-slate-200">${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="py-3 px-2">
                          <span className="text-xs text-slate-400">{positions.length} positions</span>
                        </td>
                        <td className="py-3 px-2 text-xs text-slate-400">
                          ${totalCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} invested
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="font-mono font-bold">
                            <span className={`text-sm ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                              {isUp ? "+" : ""}${totalPnl.toFixed(2)}
                            </span>
                            <p className={`text-xs ${isUp ? "text-emerald-400/70" : "text-red-400/70"}`}>
                              {isUp ? "+" : ""}{totalPnlPct.toFixed(2)}%
                            </p>
                          </div>
                        </td>
                        <td colSpan={4} className="py-3 px-2 text-right text-xs text-slate-500">
                          Cash: ${cash.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  );
                })()}
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <p className="text-xs text-slate-500">Fear & Greed</p>
          <p className={`text-xl font-bold ${data.fear_greed.current < 30 ? "text-red-400" : data.fear_greed.current > 70 ? "text-emerald-400" : "text-amber-400"}`}>
            {data.fear_greed.current.toFixed(0)}
          </p>
          <p className="text-xs text-slate-500 capitalize">{data.fear_greed.rating}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <p className="text-xs text-slate-500">Market Regime</p>
          <p className={`text-xl font-bold capitalize ${data.regime.global === "bull" ? "text-emerald-400" : data.regime.global === "bear" ? "text-red-400" : "text-amber-400"}`}>
            {data.regime.global}
          </p>
          <p className="text-xs text-slate-500">Global trend</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <p className="text-xs text-slate-500">Active Signals</p>
          <p className="text-xl font-bold text-primary-400">{data.signals.summary.total_buy}</p>
          <p className="text-xs text-slate-500">Buy signals</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <p className="text-xs text-slate-500">Kalshi Prediction</p>
          <p className={`text-xl font-bold ${data.prediction_markets?.kalshi?.signal === "BULLISH" ? "text-emerald-400" : data.prediction_markets?.kalshi?.signal === "BEARISH" ? "text-red-400" : "text-slate-400"}`}>
            {data.prediction_markets?.kalshi?.signal || "—"}
          </p>
          <p className="text-xs text-slate-500">{data.prediction_markets?.kalshi?.confidence || 0}% confidence</p>
        </div>
      </div>

      {/* Breadth Indicator */}
      {data.breadth?.available && (
        <div className={`bg-slate-800/50 rounded-xl p-4 border ${data.breadth.divergence_vs_spy ? "border-amber-500/50" : "border-slate-700/50"}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-200">📊 Market Breadth</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                data.breadth.signal === "STRONG_BULL" ? "bg-emerald-500/20 text-emerald-400" :
                data.breadth.signal === "BULL" ? "bg-green-500/20 text-green-400" :
                data.breadth.signal === "NEUTRAL" ? "bg-slate-500/20 text-slate-400" :
                data.breadth.signal === "WEAK" ? "bg-amber-500/20 text-amber-400" :
                "bg-red-500/20 text-red-400"
              }`}>
                {data.breadth.signal}
              </span>
            </div>
            {data.breadth.divergence_vs_spy && (
              <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Divergence
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Trend (5d)</p>
              <p className={`font-medium capitalize ${
                data.breadth.trend_5d === "expanding" ? "text-emerald-400" :
                data.breadth.trend_5d === "narrowing" ? "text-red-400" : "text-slate-300"
              }`}>{data.breadth.trend_5d}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Spread (5d)</p>
              <p className={`font-mono ${data.breadth.spread_5d > 0 ? "text-emerald-400" : data.breadth.spread_5d < 0 ? "text-red-400" : "text-slate-300"}`}>
                {data.breadth.spread_5d > 0 ? "+" : ""}{data.breadth.spread_5d}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Advancing Days</p>
              <p className="font-mono text-slate-300">{data.breadth.advancing_days_10d}/10</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">RSP vs SPY (5d)</p>
              <p className="font-mono text-slate-400 text-xs">
                RSP {data.breadth.rsp_5d_return > 0 ? "+" : ""}{data.breadth.rsp_5d_return}% / SPY {data.breadth.spy_5d_return > 0 ? "+" : ""}{data.breadth.spy_5d_return}%
              </p>
            </div>
          </div>
          {data.breadth.divergence_vs_spy && (
            <div className="mt-3 p-2 bg-amber-500/10 rounded text-xs text-amber-300">
              ⚠️ SPY rising but breadth narrowing — rally may be thinning. Fewer stocks participating.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
