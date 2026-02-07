"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Clock,
  Zap,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

interface MRESignal {
  symbol: string;
  signal: string;
  price: number;
  regime: string;
  confidence: number;
  momentum_20d: number;
}

interface MREData {
  timestamp: string;
  fear_greed: {
    current: number;
    rating: string;
  };
  regime: {
    global: string;
  };
  signals: {
    summary: {
      total_buy: number;
      total_hold: number;
    };
    by_asset_class: MRESignal[];
  };
}

interface ActionItem {
  symbol: string;
  action: "BUY" | "HOLD" | "WATCH" | "WAIT";
  price: number;
  confidence: number;
}

function getAction(signal: MRESignal, fearGreed: number): ActionItem["action"] {
  if (fearGreed < 30) return "BUY";
  if (signal.regime === "bull" && signal.confidence >= 70 && signal.momentum_20d > 0) {
    return "BUY";
  }
  if (signal.regime === "sideways") return "WATCH";
  if (signal.regime === "bear") return "WAIT";
  return "HOLD";
}

function ActionBadge({ action }: { action: ActionItem["action"] }) {
  const styles: Record<ActionItem["action"], string> = {
    BUY: "bg-emerald-500/20 text-emerald-400",
    HOLD: "bg-slate-500/20 text-slate-400",
    WATCH: "bg-cyan-500/20 text-cyan-400",
    WAIT: "bg-amber-500/20 text-amber-400",
  };
  const icons: Record<ActionItem["action"], React.ReactNode> = {
    BUY: <TrendingUp className="w-3 h-3" />,
    HOLD: <Minus className="w-3 h-3" />,
    WATCH: <Target className="w-3 h-3" />,
    WAIT: <Clock className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${styles[action]}`}>
      {icons[action]} {action}
    </span>
  );
}

export default function MREWidget() {
  const [data, setData] = useState<MREData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/data/trading/mre-signals.json");
        if (res.ok) setData(await res.json());
      } catch (e) {
        console.error("MRE load error:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-850 to-primary-950/20 rounded-xl border border-slate-800 p-5 animate-pulse">
        <div className="h-5 bg-slate-800 rounded w-1/3 mb-4" />
        <div className="h-20 bg-slate-800 rounded" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gradient-to-br from-slate-850 to-primary-950/20 rounded-xl border border-slate-800 p-5">
        <div className="text-center py-4 text-slate-500">
          <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
          <p className="text-sm">MRE data unavailable</p>
        </div>
      </div>
    );
  }

  const fg = data.fear_greed.current;
  const fgColor = fg < 30 ? "text-red-400" : fg > 70 ? "text-emerald-400" : "text-amber-400";
  const regimeColor = data.regime.global === "bull" ? "text-emerald-400" : 
                      data.regime.global === "bear" ? "text-red-400" : "text-amber-400";

  // Generate today's plays
  const todaysPlays: ActionItem[] = data.signals.by_asset_class
    .map((s) => ({
      symbol: s.symbol,
      action: getAction(s, fg),
      price: s.price,
      confidence: Math.round((s as any).expected_accuracy || 65),
    }))
    .filter((p) => p.action === "BUY" || p.action === "WATCH")
    .slice(0, 4);

  return (
    <div className="bg-gradient-to-br from-slate-850 to-primary-950/20 rounded-xl border border-primary-500/30 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600/20 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-400" strokeWidth={1.5} />
          </div>
          <h2 className="font-semibold text-slate-200">MRE Trading</h2>
        </div>
        <Link href="/trading" className="text-xs text-primary-400 hover:text-primary-300">
          View Full →
        </Link>
      </div>

      {/* Sentiment Row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">Fear/Greed</p>
          <p className={`text-2xl font-bold ${fgColor}`}>{fg.toFixed(0)}</p>
          <p className="text-xs text-slate-500 capitalize">{data.fear_greed.rating}</p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">Regime</p>
          <p className={`text-2xl font-bold capitalize ${regimeColor}`}>{data.regime.global}</p>
          <p className="text-xs text-slate-500">Global</p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <p className="text-xs text-slate-500 mb-1">Signals</p>
          <p className="text-2xl font-bold text-primary-400">{data.signals.summary.total_buy}</p>
          <p className="text-xs text-slate-500">Buy</p>
        </div>
      </div>

      {/* Today's Plays */}
      <div className="border-t border-slate-800 pt-3">
        <p className="text-xs text-slate-500 uppercase mb-2">Today's Plays</p>
        {todaysPlays.length === 0 ? (
          <p className="text-sm text-slate-500">No active signals — market in wait mode</p>
        ) : (
          <div className="space-y-2">
            {todaysPlays.map((play) => (
              <div key={play.symbol} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200">{play.symbol}</span>
                  <span className="text-xs text-slate-500">${play.price.toFixed(2)}</span>
                </div>
                <ActionBadge action={play.action} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
