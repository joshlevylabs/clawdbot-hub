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
  fibonacci: FibonacciLevels;
  regime_details: RegimeDetails;
  expected_accuracy: number;
  expected_sharpe: number;
  hold_days: number;
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
}

interface Position {
  symbol: string;
  qty: number;
  entry_price: number;
}

export interface ActionItem {
  symbol: string;
  assetClass: string;
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
}

interface ActionsDashboardProps {
  positions?: Position[];
  cash?: number;
  onTrade?: (symbol: string, side: "buy" | "sell", qty: number, price: number, target?: number, stop?: number) => void;
  tradingEnabled?: boolean;
}

type SortKey = "symbol" | "action" | "regime" | "confidence" | "currentPrice" | "pnl" | "momentum" | "assetClass" | "sharpe";
type SortDir = "asc" | "desc";
type SignalFilter = "ALL" | "BUY" | "HOLD" | "WATCH" | "WAIT" | "SELL" | "POSITIONS";
type GroupBy = "none" | "assetClass" | "regime";

// ── Action generation ──────────────────────────────────────────────

function generateActions(data: MREData): ActionItem[] {
  const actions: ActionItem[] = [];
  const fg = data.fear_greed.current;

  for (const asset of data.signals.by_asset_class) {
    const { symbol, price, fibonacci, regime_details, expected_accuracy, signal, expected_sharpe, hold_days } = asset;
    const { regime, confidence, momentum_20d, regime_stage, regime_days } = regime_details;

    let action: ActionItem["action"] = "HOLD";
    let entry: number | null = null;
    let entryDisplay = "—";
    let stop: number | null = null;
    let stopDisplay = "—";
    let target: number | null = null;
    let targetDisplay = "—";
    let rationale = "";
    let priority = 3;

    const entryZoneParts = fibonacci.entry_zone.split(" - ").map(Number);
    const entryHigh = entryZoneParts[0];

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
      action = "HOLD";
      entry = entryHigh;
      entryDisplay = `$${entryHigh.toFixed(2)} (dip)`;
      target = fibonacci.profit_targets[0];
      targetDisplay = `$${target.toFixed(2)}`;
      rationale = `${regime} regime, ${confidence}% confidence. F&G ${fg.toFixed(0)}.`;
      priority = 3;
      if (momentum_20d > 5) rationale += ` Strong momentum (+${momentum_20d.toFixed(1)}%).`;
    }

    actions.push({
      symbol,
      assetClass: asset.asset_class.replace(/_/g, " "),
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

function SortHeader({ label, sortKey, currentSort, currentDir, onSort, className = "" }: {
  label: string; sortKey: SortKey; currentSort: SortKey; currentDir: SortDir;
  onSort: (key: SortKey) => void; className?: string;
}) {
  const active = currentSort === sortKey;
  return (
    <th
      className={`py-2 px-2 cursor-pointer hover:text-slate-300 select-none ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {active && (currentDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
      </div>
    </th>
  );
}

// ── Main Component ─────────────────────────────────────────────────

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

  // Filter / sort / group state
  const [signalFilter, setSignalFilter] = useState<SignalFilter>("ALL");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [sortKey, setSortKey] = useState<SortKey>("confidence");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/data/trading/mre-signals.json");
        if (!res.ok) throw new Error("Failed to load signals");
        setData(await res.json());
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

  // Filter + sort
  const filteredActions = useMemo(() => {
    let items = [...actions];
    if (signalFilter === "POSITIONS") {
      items = items.filter(a => {
        const p = getPosition(a.symbol);
        return p && p.qty > 0;
      });
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
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, signalFilter, sortKey, sortDir, positions]);

  // Group
  const groupedActions = useMemo(() => {
    if (groupBy === "none") return { "": filteredActions };
    const groups: Record<string, ActionItem[]> = {};
    for (const item of filteredActions) {
      const key = groupBy === "assetClass" ? item.assetClass : item.regime;
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
  const signalCounts = {
    ALL: actions.length,
    BUY: actions.filter(a => a.action === "BUY").length,
    HOLD: actions.filter(a => a.action === "HOLD").length,
    WATCH: actions.filter(a => a.action === "WATCH").length,
    WAIT: actions.filter(a => a.action === "WAIT").length,
    SELL: actions.filter(a => a.action === "SELL").length,
    POSITIONS: positions.filter(p => p.qty > 0).length,
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
          <span className="font-bold text-slate-100">{item.symbol}</span>
          <p className="text-[10px] text-slate-500 capitalize">{item.assetClass}</p>
        </td>
        {/* Signal */}
        <td className="py-2.5 px-2"><ActionBadge action={item.action} /></td>
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
        {/* Trade */}
        {tradingEnabled && (
          <td className="py-2.5 px-2 text-center">
            {item.action === "BUY" && !hasPosition && cash > item.currentPrice ? (
              <button onClick={() => handleTrade(item)} disabled={isTrading}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg disabled:opacity-50">
                {isTrading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShoppingCart className="w-3 h-3" />} Buy
              </button>
            ) : hasPosition ? (
              <button onClick={() => handleTrade(item)} disabled={isTrading}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg disabled:opacity-50">
                {isTrading ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />} Sell
              </button>
            ) : <span className="text-xs text-slate-600">—</span>}
          </td>
        )}
      </tr>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-primary-500/30 overflow-hidden">
        {/* Header */}
        <div className="bg-primary-600/20 border-b border-primary-500/30 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary-400" />
            <h2 className="font-bold text-lg text-slate-100">Today&apos;s Plays</h2>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{filteredActions.length} assets</span>
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
          {(["ALL", "BUY", "HOLD", "WATCH", "WAIT", "POSITIONS"] as SignalFilter[]).map(f => (
            <button key={f} onClick={() => setSignalFilter(f)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                signalFilter === f
                  ? "bg-primary-500/30 text-primary-300 border border-primary-500/50"
                  : "bg-slate-800 text-slate-500 border border-slate-700 hover:text-slate-300"
              }`}>
              {f === "POSITIONS" ? `📦 Positions (${signalCounts.POSITIONS})` :
               f === "ALL" ? `All (${signalCounts.ALL})` :
               `${f} (${signalCounts[f]})`}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <select value={groupBy} onChange={e => setGroupBy(e.target.value as GroupBy)}
              className="bg-slate-800 text-slate-400 text-xs border border-slate-700 rounded-lg px-2 py-1">
              <option value="none">No grouping</option>
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
              <p className="text-slate-400">No signals match filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] text-slate-500 uppercase border-b border-slate-700">
                    <SortHeader label="Asset" sortKey="symbol" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-left" />
                    <SortHeader label="Signal" sortKey="action" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-left" />
                    <SortHeader label="Regime" sortKey="regime" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-left" />
                    <SortHeader label="Confidence" sortKey="confidence" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-left" />
                    <SortHeader label="Price" sortKey="currentPrice" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-left" />
                    <SortHeader label="Mom 20d" sortKey="momentum" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-left" />
                    <th className="text-left py-2 px-2">Position</th>
                    <SortHeader label="Total P&L" sortKey="pnl" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right" />
                    <th className="text-left py-2 px-2">Entry</th>
                    <th className="text-left py-2 px-2">Stop</th>
                    <th className="text-left py-2 px-2">Target</th>
                    {tradingEnabled && <th className="text-center py-2 px-2">Trade</th>}
                  </tr>
                </thead>
                {groupBy === "none" ? (
                  <tbody>{filteredActions.map(renderRow)}</tbody>
                ) : (
                  Object.entries(groupedActions).sort().map(([group, items]) => (
                    <tbody key={group}>
                      <tr className="bg-slate-800/60">
                        <td colSpan={tradingEnabled ? 12 : 11} className="py-1.5 px-2 text-xs font-bold text-primary-400 uppercase tracking-wider">
                          {groupBy === "regime" && (group === "bull" ? "🟢 " : group === "bear" ? "🔴 " : "🟡 ")}
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
                      <td className="py-2.5 px-2 font-bold text-slate-100" colSpan={4}>
                        Portfolio Total — {positions.filter(p => p.qty > 0).length} positions
                      </td>
                      <td className="py-2.5 px-2 font-mono text-sm text-slate-200">
                        ${(totalCost + totalPnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td></td>
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
                      <td colSpan={tradingEnabled ? 4 : 3} className="py-2.5 px-2 text-right text-xs text-slate-500">
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
          <p className="text-xl font-bold text-primary-400">{data.signals.summary.total_buy}</p>
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
