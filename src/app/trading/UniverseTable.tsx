"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Star,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Globe,
  Clock,
  Filter,
  X,
} from "lucide-react";

// ============ TYPES ============

interface UniverseSignal {
  symbol: string;
  signal: string;
  signal_strength: number;
  asset_class: string;
  sector: string;
  price: number;
  regime: string;
  hold_days: number;
  is_core: boolean;
  expected_accuracy: number;
  expected_sharpe: number;
  momentum_20d: number;
  volatility_20d: number;
  role: string;
}

interface UniverseData {
  timestamp: string;
  last_updated: string;
  universe_size: number;
  core_size: number;
  data_date: string;
  fear_greed: {
    current: number;
    rating: string;
  };
  regime: {
    global: string;
    bear_pct: number;
    bear_count: number;
    total_assets: number;
  };
  rotation?: {
    cycle_phase: string;
    cycle_confidence: number;
  };
  signals: {
    summary: {
      total_buy: number;
      total_hold: number;
      total_watch: number;
    };
    by_asset_class: UniverseSignal[];
  };
}

// ============ HELPERS ============

type SortField =
  | "symbol"
  | "signal"
  | "signal_strength"
  | "price"
  | "regime"
  | "sector"
  | "momentum_20d"
  | "volatility_20d"
  | "expected_accuracy";

type SortDir = "asc" | "desc";

const SIGNAL_ORDER: Record<string, number> = { BUY: 0, WATCH: 1, HOLD: 2, SELL: 3 };
const REGIME_ORDER: Record<string, number> = { bull: 0, sideways: 1, bear: 2 };

const PAGE_SIZE = 50;

// Major sectors for filter chips (grouped from the 24 unique sectors)
const MAJOR_SECTORS = [
  "Information Technology",
  "Financials",
  "Health Care",
  "Industrials",
  "Consumer Discretionary",
  "Consumer Staples",
  "Energy",
  "Real Estate",
  "Materials",
  "Utilities",
  "Communication Services",
  "Fixed Income",
  "ETF",
  "International",
];

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 100) return price.toFixed(2);
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(4);
}

function fgColor(score: number): string {
  if (score <= 25) return "text-red-400";
  if (score <= 40) return "text-orange-400";
  if (score <= 60) return "text-yellow-400";
  if (score <= 75) return "text-lime-400";
  return "text-emerald-400";
}

function fgLabel(rating: string): string {
  return rating.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ============ COMPONENTS ============

function FilterChip({
  label,
  active,
  onClick,
  colorClass,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  colorClass?: string;
}) {
  const base = active
    ? colorClass || "bg-primary-600 text-white border-primary-500"
    : "bg-slate-800/60 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-300";
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${base}`}
    >
      {label}
    </button>
  );
}

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <ChevronsUpDown className="w-3 h-3 text-slate-600 ml-1 inline" />;
  return sortDir === "asc" ? (
    <ChevronUp className="w-3 h-3 text-primary-400 ml-1 inline" />
  ) : (
    <ChevronDown className="w-3 h-3 text-primary-400 ml-1 inline" />
  );
}

// ============ MAIN COMPONENT ============

export default function UniverseTable() {
  const [data, setData] = useState<UniverseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [signalFilters, setSignalFilters] = useState<Set<string>>(new Set());
  const [sectorFilters, setSectorFilters] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<"all" | "core" | "stock" | "etf">("all");
  const [regimeFilters, setRegimeFilters] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Sort
  const [sortField, setSortField] = useState<SortField>("signal");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Pagination
  const [page, setPage] = useState(0);

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/data/trading/mre-signals-universe.json?" + Date.now());
      if (!res.ok) throw new Error("Failed to fetch universe signals");
      const json: UniverseData = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError("Failed to load universe signals");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Toggle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "symbol" || field === "sector" ? "asc" : "desc");
    }
    setPage(0);
  };

  // Toggle set filters
  const toggleFilter = (set: Set<string>, value: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
    setPage(0);
  };

  // Derived: unique sectors from data
  const availableSectors = useMemo(() => {
    if (!data) return MAJOR_SECTORS;
    const sectors = new Set(data.signals.by_asset_class.map((s) => s.sector));
    return MAJOR_SECTORS.filter((s) => sectors.has(s));
  }, [data]);

  // Filtered + sorted
  const { filteredSignals, totalFiltered } = useMemo(() => {
    if (!data) return { filteredSignals: [], totalFiltered: 0 };

    let signals = [...data.signals.by_asset_class];

    // Search
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      signals = signals.filter((s) => s.symbol.includes(q));
    }

    // Signal filter
    if (signalFilters.size > 0) {
      signals = signals.filter((s) => signalFilters.has(s.signal));
    }

    // Sector filter
    if (sectorFilters.size > 0) {
      signals = signals.filter((s) => sectorFilters.has(s.sector));
    }

    // Type filter
    if (typeFilter === "core") {
      signals = signals.filter((s) => s.is_core);
    } else if (typeFilter === "etf") {
      signals = signals.filter((s) => s.sector === "ETF" || s.sector === "Broad Market" || s.sector === "Fixed Income" || s.sector === "International" || s.sector === "Leveraged" || s.sector === "Thematic" || s.sector === "Factor" || s.sector === "Dividend");
    } else if (typeFilter === "stock") {
      signals = signals.filter((s) => !s.is_core && s.sector !== "ETF" && s.sector !== "Broad Market" && s.sector !== "Fixed Income" && s.sector !== "International" && s.sector !== "Leveraged" && s.sector !== "Thematic" && s.sector !== "Factor" && s.sector !== "Dividend");
    }

    // Regime filter
    if (regimeFilters.size > 0) {
      signals = signals.filter((s) => regimeFilters.has(s.regime));
    }

    const totalFiltered = signals.length;

    // Sort
    signals.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "symbol":
          cmp = a.symbol.localeCompare(b.symbol);
          break;
        case "signal":
          cmp = (SIGNAL_ORDER[a.signal] ?? 9) - (SIGNAL_ORDER[b.signal] ?? 9);
          if (cmp === 0) cmp = b.signal_strength - a.signal_strength;
          break;
        case "signal_strength":
          cmp = a.signal_strength - b.signal_strength;
          break;
        case "price":
          cmp = a.price - b.price;
          break;
        case "regime":
          cmp = (REGIME_ORDER[a.regime] ?? 9) - (REGIME_ORDER[b.regime] ?? 9);
          break;
        case "sector":
          cmp = a.sector.localeCompare(b.sector);
          break;
        case "momentum_20d":
          cmp = a.momentum_20d - b.momentum_20d;
          break;
        case "volatility_20d":
          cmp = a.volatility_20d - b.volatility_20d;
          break;
        case "expected_accuracy":
          cmp = a.expected_accuracy - b.expected_accuracy;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return { filteredSignals: signals, totalFiltered };
  }, [data, search, signalFilters, sectorFilters, typeFilter, regimeFilters, sortField, sortDir]);

  // Paginated slice
  const totalPages = Math.ceil(totalFiltered / PAGE_SIZE);
  const pageSignals = filteredSignals.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const hasActiveFilters = search.trim() || signalFilters.size > 0 || sectorFilters.size > 0 || typeFilter !== "all" || regimeFilters.size > 0;

  const clearFilters = () => {
    setSearch("");
    setSignalFilters(new Set());
    setSectorFilters(new Set());
    setTypeFilter("all");
    setRegimeFilters(new Set());
    setPage(0);
  };

  // Loading state
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-300">{error}</p>
          <button onClick={fetchData} className="mt-4 px-4 py-2 bg-primary-600 rounded-lg text-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary } = data.signals;

  return (
    <div className="space-y-4">
      {/* ===== Summary Bar ===== */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {/* Counts */}
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary-400" />
            <span className="text-sm text-slate-400">Universe:</span>
            <span className="text-sm font-bold text-slate-100">{data.universe_size}</span>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-emerald-400 font-semibold">{summary.total_buy}</span>
              <span className="text-slate-500">BUY</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span className="text-slate-300 font-semibold">{summary.total_hold}</span>
              <span className="text-slate-500">HOLD</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-amber-400 font-semibold">{summary.total_watch}</span>
              <span className="text-slate-500">WATCH</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">F&G:</span>
            <span className={`font-bold ${fgColor(data.fear_greed.current)}`}>
              {Math.round(data.fear_greed.current)}
            </span>
            <span className="text-slate-500 capitalize">{fgLabel(data.fear_greed.rating)}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">Regime:</span>
            <span className={`font-semibold capitalize ${
              data.regime.global === "bull" ? "text-emerald-400" :
              data.regime.global === "bear" ? "text-red-400" :
              "text-amber-400"
            }`}>
              {data.regime.global === "bull" ? "🟢" : data.regime.global === "bear" ? "🔴" : "🟡"} {data.regime.global}
            </span>
            <span className="text-slate-600 text-xs">({data.regime.bear_pct.toFixed(0)}% bearish)</span>
          </div>

          {data.rotation?.cycle_phase && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Cycle:</span>
              <span className="text-slate-300 capitalize">{data.rotation.cycle_phase.replace(/_/g, " ")}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm ml-auto">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500">
              {new Date(data.timestamp).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
            <button
              onClick={fetchData}
              disabled={loading}
              className="ml-2 p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ===== Search + Filter Toggle ===== */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search symbol..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full pl-9 pr-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setPage(0); }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
            showFilters || hasActiveFilters
              ? "bg-primary-600/20 border-primary-500/50 text-primary-400"
              : "bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500"
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center">
              {(signalFilters.size > 0 ? 1 : 0) + (sectorFilters.size > 0 ? 1 : 0) + (typeFilter !== "all" ? 1 : 0) + (regimeFilters.size > 0 ? 1 : 0)}
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-slate-500 hover:text-slate-300 underline"
          >
            Clear all
          </button>
        )}

        {/* Result count */}
        <span className="text-xs text-slate-500 ml-auto">
          {totalFiltered === data.universe_size
            ? `${totalFiltered} assets`
            : `${totalFiltered} of ${data.universe_size} assets`}
        </span>
      </div>

      {/* ===== Filter Panel ===== */}
      {showFilters && (
        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50 space-y-4">
          {/* Signal */}
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Signal</div>
            <div className="flex flex-wrap gap-2">
              {["BUY", "HOLD", "WATCH"].map((sig) => (
                <FilterChip
                  key={sig}
                  label={sig}
                  active={signalFilters.has(sig)}
                  onClick={() => toggleFilter(signalFilters, sig, setSignalFilters)}
                  colorClass={
                    sig === "BUY" ? "bg-emerald-600/30 text-emerald-400 border-emerald-500/50" :
                    sig === "WATCH" ? "bg-amber-600/30 text-amber-400 border-amber-500/50" :
                    "bg-slate-600/30 text-slate-300 border-slate-500/50"
                  }
                />
              ))}
            </div>
          </div>

          {/* Type */}
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Type</div>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all" as const, label: "All" },
                { key: "core" as const, label: "⭐ Core (24)" },
                { key: "stock" as const, label: "Stocks" },
                { key: "etf" as const, label: "ETFs" },
              ].map((t) => (
                <FilterChip
                  key={t.key}
                  label={t.label}
                  active={typeFilter === t.key}
                  onClick={() => { setTypeFilter(typeFilter === t.key ? "all" : t.key); setPage(0); }}
                />
              ))}
            </div>
          </div>

          {/* Regime */}
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Regime</div>
            <div className="flex flex-wrap gap-2">
              {["bull", "bear", "sideways"].map((r) => (
                <FilterChip
                  key={r}
                  label={r === "bull" ? "🟢 Bull" : r === "bear" ? "🔴 Bear" : "🟡 Sideways"}
                  active={regimeFilters.has(r)}
                  onClick={() => toggleFilter(regimeFilters, r, setRegimeFilters)}
                  colorClass={
                    r === "bull" ? "bg-emerald-600/30 text-emerald-400 border-emerald-500/50" :
                    r === "bear" ? "bg-red-600/30 text-red-400 border-red-500/50" :
                    "bg-amber-600/30 text-amber-400 border-amber-500/50"
                  }
                />
              ))}
            </div>
          </div>

          {/* Sectors */}
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Sector</div>
            <div className="flex flex-wrap gap-2">
              {availableSectors.map((sector) => (
                <FilterChip
                  key={sector}
                  label={sector}
                  active={sectorFilters.has(sector)}
                  onClick={() => toggleFilter(sectorFilters, sector, setSectorFilters)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== Data Table ===== */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="text-xs text-slate-500 uppercase border-b border-slate-700 bg-slate-800/80">
                <th
                  className="text-left py-2.5 px-3 cursor-pointer hover:text-slate-300 transition-colors sticky left-0 bg-slate-800/95 z-10"
                  onClick={() => handleSort("symbol")}
                >
                  Symbol <SortIcon field="symbol" sortField={sortField} sortDir={sortDir} />
                </th>
                <th
                  className="text-left py-2.5 px-3 cursor-pointer hover:text-slate-300 transition-colors"
                  onClick={() => handleSort("signal")}
                >
                  Signal <SortIcon field="signal" sortField={sortField} sortDir={sortDir} />
                </th>
                <th
                  className="text-right py-2.5 px-3 cursor-pointer hover:text-slate-300 transition-colors"
                  onClick={() => handleSort("expected_accuracy")}
                >
                  Confidence <SortIcon field="expected_accuracy" sortField={sortField} sortDir={sortDir} />
                </th>
                <th
                  className="text-right py-2.5 px-3 cursor-pointer hover:text-slate-300 transition-colors"
                  onClick={() => handleSort("price")}
                >
                  Price <SortIcon field="price" sortField={sortField} sortDir={sortDir} />
                </th>
                <th
                  className="text-left py-2.5 px-3 cursor-pointer hover:text-slate-300 transition-colors"
                  onClick={() => handleSort("regime")}
                >
                  Regime <SortIcon field="regime" sortField={sortField} sortDir={sortDir} />
                </th>
                <th
                  className="text-left py-2.5 px-3 cursor-pointer hover:text-slate-300 transition-colors"
                  onClick={() => handleSort("sector")}
                >
                  Sector <SortIcon field="sector" sortField={sortField} sortDir={sortDir} />
                </th>
                <th
                  className="text-right py-2.5 px-3 cursor-pointer hover:text-slate-300 transition-colors"
                  onClick={() => handleSort("momentum_20d")}
                >
                  Mom 20d <SortIcon field="momentum_20d" sortField={sortField} sortDir={sortDir} />
                </th>
                <th
                  className="text-right py-2.5 px-3 cursor-pointer hover:text-slate-300 transition-colors"
                  onClick={() => handleSort("volatility_20d")}
                >
                  Vol 20d <SortIcon field="volatility_20d" sortField={sortField} sortDir={sortDir} />
                </th>
              </tr>
            </thead>
            <tbody>
              {pageSignals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No assets match your filters
                  </td>
                </tr>
              ) : (
                pageSignals.map((sig) => (
                  <tr
                    key={sig.symbol}
                    className="border-b border-slate-800/50 hover:bg-slate-700/30 transition-colors"
                  >
                    {/* Symbol */}
                    <td className="py-2 px-3 sticky left-0 bg-slate-900/80 z-10">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold text-slate-100 text-sm">
                          {sig.symbol}
                        </span>
                        {sig.is_core && (
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                        )}
                      </div>
                    </td>

                    {/* Signal */}
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          sig.signal === "BUY"
                            ? "bg-emerald-900/50 text-emerald-400"
                            : sig.signal === "WATCH"
                            ? "bg-amber-900/50 text-amber-400"
                            : "bg-slate-700/50 text-slate-400"
                        }`}
                      >
                        {sig.signal}
                      </span>
                    </td>

                    {/* Confidence / Expected Accuracy */}
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="w-10 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              sig.expected_accuracy >= 75
                                ? "bg-emerald-500"
                                : sig.expected_accuracy >= 60
                                ? "bg-amber-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${Math.min(100, sig.expected_accuracy)}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-slate-400 w-10 text-right">
                          {sig.expected_accuracy.toFixed(0)}%
                        </span>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-2 px-3 text-right font-mono text-sm text-slate-300">
                      ${formatPrice(sig.price)}
                    </td>

                    {/* Regime */}
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium capitalize ${
                          sig.regime === "bull"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : sig.regime === "bear"
                            ? "bg-red-500/15 text-red-400"
                            : "bg-amber-500/15 text-amber-400"
                        }`}
                      >
                        {sig.regime === "bull" ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : sig.regime === "bear" ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : null}
                        {sig.regime}
                      </span>
                    </td>

                    {/* Sector */}
                    <td className="py-2 px-3 text-xs text-slate-400 max-w-[140px] truncate">
                      {sig.sector}
                    </td>

                    {/* Momentum 20d */}
                    <td className="py-2 px-3 text-right font-mono text-xs">
                      <span
                        className={
                          sig.momentum_20d > 0
                            ? "text-emerald-400"
                            : sig.momentum_20d < 0
                            ? "text-red-400"
                            : "text-slate-500"
                        }
                      >
                        {sig.momentum_20d > 0 ? "+" : ""}
                        {sig.momentum_20d.toFixed(1)}%
                      </span>
                    </td>

                    {/* Volatility 20d */}
                    <td className="py-2 px-3 text-right font-mono text-xs text-slate-400">
                      {sig.volatility_20d.toFixed(1)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/50">
            <span className="text-xs text-slate-500">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalFiltered)} of {totalFiltered}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>
              <span className="text-xs text-slate-400">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
