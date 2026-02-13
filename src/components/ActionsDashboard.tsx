"use client";

import { useState, useEffect, useMemo } from "react";
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
  ChevronUp,
  ChevronDown,
  Filter,
  Layers,
  BarChart3,
  ArrowRight,
  RefreshCw,
  DollarSign,
  Info,
} from "lucide-react";
import PerformanceChart from "@/components/PerformanceChart";

// ── Capital Rebalancing types ──────────────────────────────────────

interface SwapSell {
  symbol: string;
  current_price: number;
  entry_price: number;
  unrealized_pnl_pct: number;
  confidence_score: number;
  days_held: number;
  optimal_hold: number;
  regime: string;
  score: number;
  weakness_rationale: string;
}

interface SwapBuy {
  symbol: string;
  current_price: number;
  signal_strength: number;
  confidence: number;
  expected_sharpe: number;
  regime: string;
  score: number;
  strength_rationale: string;
}

interface SwapSuggestion {
  sell: SwapSell;
  buy: SwapBuy;
  net_improvement: number;
  capital_freed: number;
}

interface CapitalRebalancing {
  capital_deployed_pct: number;
  available_cash: number;
  total_equity: number;
  threshold_triggered: boolean;
  swap_suggestions: SwapSuggestion[];
  no_swap_reason: string | null;
}

interface FibonacciLevels {
  nearest_support: number;
  nearest_resistance: number;
  entry_zone: string;
  profit_targets: number[];
  retracements: Record<string, number>;
  extensions?: Record<string, number>;
}

interface RegimeDetails {
  regime: string;
  confidence: number;
  momentum_20d: number;
  regime_stage: string;
  regime_days: number;
  predicted_remaining_days: number;
  above_ema_20?: boolean;
  above_ema_50?: boolean;
  above_ema_200?: boolean;
}

interface AssetSignal {
  asset_class: string;
  symbol: string;
  signal: string;
  price: number;
  regime: string;
  fibonacci?: FibonacciLevels;
  regime_details?: RegimeDetails;
  expected_accuracy: number;
  expected_sharpe: number;
  hold_days: number;
  // Universe-specific fields
  signal_source?: string;
  strategies_agreeing?: number;
  sector?: string;
  is_core?: boolean;
  signal_strength?: number;
  rsi_14?: number;
  bb_position?: string;
  dip_5d_pct?: number;
  return_5d?: number;
  momentum_20d?: number;
  volatility_20d?: number;
  strategy_votes?: {
    fear_greed: boolean;
    regime_confirmation: boolean;
    rsi_oversold: boolean;
    mean_reversion: boolean;
    momentum: boolean;
  };
}

interface UniverseData {
  timestamp: string;
  universe_size: number;
  core_size: number;
  signals: {
    summary: { total_buy: number; total_hold: number; total_watch?: number; total_failed?: number };
    by_asset_class: AssetSignal[];
  };
  fear_greed: {
    current: number;
    rating: string;
  };
  regime: { global: string };
}

interface MREData {
  timestamp: string;
  fear_greed: {
    current: number;
    rating: string;
    breakdown: { aggregate_score: number; rating: string };
  };
  regime: { global: string };
  signals: {
    summary: { total_buy: number; total_hold: number; total_watch?: number };
    by_asset_class: AssetSignal[];
  };
  prediction_markets: {
    kalshi: { signal: string; confidence: number };
    polymarket: { signal: string; confidence: number };
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
  // Capital rebalancing
  capital_rebalancing?: CapitalRebalancing;
  // Extended with universe data
  universeData?: UniverseData;
  allAssets?: AssetSignal[];
}

interface Position {
  symbol: string;
  qty: number;
  entry_price: number;
}

export // Category configuration (shared with MRE page logic)
const ASSET_CATEGORIES_DASH = {
  broad_market: { name: "Broad Market", icon: "📊", color: "blue" },
  sectors: { name: "Sectors", icon: "🏭", color: "purple" },
  international: { name: "International", icon: "🌍", color: "green" },
  bonds: { name: "Fixed Income", icon: "🏛️", color: "gray" },
  commodities: { name: "Commodities", icon: "🥇", color: "amber" }
};

const ASSET_CLASS_MAPPING_DASH: Record<string, keyof typeof ASSET_CATEGORIES_DASH> = {
  broad_market: "broad_market",
  technology: "sectors",
  financials: "sectors", 
  healthcare: "sectors",
  energy: "sectors",
  real_estate: "sectors",
  international: "international",
  bonds: "bonds",
  commodities: "commodities"
};

function getCategoryForAsset(assetClass: string): typeof ASSET_CATEGORIES_DASH[keyof typeof ASSET_CATEGORIES_DASH] {
  const category = ASSET_CLASS_MAPPING_DASH[assetClass];
  return ASSET_CATEGORIES_DASH[category] || ASSET_CATEGORIES_DASH.broad_market;
}

interface ActionItem {
  symbol: string;
  assetClass: string;
  category: string; // Add category field
  categoryIcon: string; // Add category icon
  regime: string;
  regimeStage: string;
  regimeDays: number;
  momentum: number;
  action: "BUY" | "SELL" | "HOLD" | "WAIT" | "WATCH";
  entry: number | null;
  entryDisplay: string;
  stop: number | null;
  stopDisplay: string;
  target: number | null;
  targetDisplay: string;
  currentPrice: number;
  confidence: number;
  sharpe: number;
  holdDays: number;
  rationale: string;
  priority: number;
  // Universe-specific fields
  signalSource?: string;
  signalStrength?: number;
  isCore?: boolean;
  rsi14?: number;
  dipPercent?: number;
  sector?: string;
  // Computed composite score (for swap comparison)
  swapScore?: number;
  // Consensus: how many of 5 strategies agree
  consensus?: number;
  // Strategy votes raw
  strategyVotes?: AssetSignal["strategy_votes"];
}

interface ActionsDashboardProps {
  positions?: Position[];
  cash?: number;
  onTrade?: (symbol: string, side: "buy" | "sell", qty: number, price: number, target?: number, stop?: number) => void;
  tradingEnabled?: boolean;
  onAnalyze?: (symbol: string) => void;
}

type SortKey = "symbol" | "action" | "regime" | "confidence" | "currentPrice" | "pnl" | "momentum" | "assetClass" | "sharpe" | "signalStrength" | "swapScore";
type SortDir = "asc" | "desc";
type SignalFilter = "ACTIONABLE" | "ALL" | "BUY" | "HOLD" | "WATCH" | "WAIT" | "SELL" | "POSITIONS" | "BROAD_MARKET" | "SECTORS" | "INTERNATIONAL" | "BONDS" | "COMMODITIES" | "CORE" | "UNIVERSE";
type GroupBy = "none" | "assetClass" | "regime" | "category";

// ── Action generation ──────────────────────────────────────────────

function generateActions(data: MREData): ActionItem[] {
  const actions: ActionItem[] = [];
  const fg = data.fear_greed.current;

  // Process all assets (core + universe)
  const allAssets = data.allAssets || data.signals.by_asset_class;

  for (const asset of allAssets) {
    const { symbol, price, fibonacci, regime_details, expected_accuracy, signal, expected_sharpe, hold_days } = asset;
    
    // Handle cases where regime_details might not exist (universe data)
    const regime = regime_details?.regime || asset.regime || "unknown";
    const confidence = regime_details?.confidence || 50;
    const momentum_20d = regime_details?.momentum_20d || asset.momentum_20d || 0;
    const regime_stage = regime_details?.regime_stage || "unknown";
    const regime_days = regime_details?.regime_days || 0;
    
    // Get category info
    const categoryInfo = getCategoryForAsset(asset.asset_class);

    let action: ActionItem["action"] = "HOLD";
    let entry: number | null = null;
    let entryDisplay = "—";
    let stop: number | null = null;
    let stopDisplay = "—";
    let target: number | null = null;
    let targetDisplay = "—";
    let rationale = "";
    let priority = 3;

    // Handle cases where fibonacci data might not exist (universe assets)
    const entryHigh = fibonacci?.entry_zone ? 
      parseFloat(fibonacci.entry_zone.split(" - ")[0]) : 
      price * 0.98; // Default to 2% below current price

    if (signal === "BUY") {
      action = "BUY";
      entry = price;
      entryDisplay = `$${price.toFixed(2)}`;
      // Stop: nearest support or 78.6% retrace (whichever is closer to price but below)
      const fibStop = fibonacci?.nearest_support || fibonacci?.retracements?.["78.6"];
      stop = fibStop || price * 0.85;
      stopDisplay = `$${stop.toFixed(2)}`;
      // Target: first extension above current price, or profit_targets[0]
      const ext127 = fibonacci?.extensions?.["127.2"];
      const ext161 = fibonacci?.extensions?.["161.8"];
      const firstExtAbove = ext127 && ext127 > price ? ext127 : ext161 && ext161 > price ? ext161 : null;
      target = firstExtAbove || fibonacci?.profit_targets?.[0] || price * 1.15;
      targetDisplay = `$${target.toFixed(2)}`;
      rationale = asset.signal_source ? 
        `${asset.signal_source} BUY signal. Fear at ${fg.toFixed(0)}, ${regime} regime.` :
        `MRE BUY signal. Fear at ${fg.toFixed(0)}, ${regime} regime.`;
      priority = 1;
    } else if (regime === "sideways") {
      action = "WATCH";
      entry = fibonacci?.nearest_resistance || price * 1.02;
      entryDisplay = `>$${entry.toFixed(2)}`;
      stop = fibonacci?.retracements?.["61.8"] || price * 0.90;
      stopDisplay = `$${stop.toFixed(2)}`;
      target = fibonacci?.profit_targets?.[0] || price * 1.15;
      targetDisplay = `$${target.toFixed(2)}`;
      rationale = `Consolidating. Buy breakout above resistance.`;
      priority = 2;
    } else if (regime === "bear") {
      action = "WAIT";
      rationale = `Bear regime. Avoid until trend reversal.`;
      priority = 4;
    } else {
      action = "HOLD";
      entry = entryHigh;
      entryDisplay = `$${entryHigh.toFixed(2)} (dip)`;
      target = fibonacci?.profit_targets?.[0] || price * 1.10;
      targetDisplay = `$${target.toFixed(2)}`;
      rationale = `${regime} regime, ${confidence}% confidence. F&G ${fg.toFixed(0)}.`;
      priority = 3;
      if (momentum_20d > 5) rationale += ` Strong momentum (+${momentum_20d.toFixed(1)}%).`;
    }

    actions.push({
      symbol,
      assetClass: asset.asset_class.replace(/_/g, " "),
      category: categoryInfo.name,
      categoryIcon: categoryInfo.icon,
      regime,
      regimeStage: regime_stage,
      regimeDays: regime_days,
      momentum: momentum_20d,
      action,
      entry,
      entryDisplay,
      stop,
      stopDisplay,
      target,
      targetDisplay,
      currentPrice: price,
      confidence: Math.round(expected_accuracy),
      sharpe: expected_sharpe || 0,
      holdDays: hold_days || 10,
      rationale,
      priority,
      // Universe-specific fields
      signalSource: asset.signal_source,
      signalStrength: asset.signal_strength || 0,
      isCore: asset.is_core || false,
      rsi14: asset.rsi_14,
      dipPercent: asset.dip_5d_pct,
      sector: asset.sector,
      // Composite swap score: same formula as _score_new_signal in mre_signal_exporter.py
      swapScore: Math.round(
        (asset.signal_strength || 0) * 0.40 +
        (expected_accuracy || 50) * 0.25 +
        Math.min(100, (expected_sharpe || 0) * 20) * 0.20 +
        (regime === "bull" ? 100 : regime === "sideways" ? 50 : 0) * 0.15
      ),
      // Consensus: count how many of the 5 strategies agree
      consensus: asset.strategy_votes
        ? Object.values(asset.strategy_votes).filter(Boolean).length
        : (asset.strategies_agreeing ?? 0),
      strategyVotes: asset.strategy_votes,
    });
  }

  return actions.sort((a, b) => a.priority - b.priority);
}

function generateThesis(data: MREData): string {
  const fg = data.fear_greed.current;
  const globalRegime = data.regime.global;
  const polySignal = data.prediction_markets?.polymarket?.signal || "NEUTRAL";
  let thesis = "";
  if (fg < 25) thesis += `Extreme fear (${fg.toFixed(0)}) — strong buying opportunity. `;
  else if (fg < 45) thesis += `Fear elevated (${fg.toFixed(0)}) — watch for capitulation entries. `;
  else if (fg > 75) thesis += `Greed high (${fg.toFixed(0)}) — reduce exposure. `;
  else thesis += `Neutral sentiment (${fg.toFixed(0)}). `;
  if (globalRegime === "bull") thesis += `Bull regime intact — buy dips. `;
  else if (globalRegime === "bear") thesis += `Bear regime — preserve capital. `;
  else thesis += `Sideways — wait for direction. `;
  if (polySignal === "BEARISH") thesis += `Prediction markets lean bearish.`;
  else if (polySignal === "BULLISH") thesis += `Prediction markets bullish.`;
  return thesis;
}

// ── UI helpers ─────────────────────────────────────────────────────

function ActionBadge({ action }: { action: ActionItem["action"] }) {
  const styles: Record<ActionItem["action"], string> = {
    BUY: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
    SELL: "bg-red-500/20 text-red-400 border-red-500/50",
    HOLD: "bg-slate-500/20 text-slate-400 border-slate-500/50",
    WAIT: "bg-amber-500/20 text-amber-400 border-amber-500/50",
    WATCH: "bg-cyan-500/20 text-cyan-400 border-cyan-500/50",
  };
  const icons: Record<ActionItem["action"], React.ReactNode> = {
    BUY: <TrendingUp className="w-3 h-3" />,
    SELL: <TrendingDown className="w-3 h-3" />,
    HOLD: <Minus className="w-3 h-3" />,
    WAIT: <Clock className="w-3 h-3" />,
    WATCH: <Target className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-bold ${styles[action]}`}>
      {icons[action]}{action}
    </span>
  );
}

function RegimeBadge({ regime }: { regime: string }) {
  const color = regime === "bull" ? "text-emerald-400 bg-emerald-500/20 border-emerald-500/40" :
    regime === "bear" ? "text-red-400 bg-red-500/20 border-red-500/40" :
    "text-amber-400 bg-amber-500/20 border-amber-500/40";
  const icon = regime === "bull" ? "🟢" : regime === "bear" ? "🔴" : "🟡";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-medium capitalize ${color}`}>
      {icon} {regime}
    </span>
  );
}

function ConfidenceMeter({ value }: { value: number }) {
  const color = value >= 70 ? "bg-emerald-500" : value >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-slate-400 font-mono">{value}%</span>
    </div>
  );
}

function SortHeader({ label, sortKey, currentSort, currentDir, onSort, className = "", title }: {
  label: string; sortKey: SortKey; currentSort: SortKey; currentDir: SortDir;
  onSort: (key: SortKey) => void; className?: string; title?: string;
}) {
  const active = currentSort === sortKey;
  return (
    <th
      className={`py-2 px-2 cursor-pointer hover:text-slate-300 select-none ${className}`}
      onClick={() => onSort(sortKey)}
      title={title}
    >
      <div className="flex items-center gap-1">
        {label}
        {active && (currentDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
      </div>
    </th>
  );
}

// ── Swap Explainer Panel ───────────────────────────────────────────

function SwapExplainer({ capitalRebalancing }: { capitalRebalancing?: CapitalRebalancing }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-slate-800/30 rounded-xl border border-slate-700/40 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-medium text-slate-400">How Swap Evaluation Works</span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-700/30 space-y-3">
          {/* Pipeline overview */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Decision Pipeline</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/50">
                <div className="text-amber-400 font-bold mb-1">1. Trigger Check</div>
                <p className="text-slate-400">
                  Capital must be {">"}90% deployed. Below that, cash is available for new BUY signals without selling.
                </p>
                {capitalRebalancing && (
                  <div className={`mt-1.5 font-mono text-[10px] px-1.5 py-0.5 rounded inline-block ${
                    capitalRebalancing.threshold_triggered
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-emerald-500/20 text-emerald-400"
                  }`}>
                    Currently: {capitalRebalancing.capital_deployed_pct.toFixed(1)}% deployed
                    {capitalRebalancing.threshold_triggered ? " → TRIGGERED" : " → not triggered"}
                  </div>
                )}
              </div>
              <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/50">
                <div className="text-cyan-400 font-bold mb-1">2. Score & Compare</div>
                <p className="text-slate-400">
                  Each open position gets a <span className="text-slate-300">weakness score</span> (0-100).
                  Each new BUY signal gets a <span className="text-slate-300">strength score</span> (0-100).
                  Weakest positions vs strongest signals.
                </p>
              </div>
              <div className="bg-slate-800/60 rounded-lg p-2.5 border border-slate-700/50">
                <div className="text-emerald-400 font-bold mb-1">3. Swap Gate</div>
                <p className="text-slate-400">
                  New signal must beat existing position by <span className="text-slate-300">+15 points</span>.
                  Position must be past 20% of its hold period.
                  Freed capital must cover the new position.
                </p>
              </div>
            </div>
          </div>

          {/* Scoring breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <h4 className="text-xs font-bold text-red-400 mb-1.5">Position Score (lower = weaker)</h4>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>Signal confidence at entry</span>
                  <span className="text-slate-500 font-mono">40%</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Unrealized P/L %</span>
                  <span className="text-slate-500 font-mono">20%</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Time remaining vs hold target</span>
                  <span className="text-slate-500 font-mono">20%</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Current regime (bull/sideways/bear)</span>
                  <span className="text-slate-500 font-mono">20%</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-400 mb-1.5">Signal Score (higher = stronger)</h4>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>Signal strength from pipeline</span>
                  <span className="text-slate-500 font-mono">40%</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Expected accuracy %</span>
                  <span className="text-slate-500 font-mono">25%</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Expected Sharpe ratio</span>
                  <span className="text-slate-500 font-mono">20%</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Current regime</span>
                  <span className="text-slate-500 font-mono">15%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Current status */}
          {capitalRebalancing && (
            <div className="bg-slate-800/80 rounded-lg p-2.5 border border-slate-700/50 text-[11px]">
              <span className="text-slate-500 font-medium">Status: </span>
              {capitalRebalancing.no_swap_reason ? (
                <span className="text-slate-400">{capitalRebalancing.no_swap_reason}</span>
              ) : capitalRebalancing.swap_suggestions.length > 0 ? (
                <span className="text-amber-400">
                  {capitalRebalancing.swap_suggestions.length} swap(s) suggested —
                  net improvement: +{capitalRebalancing.swap_suggestions.reduce((s, sw) => s + sw.net_improvement, 0).toFixed(0)} pts
                </span>
              ) : (
                <span className="text-emerald-400">All positions holding strong</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Swap Suggestions Panel ─────────────────────────────────────────

function SwapSuggestionsPanel({
  rebalancing,
  onTrade,
  tradingEnabled,
}: {
  rebalancing: CapitalRebalancing;
  onTrade?: (symbol: string, side: "buy" | "sell", qty: number, price: number, target?: number, stop?: number) => void;
  tradingEnabled?: boolean;
}) {
  const [executingSwap, setExecutingSwap] = useState<number | null>(null);

  const handleExecuteSwap = async (swap: SwapSuggestion, index: number) => {
    if (!onTrade || !tradingEnabled) return;
    setExecutingSwap(index);

    // Sell first, then buy
    const sellQty = Math.floor(swap.capital_freed / swap.sell.current_price);
    if (sellQty > 0) {
      onTrade(swap.sell.symbol, "sell", sellQty, swap.sell.current_price);
    }

    // Small delay to let the sell process
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Buy with freed capital
    const buyQty = Math.floor(swap.capital_freed / swap.buy.current_price);
    if (buyQty > 0) {
      onTrade(swap.buy.symbol, "buy", buyQty, swap.buy.current_price);
    }

    setTimeout(() => setExecutingSwap(null), 1000);
  };

  // No swaps but capital > 90% deployed — info banner
  if (rebalancing.threshold_triggered && rebalancing.swap_suggestions.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 flex items-center gap-3">
        <DollarSign className="w-5 h-5 text-amber-400 shrink-0" />
        <p className="text-sm text-slate-300">
          <span className="font-medium text-amber-400">
            💰 Capital {rebalancing.capital_deployed_pct.toFixed(1)}% deployed
          </span>
          {" — "}
          {rebalancing.no_swap_reason || "no higher-conviction opportunities found. Current positions are strong."}
        </p>
      </div>
    );
  }

  // Not triggered or no suggestions
  if (!rebalancing.threshold_triggered || rebalancing.swap_suggestions.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 rounded-xl border border-amber-500/40 overflow-hidden">
      {/* Header */}
      <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-amber-200">Capital Swap Suggestions</h3>
          <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
            {rebalancing.swap_suggestions.length} swap{rebalancing.swap_suggestions.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-amber-300/70">
          <span>{rebalancing.capital_deployed_pct.toFixed(1)}% deployed</span>
          <span>•</span>
          <span>${rebalancing.available_cash.toLocaleString("en-US", { maximumFractionDigits: 0 })} cash</span>
        </div>
      </div>

      {/* Description */}
      <div className="px-4 py-2 border-b border-amber-500/20">
        <p className="text-xs text-amber-200/60">
          Your capital is {rebalancing.capital_deployed_pct.toFixed(1)}% deployed.
          These swaps could improve portfolio quality by replacing weaker positions with stronger signals.
        </p>
      </div>

      {/* Swap Cards */}
      <div className="p-4 space-y-3">
        {rebalancing.swap_suggestions.map((swap, idx) => (
          <div
            key={`${swap.sell.symbol}-${swap.buy.symbol}`}
            className="bg-slate-800/60 rounded-lg border border-amber-500/20 p-4 hover:border-amber-500/40 transition-colors"
          >
            {/* Main row: SELL → BUY */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {/* Sell side */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/40">
                    SELL
                  </span>
                  <span className="font-bold text-slate-100">{swap.sell.symbol}</span>
                  <span className="text-xs text-slate-500 font-mono">(score: {swap.sell.score})</span>
                </div>

                <ArrowRight className="w-4 h-4 text-amber-400" />

                {/* Buy side */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    BUY
                  </span>
                  <span className="font-bold text-slate-100">{swap.buy.symbol}</span>
                  <span className="text-xs text-slate-500 font-mono">(score: {swap.buy.score})</span>
                </div>
              </div>

              {/* Execute button */}
              {tradingEnabled && onTrade && (
                <button
                  onClick={() => handleExecuteSwap(swap, idx)}
                  disabled={executingSwap === idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-colors"
                >
                  {executingSwap === idx ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <ArrowRight className="w-3 h-3" />
                  )}
                  Execute
                </button>
              )}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 mb-2 text-xs">
              <span className="text-amber-300 font-medium">
                Frees ${swap.capital_freed.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </span>
              <span className="text-emerald-400 font-mono font-bold">
                +{swap.net_improvement.toFixed(0)}pts improvement
              </span>
              {swap.sell.unrealized_pnl_pct !== 0 && (
                <span className={`font-mono ${swap.sell.unrealized_pnl_pct >= 0 ? "text-emerald-400/70" : "text-red-400/70"}`}>
                  {swap.sell.symbol} P&L: {swap.sell.unrealized_pnl_pct >= 0 ? "+" : ""}{swap.sell.unrealized_pnl_pct.toFixed(1)}%
                </span>
              )}
              {swap.buy.expected_sharpe > 0 && (
                <span className="text-slate-400">
                  Sharpe: {swap.buy.expected_sharpe.toFixed(1)}
                </span>
              )}
            </div>

            {/* Rationale */}
            <div className="text-xs text-slate-400">
              <span className="text-red-400/80">{swap.sell.weakness_rationale}</span>
              {" → "}
              <span className="text-emerald-400/80">{swap.buy.strength_rationale}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer disclaimer */}
      <div className="px-4 py-2 border-t border-amber-500/20 flex items-center gap-2">
        <Info className="w-3 h-3 text-amber-400/50 shrink-0" />
        <p className="text-[10px] text-amber-200/40">
          Suggestions based on position scores (confidence, P&L, hold period, regime) vs signal scores (strength, accuracy, Sharpe, regime). Min +15pt improvement required.
        </p>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export default function ActionsDashboard({
  positions = [],
  cash = 0,
  onTrade,
  tradingEnabled = false,
  onAnalyze,
}: ActionsDashboardProps) {
  const [data, setData] = useState<MREData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tradingSymbol, setTradingSymbol] = useState<string | null>(null);
  const [pitData, setPitData] = useState<Record<string, { pit_verdict: string }>>({});

  // Filter / sort / group state
  const [signalFilter, setSignalFilter] = useState<SignalFilter>("ACTIONABLE");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [sortKey, setSortKey] = useState<SortKey>("signalStrength");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    async function load() {
      try {
        // Load core, universe, and pit data
        const [coreRes, universeRes, pitRes] = await Promise.all([
          fetch("/data/trading/mre-signals.json"),
          fetch("/data/trading/mre-signals-universe.json"),
          fetch("/data/trading/pit-recommendations.json"),
        ]);
        
        if (!coreRes.ok) throw new Error("Failed to load core signals");
        if (!universeRes.ok) throw new Error("Failed to load universe signals");
        
        const coreData = await coreRes.json();
        const universeData = await universeRes.json();
        
        // Pit fleet data (optional — don't fail if missing)
        if (pitRes.ok) {
          try {
            const pitJson = await pitRes.json();
            setPitData(pitJson.assets || {});
          } catch { /* ignore parse errors */ }
        }
        
        // Merge the data
        const mergedData = {
          ...coreData,
          universeData,
          allAssets: universeData.signals.by_asset_class,
        };
        
        setData(mergedData);
      } catch {
        setError("Could not load market signals");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const actions = useMemo(() => data ? generateActions(data) : [], [data]);
  const thesis = useMemo(() => data ? generateThesis(data) : "", [data]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const getPosition = (symbol: string) => positions.find((p) => p.symbol === symbol);
  const getPnl = (item: ActionItem) => {
    const pos = getPosition(item.symbol);
    if (!pos || pos.qty <= 0) return 0;
    return (item.currentPrice - pos.entry_price) * pos.qty;
  };

  // Merge portfolio positions that don't have signals into the actions list
  const actionsWithPositions = useMemo(() => {
    const items = [...actions];
    if (positions && positions.length > 0) {
      const existingSymbols = new Set(items.map(i => i.symbol));
      for (const pos of positions) {
        if (pos.qty > 0 && !existingSymbols.has(pos.symbol)) {
          items.push({
            symbol: pos.symbol,
            assetClass: "portfolio",
            category: "Portfolio",
            categoryIcon: "📦",
            regime: "—",
            regimeStage: "unknown",
            regimeDays: 0,
            momentum: 0,
            action: "HOLD",
            entry: null,
            entryDisplay: "—",
            stop: null,
            stopDisplay: "—",
            target: null,
            targetDisplay: "—",
            currentPrice: pos.entry_price,
            confidence: 0,
            sharpe: 0,
            holdDays: 0,
            rationale: "Portfolio holding — no active MRE signal",
            priority: 3,
            signalSource: "portfolio",
            signalStrength: 0,
            isCore: false,
            rsi14: undefined,
            dipPercent: undefined,
            sector: undefined,
            swapScore: 0,
            consensus: 0,
            strategyVotes: undefined,
          });
        }
      }
    }
    return items;
  }, [actions, positions]);

  // Filter + sort
  const filteredActions = useMemo(() => {
    let items = [...actionsWithPositions];
    
    if (signalFilter === "ACTIONABLE") {
      // Show BUY/SELL signals + portfolio positions
      items = items.filter(a => {
        if (a.action === "BUY" || a.action === "SELL") return true;
        const p = getPosition(a.symbol);
        return p && p.qty > 0;
      });
    } else if (signalFilter === "POSITIONS") {
      items = items.filter(a => {
        const p = getPosition(a.symbol);
        return p && p.qty > 0;
      });
    } else if (signalFilter === "BROAD_MARKET") {
      items = items.filter(a => a.category === "Broad Market");
    } else if (signalFilter === "SECTORS") {
      items = items.filter(a => a.category === "Sectors");
    } else if (signalFilter === "INTERNATIONAL") {
      items = items.filter(a => a.category === "International");
    } else if (signalFilter === "BONDS") {
      items = items.filter(a => a.category === "Fixed Income");
    } else if (signalFilter === "COMMODITIES") {
      items = items.filter(a => a.category === "Commodities");
    } else if (signalFilter === "CORE") {
      items = items.filter(a => a.isCore === true);
    } else if (signalFilter === "UNIVERSE") {
      items = items.filter(a => !a.isCore); // Show all non-core assets
    } else if (signalFilter !== "ALL") {
      items = items.filter(a => a.action === signalFilter);
    }

    items.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "symbol": cmp = a.symbol.localeCompare(b.symbol); break;
        case "action": cmp = a.priority - b.priority; break;
        case "regime": cmp = a.regime.localeCompare(b.regime); break;
        case "confidence": cmp = a.confidence - b.confidence; break;
        case "currentPrice": cmp = a.currentPrice - b.currentPrice; break;
        case "pnl": cmp = getPnl(a) - getPnl(b); break;
        case "momentum": cmp = a.momentum - b.momentum; break;
        case "assetClass": cmp = a.assetClass.localeCompare(b.assetClass); break;
        case "sharpe": cmp = a.sharpe - b.sharpe; break;
        case "signalStrength": cmp = (a.signalStrength || 0) - (b.signalStrength || 0); break;
        case "swapScore": cmp = (a.swapScore || 0) - (b.swapScore || 0); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionsWithPositions, signalFilter, sortKey, sortDir, positions]);

  // Group
  const groupedActions = useMemo(() => {
    if (groupBy === "none") return { "": filteredActions };
    const groups: Record<string, ActionItem[]> = {};
    for (const item of filteredActions) {
      const key = groupBy === "assetClass" ? item.assetClass 
        : groupBy === "category" ? item.category 
        : item.regime;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }, [filteredActions, groupBy]);

  const handleTrade = (item: ActionItem) => {
    if (!onTrade || !tradingEnabled) return;
    setTradingSymbol(item.symbol);
    const position = getPosition(item.symbol);
    if (item.action === "BUY" && item.entry) {
      const minAlloc = 0.08; const maxAlloc = 0.25;
      const cn = Math.max(50, Math.min(90, item.confidence));
      const allocPct = minAlloc + ((cn - 50) / 40) * (maxAlloc - minAlloc);
      const allocation = Math.min(cash * allocPct, cash);
      const shares = Math.floor(allocation / item.currentPrice);
      if (shares > 0) onTrade(item.symbol, "buy", shares, item.currentPrice, item.target || undefined, item.stop || undefined);
    } else if (position && position.qty > 0) {
      onTrade(item.symbol, "sell", position.qty, item.currentPrice);
    }
    setTimeout(() => setTradingSymbol(null), 500);
  };

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

  const updated = new Date(data.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const positionsWithQty = positions.filter(p => p.qty > 0);
  const signalCounts = {
    ACTIONABLE: actions.filter(a => a.action === "BUY" || a.action === "SELL").length + positionsWithQty.length,
    ALL: actionsWithPositions.length,
    BUY: actions.filter(a => a.action === "BUY").length,
    HOLD: actions.filter(a => a.action === "HOLD").length,
    WATCH: actions.filter(a => a.action === "WATCH").length,
    WAIT: actions.filter(a => a.action === "WAIT").length,
    SELL: actions.filter(a => a.action === "SELL").length,
    POSITIONS: positionsWithQty.length,
    BROAD_MARKET: actions.filter(a => a.category === "Broad Market").length,
    SECTORS: actions.filter(a => a.category === "Sectors").length,
    INTERNATIONAL: actions.filter(a => a.category === "International").length,
    BONDS: actions.filter(a => a.category === "Fixed Income").length,
    COMMODITIES: actions.filter(a => a.category === "Commodities").length,
    CORE: actions.filter(a => a.isCore === true).length,
    UNIVERSE: actions.filter(a => !a.isCore).length,
  };

  // Portfolio totals
  const totalPnl = positions.reduce((sum, pos) => {
    const asset = actions.find(a => a.symbol === pos.symbol);
    return sum + ((asset?.currentPrice || pos.entry_price) - pos.entry_price) * pos.qty;
  }, 0);
  const totalCost = positions.reduce((sum, pos) => sum + pos.entry_price * pos.qty, 0);
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const renderRow = (item: ActionItem) => {
    const position = getPosition(item.symbol);
    const hasPosition = position && position.qty > 0;
    const isTrading = tradingSymbol === item.symbol;
    const pnl = hasPosition ? (item.currentPrice - position.entry_price) * position.qty : 0;
    const pnlPct = hasPosition ? ((item.currentPrice - position.entry_price) / position.entry_price) * 100 : 0;
    const isUp = pnl >= 0;

    return (
      <tr key={item.symbol} className="border-b border-slate-800 hover:bg-slate-800/50">
        {/* Asset */}
        <td className="py-2.5 px-2">
          <div className="flex items-center gap-2">
            <div>
              <span className="font-bold text-slate-100">{item.symbol}</span>
              <p className="text-[10px] text-slate-500 capitalize">{item.assetClass}</p>
            </div>
            <span className="text-xs opacity-80">{item.categoryIcon}</span>
          </div>
        </td>
        {/* Signal */}
        <td className="py-2.5 px-2"><ActionBadge action={item.action} /></td>
        {/* Pit Verdict */}
        <td className="py-2.5 px-2">
          {(() => {
            const pit = pitData[item.symbol];
            if (!pit?.pit_verdict) return <span className="text-xs text-slate-600">—</span>;
            const v = pit.pit_verdict.toUpperCase();
            const color = v.startsWith("STRONG BUY") ? "bg-emerald-500/30 text-emerald-300 border-emerald-400/60 shadow-sm shadow-emerald-500/20"
              : v.startsWith("STRONG SELL") ? "bg-red-500/30 text-red-300 border-red-400/60 shadow-sm shadow-red-500/20"
              : v.startsWith("BUY") ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
              : v.startsWith("CAUTIOUS") ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
              : v.startsWith("SELL") ? "bg-red-500/20 text-red-400 border-red-500/50"
              : v.startsWith("AVOID") ? "bg-red-500/20 text-red-400 border-red-500/50"
              : "bg-slate-500/20 text-slate-400 border-slate-500/50";
            const label = v.split("—")[0].split("–")[0].trim();
            return <span className={`inline-flex px-1.5 py-0.5 rounded border text-[10px] font-bold ${color}`}>{label}</span>;
          })()}
        </td>
        {/* Consensus */}
        <td className="py-2.5 px-2">
          {(() => {
            const c = item.consensus ?? 0;
            const color = c >= 4 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
              : c === 3 ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
              : "bg-slate-500/20 text-slate-400 border-slate-500/50";
            return <span className={`inline-flex px-1.5 py-0.5 rounded border text-[10px] font-bold ${color}`}>{c}/5{c >= 3 ? " ✓" : ""}</span>;
          })()}
        </td>
        {/* Regime */}
        <td className="py-2.5 px-2"><RegimeBadge regime={item.regime} /></td>
        {/* Confidence */}
        <td className="py-2.5 px-2"><ConfidenceMeter value={item.confidence} /></td>
        {/* Price */}
        <td className="py-2.5 px-2 font-mono text-sm text-slate-200">${item.currentPrice.toFixed(2)}</td>
        {/* Momentum */}
        <td className="py-2.5 px-2 font-mono text-xs">
          <span className={item.momentum > 0 ? "text-emerald-400" : item.momentum < 0 ? "text-red-400" : "text-slate-400"}>
            {item.momentum > 0 ? "+" : ""}{item.momentum.toFixed(1)}%
          </span>
        </td>
        {/* Signal Strength */}
        <td className="py-2.5 px-2 font-mono text-xs text-slate-300">
          {item.signalStrength !== undefined ? item.signalStrength : "—"}
        </td>
        {/* Swap Score (composite) */}
        <td className="py-2.5 px-2 font-mono text-xs">
          {item.swapScore !== undefined ? (
            <span className={`font-bold ${
              item.swapScore >= 70 ? "text-emerald-400" :
              item.swapScore >= 50 ? "text-amber-400" :
              "text-red-400"
            }`}>
              {item.swapScore}
            </span>
          ) : "—"}
        </td>
        {/* RSI */}
        <td className="py-2.5 px-2 font-mono text-xs text-slate-300">
          {item.rsi14 ? item.rsi14.toFixed(1) : "—"}
        </td>
        {/* 5d Dip */}
        <td className="py-2.5 px-2 font-mono text-xs">
          {item.dipPercent ? (
            <span className={item.dipPercent > 0 ? "text-red-400" : "text-emerald-400"}>
              {item.dipPercent > 0 ? "+" : ""}{item.dipPercent.toFixed(1)}%
            </span>
          ) : "—"}
        </td>
        {/* Position */}
        <td className="py-2.5 px-2">
          {hasPosition ? (
            <div className="text-xs">
              <span className="text-emerald-400 font-mono">{position.qty}sh</span>
              <p className="text-slate-500">@ ${position.entry_price.toFixed(2)}</p>
            </div>
          ) : <span className="text-xs text-slate-600">—</span>}
        </td>
        {/* P&L */}
        <td className="py-2.5 px-2 text-right">
          {hasPosition ? (
            <div className="text-xs font-mono">
              <span className={isUp ? "text-emerald-400" : "text-red-400"}>
                {isUp ? "+" : ""}${pnl.toFixed(2)}
              </span>
              <p className={isUp ? "text-emerald-400/70" : "text-red-400/70"}>
                {isUp ? "+" : ""}{pnlPct.toFixed(2)}%
              </p>
            </div>
          ) : <span className="text-xs text-slate-600">—</span>}
        </td>
        {/* Entry */}
        <td className="py-2.5 px-2 font-mono text-xs text-slate-300">{item.entryDisplay}</td>
        {/* Stop / Target */}
        <td className="py-2.5 px-2 font-mono text-xs text-red-400/80">{item.stopDisplay}</td>
        <td className="py-2.5 px-2 font-mono text-xs text-emerald-400/80">{item.targetDisplay}</td>
        {/* Analyze */}
        {onAnalyze && (
          <td className="py-2.5 px-2 text-center">
            <button
              onClick={() => onAnalyze(item.symbol)}
              className="inline-flex items-center gap-1 px-2 py-1 bg-primary-600/20 text-primary-400 hover:bg-primary-600/40 rounded-lg text-xs font-medium transition-colors"
              title={`Analyze ${item.symbol}`}
            >
              <BarChart3 className="w-3 h-3" />
              <span className="hidden sm:inline">Analyze</span>
            </button>
          </td>
        )}
        {/* Trade */}
        {tradingEnabled && (
          <td className="py-2.5 px-2 text-center">
            <div className="flex items-center gap-1 justify-center">
              {item.action === "BUY" && cash > item.currentPrice && (
                <button onClick={() => handleTrade(item)} disabled={isTrading}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg disabled:opacity-50">
                  {isTrading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShoppingCart className="w-3 h-3" />} Buy
                </button>
              )}
              {hasPosition && (
                <button
                  onClick={() => {
                    if (!onTrade || !position) return;
                    setTradingSymbol(item.symbol);
                    onTrade(item.symbol, "sell", position.qty, item.currentPrice);
                    setTimeout(() => setTradingSymbol(null), 500);
                  }}
                  disabled={isTrading}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 text-xs font-bold rounded-lg disabled:opacity-50 transition-colors">
                  {isTrading ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />} Sell
                </button>
              )}
              {!(item.action === "BUY" && cash > item.currentPrice) && !hasPosition && (
                <span className="text-xs text-slate-600">—</span>
              )}
            </div>
          </td>
        )}
      </tr>
    );
  };

  return (
    <div className="space-y-4">
      {/* Capital Swap Suggestions — shown above signals when triggered */}
      {data.capital_rebalancing && (
        <SwapSuggestionsPanel
          rebalancing={data.capital_rebalancing}
          onTrade={onTrade}
          tradingEnabled={tradingEnabled}
        />
      )}

      {/* How Swaps Work — collapsible explainer */}
      <SwapExplainer capitalRebalancing={data.capital_rebalancing} />

      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-primary-500/30 overflow-hidden">
        {/* Header */}
        <div className="bg-primary-600/20 border-b border-primary-500/30 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary-400" />
            <h2 className="font-bold text-lg text-slate-100">Today&apos;s Plays</h2>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
              {signalFilter === "ACTIONABLE" && filteredActions.length === 0 ? "No signals" :
               signalFilter === "ACTIONABLE" ? `${filteredActions.length} signals` :
               `${filteredActions.length} assets`}
            </span>
          </div>
          <span className="text-xs text-slate-500">Updated {updated}</span>
        </div>

        {/* Thesis */}
        <div className="px-4 py-2.5 bg-slate-800/50 border-b border-slate-700/50">
          <p className="text-sm text-slate-300 italic">
            <span className="text-primary-400 font-medium">Thesis:</span> {thesis}
          </p>
        </div>

        {/* Filter Bar */}
        <div className="px-4 py-2.5 border-b border-slate-700/50 flex flex-wrap items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          
          {/* Signal Filters */}
          {(["ACTIONABLE", "ALL", "BUY", "POSITIONS", "UNIVERSE"] as SignalFilter[]).map(f => (
            <button key={f} onClick={() => setSignalFilter(f)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                signalFilter === f
                  ? "bg-primary-500/30 text-primary-300 border border-primary-500/50"
                  : "bg-slate-800 text-slate-500 border border-slate-700 hover:text-slate-300"
              }`}>
              {f === "ACTIONABLE" ? `⚡ Today's Plays (${signalCounts.ACTIONABLE})` :
               f === "POSITIONS" ? `📦 Positions (${signalCounts.POSITIONS})` :
               f === "ALL" ? `All (${signalCounts.ALL})` :
               f === "CORE" ? `Core (${signalCounts.CORE})` :
               f === "UNIVERSE" ? `Universe (${signalCounts.UNIVERSE})` :
               `${f} (${signalCounts[f]})`}
            </button>
          ))}
          
          <div className="w-px h-4 bg-slate-700" />
          
          {/* Category Filters */}
          {(["BROAD_MARKET", "SECTORS", "INTERNATIONAL", "BONDS", "COMMODITIES"] as SignalFilter[]).map(f => (
            <button key={f} onClick={() => setSignalFilter(f)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                signalFilter === f
                  ? "bg-primary-500/30 text-primary-300 border border-primary-500/50"
                  : "bg-slate-800 text-slate-500 border border-slate-700 hover:text-slate-300"
              }`}>
              {f === "BROAD_MARKET" ? `📊 Broad (${signalCounts.BROAD_MARKET})` :
               f === "SECTORS" ? `🏭 Sectors (${signalCounts.SECTORS})` :
               f === "INTERNATIONAL" ? `🌍 Intl (${signalCounts.INTERNATIONAL})` :
               f === "BONDS" ? `🏛️ Bonds (${signalCounts.BONDS})` :
               `🥇 Commodities (${signalCounts.COMMODITIES})`}
            </button>
          ))}
          
          <div className="ml-auto flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <select value={groupBy} onChange={e => setGroupBy(e.target.value as GroupBy)}
              className="bg-slate-800 text-slate-400 text-xs border border-slate-700 rounded-lg px-2 py-1">
              <option value="none">No grouping</option>
              <option value="category">Group by Category</option>
              <option value="assetClass">Group by Class</option>
              <option value="regime">Group by Regime</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="p-4">
          {filteredActions.length === 0 ? (
            <div className="text-center py-6">
              <Shield className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400">
                {signalFilter === "ACTIONABLE" ? 
                  "No actionable signals today" : 
                  "No signals match filter."
                }
              </p>
              {signalFilter === "ACTIONABLE" && (
                <p className="text-slate-500 text-sm mt-2">
                  Check back later or view the full Universe for HOLD signals.
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] text-slate-500 uppercase border-b border-slate-700">
                    <SortHeader label="Asset" sortKey="symbol" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-left" title="Ticker symbol and sector" />
                    <SortHeader label="Signal" sortKey="action" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-left" title="MRE engine recommendation: BUY, HOLD, WATCH, or WAIT" />
                    <th className="text-left py-2 px-2" title="Pit Agent Fleet verdict — independent technical analysis by AI agents">Pit</th>
                    <th className="text-left py-2 px-2" title="How many of 5 internal strategies agree: Fear/Greed, Regime Confirmation, RSI Oversold, Mean Reversion, Momentum">Consensus</th>
                    <SortHeader label="Regime" sortKey="regime" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-left" title="Market regime detected by EMA crossover: Bull, Bear, or Sideways" />
                    <SortHeader label="Confidence" sortKey="confidence" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-left" title="Signal confidence score (0-100%) based on regime weight, calibration, and strategy agreement" />
                    <SortHeader label="Price" sortKey="currentPrice" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-left" title="Current market price" />
                    <SortHeader label="Mom 20d" sortKey="momentum" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-left" title="20-day price momentum (percentage change over last 20 trading days)" />
                    <SortHeader label="Signal Str" sortKey="signalStrength" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-left" title="Raw signal strength before regime weighting and calibration adjustments" />
                    <SortHeader label="Swap Score" sortKey="swapScore" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-left" title="Position swap ranking — higher score = stronger candidate to replace a weaker holding" />
                    <th className="text-left py-2 px-2" title="Relative Strength Index (14-day) — below 30 is oversold, above 70 is overbought">RSI</th>
                    <th className="text-left py-2 px-2" title="5-day return — how much the price has dropped in the last week">5d Dip</th>
                    <th className="text-left py-2 px-2" title="Current portfolio holding quantity and cost basis">Position</th>
                    <SortHeader label="Total P&L" sortKey="pnl" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" title="Unrealized profit/loss on the position" />
                    <th className="text-left py-2 px-2" title="Suggested entry price from Fibonacci analysis">Entry</th>
                    <th className="text-left py-2 px-2" title="Stop-loss price level">Stop</th>
                    <th className="text-left py-2 px-2" title="Profit target price level">Target</th>
                    {onAnalyze && <th className="text-center py-2 px-2">Analyze</th>}
                    {tradingEnabled && <th className="text-center py-2 px-2">Trade</th>}
                  </tr>
                </thead>
                {groupBy === "none" ? (
                  <tbody>{filteredActions.map(renderRow)}</tbody>
                ) : (
                  Object.entries(groupedActions).sort().map(([group, items]) => (
                    <tbody key={group}>
                      <tr className="bg-slate-800/60">
                        <td colSpan={(tradingEnabled ? 17 : 16) + (onAnalyze ? 1 : 0)} className="py-1.5 px-2 text-xs font-bold text-primary-400 uppercase tracking-wider">
                          {groupBy === "regime" && (group === "bull" ? "🟢 " : group === "bear" ? "🔴 " : "🟡 ")}
                          {groupBy === "category" && items.length > 0 && `${items[0].categoryIcon} `}
                          {group} ({items.length})
                        </td>
                      </tr>
                      {items.map(renderRow)}
                    </tbody>
                  ))
                )}
                {/* Portfolio Totals */}
                {positions.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-600 bg-slate-800/80">
                      <td className="py-2.5 px-2 font-bold text-slate-100" colSpan={12}>
                        Portfolio Total — {positions.filter(p => p.qty > 0).length} positions
                      </td>
                      <td className="py-2.5 px-2 text-xs text-slate-400">
                        ${totalCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold">
                        <span className={`text-sm ${totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
                        </span>
                        <p className={`text-xs ${totalPnl >= 0 ? "text-emerald-400/70" : "text-red-400/70"}`}>
                          {totalPnl >= 0 ? "+" : ""}{totalPnlPct.toFixed(2)}%
                        </p>
                      </td>
                      <td colSpan={(tradingEnabled ? 4 : 3) + (onAnalyze ? 1 : 0)} className="py-2.5 px-2 text-right text-xs text-slate-500">
                        Cash: ${cash.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <p className="text-xs text-slate-500">Fear &amp; Greed</p>
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
          <p className="text-xl font-bold text-primary-400">{signalCounts.BUY}</p>
          <p className="text-xs text-slate-500">Buy signals</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <p className="text-xs text-slate-500">Kalshi</p>
          <p className={`text-xl font-bold ${data.prediction_markets?.kalshi?.signal === "BULLISH" ? "text-emerald-400" : data.prediction_markets?.kalshi?.signal === "BEARISH" ? "text-red-400" : "text-slate-400"}`}>
            {data.prediction_markets?.kalshi?.signal || "—"}
          </p>
          <p className="text-xs text-slate-500">{data.prediction_markets?.kalshi?.confidence || 0}%</p>
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
              }`}>{data.breadth.signal}</span>
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
              <p className={`font-medium capitalize ${data.breadth.trend_5d === "expanding" ? "text-emerald-400" : data.breadth.trend_5d === "narrowing" ? "text-red-400" : "text-slate-300"}`}>{data.breadth.trend_5d}</p>
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
              ⚠️ SPY rising but breadth narrowing — rally may be thinning.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
