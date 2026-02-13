"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  X,
  Info,
  AlertTriangle,
} from "lucide-react";

// ===== Types =====

interface RotationScore {
  score: number;
  favorable_phase: boolean;
  phase_alignment: string;
  confidence_modifier: number;
  lead_lag_signal: string | null;
  relative_strength_60d: number;
  components: {
    role_alignment: number;
    rs_momentum: number;
    recovery_sequence: number;
    trend_confirmation: number;
  };
}

interface RotationStatus {
  timestamp: string;
  cycle_phase: string;
  cycle_confidence: number;
  phase_duration_days: number;
  crash_mode: { active: boolean; crash_score: number; triggers_met: string[]; severity: string | null };
  rotation_scores: Record<string, RotationScore>;
  sector_leadership: { leaders: string[]; laggards: string[]; rotation_pattern: string; pattern_confidence: number };
  warnings: string[];
  bear_asset_pct: number;
  input_data: { spy_regime: string; breadth_pct: number; vix: number | null; fg_score: number | null; total_assets: number; bear_assets: number };
  summary: string;
  phase_summary: string;
}

interface HistoricPeriod {
  regime: string;
  start: string;
  end: string;
  days: number;
  spy_return_pct: number;
  source?: string;
  annualized_return_pct?: number;
  spy_max_drawdown_pct?: number;
}

interface RegimePeriod {
  regime: string;
  start: string;
  end: string;
  days: number;
  spy_start_price: number;
  spy_end_price: number;
  spy_return_pct: number;
  spy_peak_price: number;
  spy_trough_price: number;
  spy_max_drawdown_pct: number;
  annualized_return_pct: number;
}

interface RegimeComparison {
  generated: string;
  regimes: {
    id: string;
    regime: string;
    label: string;
    startDate: string;
    endDate: string;
    days: number;
    spyReturn: number;
    assets: Record<string, {
      available: boolean;
      totalReturn: number;
      relativeVsSpy: number;
      maxDrawdown: number;
    }>;
  }[];
}

// ===== Constants from mobile (exact same data) =====

const PHASE_POSITION: Record<string, number> = {
  early_recovery: 0.08,
  mid_bull: 0.25,
  late_bull: 0.42,
  early_bear: 0.58,
  mid_bear: 0.75,
  late_bear: 0.88,
  recession: 0.96,
};

const PHASE_LABELS: Record<string, string> = {
  early_recovery: "Early Recovery",
  mid_bull: "Mid Bull",
  late_bull: "Late Bull",
  early_bear: "Early Bear",
  mid_bear: "Mid Bear",
  late_bear: "Late Bear",
  recession: "Recession",
};

const CYCLE_SECTORS: { symbol: string; position: number; wave: "market" | "economy" }[] = [
  { symbol: "Financials", position: 0.05, wave: "market" },
  { symbol: "Transportation", position: 0.10, wave: "economy" },
  { symbol: "Technology", position: 0.22, wave: "market" },
  { symbol: "Capital Goods", position: 0.18, wave: "economy" },
  { symbol: "Basic Industry", position: 0.32, wave: "economy" },
  { symbol: "Consumer Cyclicals", position: 0.28, wave: "market" },
  { symbol: "Energy", position: 0.45, wave: "market" },
  { symbol: "Precious Metals", position: 0.48, wave: "economy" },
  { symbol: "Health Care", position: 0.58, wave: "economy" },
  { symbol: "Consumer Staples", position: 0.62, wave: "market" },
  { symbol: "Utilities", position: 0.72, wave: "market" },
  { symbol: "Cyclicals (D&N)", position: 0.90, wave: "economy" },
];

const SYMBOL_TO_SECTOR: Record<string, string> = {
  XLF: "Financials",
  XLK: "Technology",
  XLB: "Basic Industry",
  XLE: "Energy",
  GLD: "Precious Metals",
  GDX: "Precious Metals",
  XLV: "Health Care",
  XLP: "Consumer Staples",
  XLU: "Utilities",
  XLC: "Consumer Cyclicals",
};

const SECTOR_TO_ETFS: Record<string, string[]> = {
  Financials: ["XLF", "KRE"],
  Transportation: ["IYT", "XTN"],
  Technology: ["XLK", "QQQ"],
  "Capital Goods": ["XLI", "ITA"],
  "Basic Industry": ["XLB", "XME"],
  "Consumer Cyclicals": ["XLC", "XLY"],
  Energy: ["XLE", "OIH"],
  "Precious Metals": ["GLD", "GDX"],
  "Health Care": ["XLV", "IBB"],
  "Consumer Staples": ["XLP", "KXI"],
  Utilities: ["XLU", "IDU"],
  "Cyclicals (D&N)": ["XHB", "ITB"],
};

const ECONOMIC_PHASES: { label: string; position: number; wave: "market" | "economy" }[] = [
  { label: "Trough", position: 0.0, wave: "economy" },
  { label: "Expansion", position: 0.18, wave: "economy" },
  { label: "Peak", position: 0.42, wave: "economy" },
  { label: "Contraction", position: 0.68, wave: "economy" },
];

const MARKET_AMPLITUDE = 70;
const ECONOMY_AMPLITUDE = 55;
const MARKET_PHASE = -Math.PI / 2;
const ECONOMY_PHASE = -Math.PI / 2 + Math.PI / 4;
const INDIGO = "#818cf8";
const AMBER = "#fbbf24";

// Data-driven positions
const DATA_DRIVEN_POSITIONS: Record<string, { position: number; regime: string; avgVsSpy: number; isBearHedge?: boolean }> = {
  "Technology": { position: 0.08, regime: "RECOVERY", avgVsSpy: 7.6 },
  "Consumer Cyclicals": { position: 0.08, regime: "RECOVERY", avgVsSpy: 7.2 },
  "Energy": { position: 0.08, regime: "RECOVERY", avgVsSpy: 6.3 },
  "Transportation": { position: 0.08, regime: "RECOVERY", avgVsSpy: 3.4 },
  "Basic Industry": { position: 0.08, regime: "RECOVERY", avgVsSpy: 2.1 },
  "Cyclicals (D&N)": { position: 0.08, regime: "RECOVERY", avgVsSpy: 18.7 },
  "Precious Metals": { position: 0.25, regime: "BULL", avgVsSpy: 4.5 },
  "Financials": { position: 0.25, regime: "BULL", avgVsSpy: 2.5 },
  "Health Care": { position: 0.25, regime: "BULL", avgVsSpy: 0.9 },
  "Capital Goods": { position: 0.45, regime: "SIDEWAYS", avgVsSpy: 3.7 },
  "Utilities": { position: 0.45, regime: "SIDEWAYS", avgVsSpy: 2.1 },
  "Consumer Staples": { position: 0.45, regime: "SIDEWAYS", avgVsSpy: 0.6 },
  "Gold (GLD)": { position: 0.72, regime: "BEAR", avgVsSpy: 8.7, isBearHedge: true },
  "Long Bonds (TLT)": { position: 0.72, regime: "BEAR", avgVsSpy: 3.0, isBearHedge: true },
  "Mid Bonds (IEF)": { position: 0.72, regime: "BEAR", avgVsSpy: 3.1, isBearHedge: true },
  "Emerging (EEM)": { position: 0.72, regime: "BEAR", avgVsSpy: 1.9, isBearHedge: true },
  "Inverse SPY (SH)": { position: 0.88, regime: "DEEP BEAR", avgVsSpy: 12.0, isBearHedge: true },
  "Mgd Futures (DBMF)": { position: 0.88, regime: "DEEP BEAR", avgVsSpy: 8.0, isBearHedge: true },
};

const SHORT_NAMES: Record<string, string> = {
  "Financials": "Fin",
  "Technology": "Tech",
  "Consumer Cyclicals": "Cyc",
  "Capital Goods": "CapG",
  "Basic Industry": "Matl",
  "Energy": "Ener",
  "Precious Metals": "Gold",
  "Consumer Staples": "Stap",
  "Health Care": "Hlth",
  "Utilities": "Util",
  "Transportation": "Tran",
  "Cyclicals (D&N)": "D&N",
  "Gold (GLD)": "GLD",
  "Long Bonds (TLT)": "TLT",
  "Mid Bonds (IEF)": "IEF",
  "Emerging (EEM)": "EEM",
  "Inverse SPY (SH)": "SH",
  "Mgd Futures (DBMF)": "DBMF",
};

const BEAR_HEDGE_TICKERS: Record<string, string> = {
  "Gold (GLD)": "GLD",
  "Long Bonds (TLT)": "TLT",
  "Mid Bonds (IEF)": "IEF",
  "Emerging (EEM)": "EEM",
  "Inverse SPY (SH)": "SH",
  "Mgd Futures (DBMF)": "DBMF",
};

const SECTOR_OPTIMAL_ZONES: Record<string, { start: number; end: number; description: string }> = {
  "Financials": { start: 0.00, end: 0.15, description: "early recovery" },
  "Technology": { start: 0.15, end: 0.30, description: "early-mid bull" },
  "Consumer Cyclicals": { start: 0.20, end: 0.35, description: "mid bull" },
  "Capital Goods": { start: 0.12, end: 0.25, description: "early bull" },
  "Basic Industry": { start: 0.25, end: 0.40, description: "mid bull" },
  "Energy": { start: 0.35, end: 0.55, description: "late bull" },
  "Precious Metals": { start: 0.40, end: 0.55, description: "late bull / peak" },
  "Consumer Staples": { start: 0.55, end: 0.72, description: "early bear (relative)" },
  "Health Care": { start: 0.50, end: 0.65, description: "early bear" },
  "Utilities": { start: 0.65, end: 0.80, description: "mid bear" },
  "Transportation": { start: 0.85, end: 0.15, description: "late bear / early recovery" },
  "Cyclicals (D&N)": { start: 0.80, end: 0.95, description: "late bear" },
};

const SECTOR_THEORY: Record<string, string> = {
  "Financials": "Stovall model: Financials lead in early recoveries as banks benefit from rate cuts.",
  "Technology": "Stovall model: Tech outperforms during early-to-mid bull phases as growth expectations rise.",
  "Consumer Cyclicals": "Stovall model: Consumer discretionary beats SPY mid-bull as consumer confidence accelerates.",
  "Capital Goods": "Stovall model: Industrials outperform as businesses invest in expansion during early bull markets.",
  "Basic Industry": "Stovall model: Materials lead mid-cycle when demand for raw inputs peaks.",
  "Energy": "Stovall model: Energy outperforms in late bull markets when commodity demand and inflation rise.",
  "Precious Metals": "Stovall model: Gold/miners outperform near peaks as investors seek inflation hedges.",
  "Consumer Staples": "Stovall model: Staples decline less than SPY in early bear markets (relative outperformance).",
  "Health Care": "Stovall model: Healthcare outperforms in early bear as essential spending resists recession.",
  "Utilities": "Stovall model: Utilities outperform mid-bear as dividend yields attract fleeing capital.",
  "Transportation": "Stovall model: Transports lead in late bear / early recovery as trade signals bottoming.",
  "Cyclicals (D&N)": "Stovall model: Durables outperform in late bear as markets price in recovery.",
};

const ROTATION_SEQUENCE: { symbol: string; leadLag: number; group: string }[] = [
  { symbol: "GDX", leadLag: -49, group: "Gold/Commodities" },
  { symbol: "TLT", leadLag: -29, group: "Bonds" },
  { symbol: "GLD", leadLag: -13, group: "Gold/Commodities" },
  { symbol: "HYG", leadLag: -13, group: "Bonds" },
  { symbol: "EEM", leadLag: -8.5, group: "International" },
  { symbol: "XLU", leadLag: -6, group: "Defensive" },
  { symbol: "QQQ", leadLag: -2, group: "Tech/Growth" },
  { symbol: "XLK", leadLag: -1, group: "Tech/Growth" },
  { symbol: "XLE", leadLag: 0, group: "Energy/Materials" },
  { symbol: "XLB", leadLag: 0, group: "Energy/Materials" },
  { symbol: "VNQ", leadLag: 0, group: "REITs" },
  { symbol: "XLF", leadLag: 1, group: "Financials" },
  { symbol: "IWM", leadLag: 1, group: "Small-Cap" },
  { symbol: "XLV", leadLag: 3, group: "Defensive" },
  { symbol: "XLC", leadLag: 3.5, group: "Tech/Growth" },
  { symbol: "XLP", leadLag: 20, group: "Defensive" },
];

// ===== SVG Helpers =====

function generateSinePath(
  width: number,
  amplitude: number,
  phaseOffset: number,
  midY: number,
  points: number = 120
): string {
  let d = "";
  for (let i = 0; i <= points; i++) {
    const x = (i / points) * width;
    const t = (i / points) * 2 * Math.PI + phaseOffset;
    const y = midY - amplitude * Math.sin(t);
    d += i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

function sineY(position: number, amplitude: number, phase: number, midY: number): number {
  const t = position * 2 * Math.PI + phase;
  return midY - amplitude * Math.sin(t);
}

function computeSpreadPositions(positions: Record<string, { position: number; regime: string; avgVsSpy: number; isBearHedge?: boolean }>) {
  const groups: Record<number, { name: string; data: (typeof positions)[string] }[]> = {};
  for (const [name, data] of Object.entries(positions)) {
    const key = data.position;
    if (!groups[key]) groups[key] = [];
    groups[key].push({ name, data });
  }
  for (const key of Object.keys(groups)) {
    groups[Number(key)].sort((a, b) => b.data.avgVsSpy - a.data.avgVsSpy);
  }
  const SPREAD = 0.035;
  const result: { name: string; spreadPos: number; data: (typeof positions)[string]; rank: number }[] = [];
  for (const [posKey, items] of Object.entries(groups)) {
    const basePos = Number(posKey);
    const totalWidth = (items.length - 1) * SPREAD;
    const startPos = basePos - totalWidth / 2;
    items.forEach((item, idx) => {
      result.push({
        name: item.name,
        spreadPos: Math.max(0.02, Math.min(0.98, startPos + idx * SPREAD)),
        data: item.data,
        rank: idx,
      });
    });
  }
  return result;
}

// ===== Pulse Animation CSS =====

const pulseKeyframes = `
@keyframes cyclePulse {
  0%, 100% { r: 6; opacity: 1; }
  50% { r: 6; opacity: 1; }
}
@keyframes cycleGlow {
  0%, 100% { r: 10; opacity: 0.35; }
  50% { r: 14; opacity: 0.15; }
}
`;

// ===== Sub-Components =====

type OverlayPage = 0 | 1 | 2 | 3;
const PAGE_TITLES = [
  "Economic Cycles",
  "Outperforming Sectors (rel. to SPY)",
  "Outperforming Assets (rel. to SPY)",
  "Data-Driven Sectors (actual vs SPY)",
];

// ─── Cycle Position Chart ─────────────────────────
function CyclePositionChart({
  rotationStatus,
  regimeData,
  onSectorClick,
}: {
  rotationStatus: RotationStatus;
  regimeData: RegimeComparison | null;
  onSectorClick: (ticker: string, sectorName: string, score: RotationScore | null) => void;
}) {
  const [activePage, setActivePage] = useState<OverlayPage>(0);
  const CHART_WIDTH = 1000;
  const CHART_HEIGHT = 320;
  const WAVE_MID_Y = CHART_HEIGHT / 2;

  const scores = rotationStatus.rotation_scores;
  const cyclePhase = rotationStatus.cycle_phase;
  const confidence = rotationStatus.cycle_confidence;

  const favorableSectors = useMemo(() => {
    const set = new Set<string>();
    for (const [symbol, score] of Object.entries(scores)) {
      if (score.favorable_phase && SYMBOL_TO_SECTOR[symbol]) {
        set.add(SYMBOL_TO_SECTOR[symbol]);
      }
    }
    return set;
  }, [scores]);

  const currentPos = PHASE_POSITION[cyclePhase] ?? 0.5;
  const dotX = currentPos * CHART_WIDTH;
  const dotY = sineY(currentPos, MARKET_AMPLITUDE, MARKET_PHASE, WAVE_MID_Y);

  const marketPath = generateSinePath(CHART_WIDTH, MARKET_AMPLITUDE, MARKET_PHASE, WAVE_MID_Y);
  const economyPath = generateSinePath(CHART_WIDTH, ECONOMY_AMPLITUDE, ECONOMY_PHASE, WAVE_MID_Y);

  const handleDotClick = useCallback((sectorName: string) => {
    const etfs = SECTOR_TO_ETFS[sectorName] ?? [];
    const matchedTicker = etfs.find((etf) => scores[etf]) ?? etfs[0] ?? sectorName;
    onSectorClick(matchedTicker, sectorName, scores[matchedTicker] ?? null);
  }, [scores, onSectorClick]);

  const handleDataDrivenClick = useCallback((name: string) => {
    const bearTicker = BEAR_HEDGE_TICKERS[name];
    const etfs = SECTOR_TO_ETFS[name] ?? [];
    const matchedTicker = bearTicker ?? etfs.find((etf) => scores[etf]) ?? etfs[0] ?? name;
    const sectorName = bearTicker ? (name.includes("Gold") ? "Precious Metals" : name) : name;
    onSectorClick(matchedTicker, sectorName, scores[matchedTicker] ?? null);
  }, [scores, onSectorClick]);

  const renderOverlay = () => {
    if (activePage === 0) {
      return (
        <>
          {/* Economic phase dots */}
          {ECONOMIC_PHASES.map((phase) => {
            const waveConfig = phase.wave === "market"
              ? { amplitude: MARKET_AMPLITUDE, phase: MARKET_PHASE }
              : { amplitude: ECONOMY_AMPLITUDE, phase: ECONOMY_PHASE };
            const sx = phase.position * CHART_WIDTH;
            const sy = sineY(phase.position, waveConfig.amplitude, waveConfig.phase, WAVE_MID_Y);
            const isUpper = sy < WAVE_MID_Y;
            const labelY = isUpper ? sy - 18 : sy + 22;
            return (
              <g key={phase.label}>
                <circle cx={sx} cy={sy} r={4} fill={AMBER} opacity={0.8} />
                <text x={sx} y={labelY} textAnchor="middle" fontSize={11} fontWeight="bold" fill="#fbbf24" opacity={0.95}>{phase.label}</text>
              </g>
            );
          })}
          {/* Market cycle phase labels */}
          {[
            { label: "Trough", pos: 0.0 },
            { label: "Early Bull", pos: 0.12 },
            { label: "Mid Bull", pos: 0.25 },
            { label: "Late Bull", pos: 0.42 },
            { label: "Peak", pos: 0.5 },
            { label: "Early Bear", pos: 0.58 },
            { label: "Mid Bear", pos: 0.75 },
            { label: "Late Bear", pos: 0.88 },
          ].map((phase) => {
            const sx = phase.pos * CHART_WIDTH;
            const sy = sineY(phase.pos, MARKET_AMPLITUDE, MARKET_PHASE, WAVE_MID_Y);
            const isUpper = sy < WAVE_MID_Y;
            const labelY = isUpper ? sy - 16 : sy + 20;
            return (
              <text key={phase.label} x={sx} y={labelY} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.45)">{phase.label}</text>
            );
          })}
        </>
      );
    }
    if (activePage === 1) {
      return (
        <>
          {CYCLE_SECTORS.map((sector) => {
            const wave = sector.wave === "market"
              ? { amplitude: MARKET_AMPLITUDE, phase: MARKET_PHASE }
              : { amplitude: ECONOMY_AMPLITUDE, phase: ECONOMY_PHASE };
            const sx = sector.position * CHART_WIDTH;
            const sy = sineY(sector.position, wave.amplitude, wave.phase, WAVE_MID_Y);
            const isFavorable = favorableSectors.has(sector.symbol);
            const isUpper = sy < WAVE_MID_Y;
            const labelY = isUpper ? sy - 14 : sy + 18;
            return (
              <g key={sector.symbol} className="cursor-pointer" onClick={() => handleDotClick(sector.symbol)}>
                <circle cx={sx} cy={sy} r={isFavorable ? 6 : 4} fill={isFavorable ? "#22c55e" : sector.wave === "market" ? INDIGO : AMBER} opacity={isFavorable ? 1 : 0.6} />
                <text x={sx} y={labelY} textAnchor="middle" fontSize={10} fontWeight={isFavorable ? "bold" : "normal"} fill={isFavorable ? "#22c55e" : "rgba(255,255,255,0.55)"}>{sector.symbol}</text>
              </g>
            );
          })}
        </>
      );
    }
    if (activePage === 2) {
      return (
        <>
          {CYCLE_SECTORS.map((sector) => {
            const wave = sector.wave === "market"
              ? { amplitude: MARKET_AMPLITUDE, phase: MARKET_PHASE }
              : { amplitude: ECONOMY_AMPLITUDE, phase: ECONOMY_PHASE };
            const sx = sector.position * CHART_WIDTH;
            const sy = sineY(sector.position, wave.amplitude, wave.phase, WAVE_MID_Y);
            const isFavorable = favorableSectors.has(sector.symbol);
            const isUpper = sy < WAVE_MID_Y;
            const labelY = isUpper ? sy - 14 : sy + 18;
            const etfs = SECTOR_TO_ETFS[sector.symbol] ?? [];
            const tickerStr = etfs.join(" · ");
            return (
              <g key={sector.symbol} className="cursor-pointer" onClick={() => handleDotClick(sector.symbol)}>
                <circle cx={sx} cy={sy} r={isFavorable ? 6 : 4} fill={isFavorable ? "#22c55e" : sector.wave === "market" ? INDIGO : AMBER} opacity={isFavorable ? 1 : 0.6} />
                <text x={sx} y={labelY} textAnchor="middle" fontSize={9} fontWeight={isFavorable ? "bold" : "normal"} fill={isFavorable ? "#22c55e" : "rgba(255,255,255,0.55)"}>{tickerStr}</text>
              </g>
            );
          })}
        </>
      );
    }
    if (activePage === 3) {
      const spreadItems = computeSpreadPositions(DATA_DRIVEN_POSITIONS);
      const REGIME_ZONES = [
        { label: "Recovery", pos: 0.08, color: "#22c55e" },
        { label: "Bull", pos: 0.25, color: "#3b82f6" },
        { label: "Sideways", pos: 0.45, color: "#a855f7" },
        { label: "Bear", pos: 0.72, color: "#ef4444" },
        { label: "Deep Bear", pos: 0.88, color: "#dc2626" },
      ];
      return (
        <>
          {REGIME_ZONES.map((zone) => {
            const zx = zone.pos * CHART_WIDTH;
            return (
              <g key={zone.label}>
                <text x={zx} y={12} textAnchor="middle" fontSize={9} fontWeight="bold" fill={zone.color} opacity={0.6}>{zone.label}</text>
                <line x1={zx} y1={18} x2={zx} y2={CHART_HEIGHT - 10} stroke={zone.color} strokeWidth={0.5} strokeDasharray="2,6" opacity={0.15} />
              </g>
            );
          })}
          {spreadItems.map((item, idx) => {
            const sx = item.spreadPos * CHART_WIDTH;
            const sy = sineY(item.spreadPos, MARKET_AMPLITUDE, MARKET_PHASE, WAVE_MID_Y);
            const isUpper = sy < WAVE_MID_Y;
            const flipLabel = idx % 2 === 0;
            const labelAbove = isUpper ? !flipLabel : flipLabel;
            const labelY = labelAbove ? sy - 12 : sy + 16;
            const perfY = labelAbove ? sy - 23 : sy + 27;
            const shortName = SHORT_NAMES[item.name] ?? item.name.slice(0, 4);
            const dotR = Math.max(3.5, Math.min(7, 3.5 + item.data.avgVsSpy / 5));
            const isBear = (item.data as any).isBearHedge === true;
            const dotColor = isBear ? "#f59e0b" : "#06b6d4";
            const labelColor = isBear ? "#f59e0b" : "#06b6d4";
            const perfColor = isBear ? "rgba(245,158,11,0.65)" : "rgba(6,182,212,0.65)";
            return (
              <g key={item.name} className="cursor-pointer" onClick={() => handleDataDrivenClick(item.name)}>
                <circle cx={sx} cy={sy} r={dotR} fill={dotColor} opacity={0.9} />
                <text x={sx} y={labelY} textAnchor="middle" fontSize={9} fontWeight="bold" fill={labelColor}>{shortName}</text>
                <text x={sx} y={perfY} textAnchor="middle" fontSize={7.5} fill={perfColor}>
                  {item.data.avgVsSpy >= 0 ? "+" : ""}{item.data.avgVsSpy.toFixed(1)}%
                </text>
              </g>
            );
          })}
        </>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
      <style>{pulseKeyframes}</style>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Market Cycle Position</p>
          <p className="text-xl font-bold text-slate-100">{PHASE_LABELS[cyclePhase] ?? cyclePhase ?? "—"}</p>
        </div>
        <div className="bg-slate-700/50 rounded-full px-3 py-1">
          <span className="text-xs text-slate-400">{confidence}% conf</span>
        </div>
      </div>

      {/* View mode tabs */}
      <div className="flex gap-1 mb-3 bg-slate-900/50 rounded-lg p-1">
        {PAGE_TITLES.map((title, i) => (
          <button
            key={i}
            onClick={() => setActivePage(i as OverlayPage)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              activePage === i
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
            }`}
          >
            {title}
          </button>
        ))}
      </div>

      {/* SVG Chart */}
      <div className="overflow-x-auto">
        <div className="w-full">
          <svg width="100%" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="xMidYMid meet">
            {/* Economic Cycle Wave (behind, gold dashed) */}
            <path d={economyPath} fill="none" stroke={AMBER} strokeWidth={2} strokeDasharray="8,4" opacity={0.6} />
            {/* Stock Market Cycle Wave (front, indigo) */}
            <path d={marketPath} fill="none" stroke={INDIGO} strokeWidth={2.5} opacity={0.9} />
            {/* Center line */}
            <line x1={0} y1={WAVE_MID_Y} x2={CHART_WIDTH} y2={WAVE_MID_Y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} strokeDasharray="4,8" />
            {/* Overlay content */}
            {renderOverlay()}
            {/* "You Are Here" pulsing dot */}
            <circle cx={dotX} cy={dotY} r={10} fill={INDIGO} opacity={0.35} style={{ animation: "cycleGlow 1.6s ease-in-out infinite" }} />
            <circle cx={dotX} cy={dotY} r={6} fill="#ffffff" style={{ animation: "cyclePulse 1.6s ease-in-out infinite" }} />
            {/* Label */}
            <text
              x={dotX}
              y={dotY > WAVE_MID_Y ? dotY - 18 : dotY + 24}
              textAnchor="middle"
              fontSize={10}
              fontWeight="bold"
              fill="#ffffff"
            >
              📍 You Are Here
            </text>
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded" style={{ backgroundColor: INDIGO }} />
          <span className="text-[10px] text-slate-500">Stock Market Cycle</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded opacity-60" style={{ backgroundColor: AMBER }} />
          <span className="text-[10px] text-slate-500">Economic Cycle</span>
        </div>
        {(activePage === 1 || activePage === 2) && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-slate-500">Outperforming</span>
          </div>
        )}
      </div>

      {/* Tap hint */}
      {(activePage === 1 || activePage === 2) && favorableSectors.size > 0 && (
        <p className="text-[10px] text-slate-600 text-center mt-2">Click a dot for rotation details</p>
      )}
      {activePage === 3 && (
        <p className="text-[10px] text-slate-600 text-center mt-2">Click any dot to see regime comparison vs SPY</p>
      )}

      {/* Warnings */}
      {rotationStatus.warnings.length > 0 && (
        <div className="mt-3 space-y-1">
          {rotationStatus.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 px-3 py-1.5 bg-amber-900/20 border border-amber-700/30 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
              <span className="text-xs text-amber-300/80">{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sector Rotation Card ─────────────────────────
function SectorRotationCard({ rotationStatus }: { rotationStatus: RotationStatus }) {
  const scores = rotationStatus.rotation_scores;
  const leadership = rotationStatus.sector_leadership;
  const breadthPct = rotationStatus.input_data.breadth_pct;
  const regime = rotationStatus.input_data.spy_regime.toUpperCase();

  // Build leaders/laggards with scores
  const leadersWithScores = leadership.leaders.map((s) => ({
    symbol: s,
    score: scores[s]?.score ?? 0,
    rs60d: scores[s]?.relative_strength_60d ?? 0,
    favorable: scores[s]?.favorable_phase ?? false,
  }));
  const laggardsWithScores = leadership.laggards.map((s) => ({
    symbol: s,
    score: scores[s]?.score ?? 0,
    rs60d: scores[s]?.relative_strength_60d ?? 0,
    favorable: scores[s]?.favorable_phase ?? false,
  }));

  const breadthColor = breadthPct >= 80 ? "text-emerald-400" : breadthPct >= 50 ? "text-amber-400" : "text-red-400";
  const breadthBg = breadthPct >= 80 ? "bg-emerald-500" : breadthPct >= 50 ? "bg-amber-500" : "bg-red-500";
  const regimeColor = regime === "BULL" ? "text-emerald-400 bg-emerald-900/40 border-emerald-700/50" : regime === "BEAR" ? "text-red-400 bg-red-900/40 border-red-700/50" : "text-amber-400 bg-amber-900/40 border-amber-700/50";

  // Rotation bar
  const earlyCount = ROTATION_SEQUENCE.filter((s) => s.leadLag < -5).length;
  const midCount = ROTATION_SEQUENCE.filter((s) => s.leadLag >= -5 && s.leadLag <= 5).length;
  const lateCount = ROTATION_SEQUENCE.filter((s) => s.leadLag > 5).length;
  const total = ROTATION_SEQUENCE.length;
  const earlyPct = (earlyCount / total) * 100;
  const midPct = (midCount / total) * 100;
  const latePct = (lateCount / total) * 100;

  return (
    <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
      {/* Crash mode warning */}
      {rotationStatus.crash_mode.active && (
        <div className="flex items-center gap-3 bg-red-900/30 border border-red-600/50 rounded-lg p-3 mb-4">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-sm font-bold text-red-400">Crash Mode Active</p>
            <p className="text-xs text-slate-400">&gt;50% of assets below SMA200. Defensive positioning recommended.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Sector Rotation</p>
          <p className="text-lg font-bold text-slate-100">{rotationStatus.phase_summary}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${regimeColor}`}>{regime}</span>
          <span className="text-xs text-slate-500">{rotationStatus.cycle_confidence}% conf</span>
        </div>
      </div>

      {/* Breadth Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-slate-500">Market Breadth</span>
          <span className={`text-xs font-bold ${breadthColor}`}>{breadthPct.toFixed(0)}% above SMA200</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${breadthBg}`} style={{ width: `${breadthPct}%` }} />
        </div>
      </div>

      {/* Rotation cycle bar */}
      <div className="mb-4 pt-3 border-t border-slate-700/50">
        <div className="flex justify-between mb-1">
          <span className="text-[10px] text-slate-500">Early Leaders</span>
          <span className="text-[10px] text-slate-500">Coincident</span>
          <span className="text-[10px] text-slate-500">Late Laggers</span>
        </div>
        <div className="h-3 flex rounded overflow-hidden">
          <div className="h-full bg-blue-500/60" style={{ width: `${earlyPct}%` }} />
          <div className="h-full bg-emerald-500/60" style={{ width: `${midPct}%` }} />
          <div className="h-full bg-amber-500/60" style={{ width: `${latePct}%` }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-slate-600">GDX TLT GLD HYG EEM XLU</span>
          <span className="text-[9px] text-slate-600 text-center">QQQ XLK XLE XLB VNQ XLF</span>
          <span className="text-[9px] text-slate-600 text-right">XLP</span>
        </div>
      </div>

      {/* Leaders & Laggards */}
      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-700/50">
        <div>
          <p className="text-xs font-bold text-slate-400 mb-2">🟢 Leaders (RS 60d)</p>
          <div className="space-y-1.5">
            {leadersWithScores.map((l) => (
              <div key={l.symbol} className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200 w-10">{l.symbol}</span>
                <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, Math.abs(l.rs60d) * 2)}%` }} />
                </div>
                <span className="text-xs font-mono text-emerald-400 w-14 text-right">+{l.rs60d.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-400 mb-2">🔴 Laggards (RS 60d)</p>
          <div className="space-y-1.5">
            {laggardsWithScores.map((l) => (
              <div key={l.symbol} className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200 w-10">{l.symbol}</span>
                <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(100, Math.abs(l.rs60d) * 2)}%` }} />
                </div>
                <span className="text-xs font-mono text-red-400 w-14 text-right">{l.rs60d.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* All rotation scores — sortable compact table */}
      <details className="mt-4 pt-3 border-t border-slate-700/50">
        <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300 flex items-center gap-1">
          <ChevronDown className="w-3 h-3" /> View all rotation scores ({Object.keys(scores).length} assets)
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 uppercase border-b border-slate-700">
                <th className="text-left py-1.5 px-1">Asset</th>
                <th className="text-right py-1.5 px-1">Score</th>
                <th className="text-right py-1.5 px-1">RS 60d</th>
                <th className="text-center py-1.5 px-1">Phase</th>
                <th className="text-left py-1.5 px-1">Signal</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(scores)
                .sort((a, b) => b[1].score - a[1].score)
                .map(([symbol, s]) => (
                  <tr key={symbol} className="border-b border-slate-800/50 hover:bg-slate-700/30">
                    <td className="py-1 px-1 font-bold text-slate-200">{symbol}</td>
                    <td className={`py-1 px-1 text-right font-mono ${s.score >= 0.7 ? "text-emerald-400" : s.score >= 0.5 ? "text-amber-400" : "text-red-400"}`}>
                      {s.score.toFixed(2)}
                    </td>
                    <td className={`py-1 px-1 text-right font-mono ${s.relative_strength_60d >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {s.relative_strength_60d >= 0 ? "+" : ""}{s.relative_strength_60d.toFixed(1)}%
                    </td>
                    <td className="py-1 px-1 text-center">
                      {s.favorable_phase ? (
                        <span className="text-emerald-400">✓</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-1 px-1 text-slate-500 truncate max-w-[120px]">
                      {s.lead_lag_signal?.replace(/_/g, " ") ?? "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* Footer */}
      <p className="text-[10px] text-slate-600 text-center mt-3">
        {rotationStatus.summary} · As of {new Date(rotationStatus.timestamp).toLocaleDateString()}
      </p>
    </div>
  );
}

// ─── Bull/Bear Timeline ───────────────────────────
function BullBearTimeline({ periods }: { periods: HistoricPeriod[] }) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const CHART_WIDTH = 1200;
  const CHART_HEIGHT = 300;
  const CHART_PADDING_H = 45;
  const CHART_PADDING_R = 12;
  const INNER_WIDTH = CHART_WIDTH - CHART_PADDING_H - CHART_PADDING_R;
  const CHART_TOP = 10;
  const CHART_BOTTOM = CHART_HEIGHT - 25;

  const BULL_COLOR = "#22c55e";
  const BEAR_COLOR = "#ef4444";
  const BULL_MUTED = "rgba(34, 197, 94, 0.12)";
  const BEAR_MUTED = "rgba(239, 68, 68, 0.12)";
  const LINE_COLOR = "#818cf8";

  const chartData = useMemo(() => {
    if (periods.length === 0) return null;

    // Build synthetic price series
    const prices: { date: number; price: number; regime: string }[] = [];
    let currentPrice = 100;
    for (const period of periods) {
      const startDate = new Date(period.start + "T00:00").getTime();
      const endDate = new Date(period.end + "T00:00").getTime();
      prices.push({ date: startDate, price: currentPrice, regime: period.regime });
      const endPrice = currentPrice * (1 + period.spy_return_pct / 100);
      prices.push({ date: endDate, price: endPrice, regime: period.regime });
      currentPrice = endPrice;
    }

    const priceValues = prices.map((p) => p.price);
    const minPrice = Math.min(...priceValues);
    const maxPrice = Math.max(...priceValues);
    const totalStartDate = prices[0].date;
    const totalEndDate = prices[prices.length - 1].date;
    const totalSpan = totalEndDate - totalStartDate;

    // Region rects
    const regionRects = periods.map((period) => {
      const startDate = new Date(period.start + "T00:00").getTime();
      const endDate = new Date(period.end + "T00:00").getTime();
      const x = ((startDate - totalStartDate) / totalSpan) * INNER_WIDTH;
      const w = ((endDate - startDate) / totalSpan) * INNER_WIDTH;
      return { x, width: Math.max(w, 1), regime: period.regime };
    });

    // Line path
    const priceRange = maxPrice - minPrice;
    let linePath = "";
    for (let i = 0; i < prices.length; i++) {
      const x = ((prices[i].date - totalStartDate) / totalSpan) * INNER_WIDTH;
      const y = CHART_BOTTOM - ((prices[i].price - minPrice) / priceRange) * (CHART_BOTTOM - CHART_TOP);
      linePath += i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }

    // Area path
    const lastX = ((prices[prices.length - 1].date - totalStartDate) / totalSpan) * INNER_WIDTH;
    const firstX = ((prices[0].date - totalStartDate) / totalSpan) * INNER_WIDTH;
    const areaPath = `${linePath} L ${lastX.toFixed(1)} ${CHART_BOTTOM} L ${firstX.toFixed(1)} ${CHART_BOTTOM} Z`;

    // Year markers
    const startYear = new Date(totalStartDate).getFullYear();
    const endYear = new Date(totalEndDate).getFullYear();
    const yearMarkers: { year: number; x: number }[] = [];
    for (let y = Math.ceil(startYear / 10) * 10; y <= endYear; y += 10) {
      const dateMs = new Date(`${y}-01-01T00:00`).getTime();
      const x = ((dateMs - totalStartDate) / totalSpan) * INNER_WIDTH;
      if (x >= 0 && x <= INNER_WIDTH) yearMarkers.push({ year: y, x });
    }

    // Y-axis labels
    const yLabels: { label: string; y: number }[] = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const price = minPrice + (priceRange * i) / steps;
      const y = CHART_BOTTOM - ((price - minPrice) / priceRange) * (CHART_BOTTOM - CHART_TOP);
      const label = price >= 1000 ? `${(price / 1000).toFixed(0)}K` : price.toFixed(0);
      yLabels.push({ label, y });
    }

    // Period hit ranges
    const periodHitRanges = periods.map((p) => {
      const startDate = new Date(p.start + "T00:00").getTime();
      const endDate = new Date(p.end + "T00:00").getTime();
      return {
        x1: ((startDate - totalStartDate) / totalSpan) * INNER_WIDTH,
        x2: ((endDate - totalStartDate) / totalSpan) * INNER_WIDTH,
      };
    });

    return { linePath, areaPath, regionRects, yearMarkers, yLabels, periodHitRanges };
  }, [periods]);

  // Summary stats
  const summary = useMemo(() => {
    const bulls = periods.filter((p) => p.regime === "BULL" || p.regime === "RECOVERY");
    const bears = periods.filter((p) => p.regime === "BEAR");
    return {
      avgBullDays: bulls.length > 0 ? Math.round(bulls.reduce((s, p) => s + p.days, 0) / bulls.length) : 0,
      avgBullReturn: bulls.length > 0 ? bulls.reduce((s, p) => s + p.spy_return_pct, 0) / bulls.length : 0,
      avgBearDays: bears.length > 0 ? Math.round(bears.reduce((s, p) => s + p.days, 0) / bears.length) : 0,
      avgBearReturn: bears.length > 0 ? bears.reduce((s, p) => s + p.spy_return_pct, 0) / bears.length : 0,
      bullCount: bulls.length,
      bearCount: bears.length,
    };
  }, [periods]);

  const fmtRet = (p: number) => `${p >= 0 ? "+" : ""}${p.toFixed(1)}%`;
  const fmtDur = (d: number) => d >= 730 ? `${(d / 365).toFixed(1)}y` : d >= 60 ? `${Math.round(d / 30)}mo` : `${d}d`;

  const handleChartClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartData) return;
    const svgRect = e.currentTarget.getBoundingClientRect();
    const tapX = e.clientX - svgRect.left - CHART_PADDING_H;
    const idx = chartData.periodHitRanges.findIndex((r) => tapX >= r.x1 && tapX <= r.x2);
    if (idx >= 0) {
      setSelectedIdx(selectedIdx === idx ? null : idx);
    } else {
      setSelectedIdx(null);
    }
  };

  if (!chartData || periods.length === 0) return null;

  const svgWidth = CHART_WIDTH;
  const svgHeight = CHART_HEIGHT;

  return (
    <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Bull & Bear Timeline</p>
      <p className="text-lg font-bold text-slate-100 mb-3">60+ Years of Market Cycles</p>

      {/* Summary boxes */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="border border-emerald-700/50 rounded-lg p-3 bg-slate-900/50">
          <p className="text-xs font-bold text-emerald-400 mb-1">Bull Markets ({summary.bullCount})</p>
          <p className="text-xs text-slate-400">avg {fmtDur(summary.avgBullDays)} · {fmtRet(summary.avgBullReturn)}</p>
        </div>
        <div className="border border-red-700/50 rounded-lg p-3 bg-slate-900/50">
          <p className="text-xs font-bold text-red-400 mb-1">Bear Markets ({summary.bearCount})</p>
          <p className="text-xs text-slate-400">avg {fmtDur(summary.avgBearDays)} · {fmtRet(summary.avgBearReturn)}</p>
        </div>
      </div>

      {/* SVG Chart */}
      <div>
        <div className="w-full">
          <svg width="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="xMidYMid meet" onClick={handleChartClick} className="cursor-pointer">
            <defs>
              <linearGradient id="bullBearAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={LINE_COLOR} stopOpacity="0.25" />
                <stop offset="1" stopColor={LINE_COLOR} stopOpacity="0.02" />
              </linearGradient>
              <clipPath id="bbChartClip">
                <rect x={CHART_PADDING_H} y={0} width={INNER_WIDTH} height={CHART_HEIGHT} />
              </clipPath>
            </defs>

            {/* Y-axis labels */}
            {chartData.yLabels.map((yl, i) => (
              <g key={`y-${i}`}>
                <text x={CHART_PADDING_H - 6} y={yl.y + 3} textAnchor="end" fontSize={9} fill="rgba(255,255,255,0.35)">{yl.label}</text>
                <line x1={CHART_PADDING_H} y1={yl.y} x2={CHART_PADDING_H + INNER_WIDTH} y2={yl.y} stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} strokeDasharray="4,4" />
              </g>
            ))}

            {/* Clipped chart area */}
            <g clipPath="url(#bbChartClip)">
              {chartData.regionRects.map((rect, i) => {
                const isBull = rect.regime === "BULL" || rect.regime === "RECOVERY";
                return (
                  <rect
                    key={`region-${i}`}
                    x={CHART_PADDING_H + rect.x}
                    y={CHART_TOP}
                    width={rect.width}
                    height={CHART_BOTTOM - CHART_TOP}
                    fill={isBull ? BULL_MUTED : BEAR_MUTED}
                    opacity={selectedIdx === i ? 1 : 0.7}
                  />
                );
              })}
              <path d={chartData.areaPath} fill="url(#bullBearAreaGrad)" transform={`translate(${CHART_PADDING_H}, 0)`} />
              <path d={chartData.linePath} fill="none" stroke={LINE_COLOR} strokeWidth={1.5} strokeLinejoin="round" transform={`translate(${CHART_PADDING_H}, 0)`} />
              {selectedIdx !== null && chartData.periodHitRanges[selectedIdx] && (
                <rect
                  x={CHART_PADDING_H + chartData.periodHitRanges[selectedIdx].x1}
                  y={CHART_TOP}
                  width={chartData.periodHitRanges[selectedIdx].x2 - chartData.periodHitRanges[selectedIdx].x1}
                  height={CHART_BOTTOM - CHART_TOP}
                  fill="rgba(255,255,255,0.08)"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth={0.5}
                />
              )}
            </g>

            {/* X-axis year labels */}
            {chartData.yearMarkers.map((m) => (
              <g key={m.year}>
                <line x1={CHART_PADDING_H + m.x} y1={CHART_BOTTOM} x2={CHART_PADDING_H + m.x} y2={CHART_BOTTOM + 4} stroke="rgba(255,255,255,0.15)" strokeWidth={0.5} />
                <text x={CHART_PADDING_H + m.x} y={CHART_BOTTOM + 15} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.35)">{m.year}</text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2.5 rounded-sm border" style={{ backgroundColor: BULL_MUTED, borderColor: BULL_COLOR }} />
          <span className="text-[10px] text-slate-500">Bull</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2.5 rounded-sm border" style={{ backgroundColor: BEAR_MUTED, borderColor: BEAR_COLOR }} />
          <span className="text-[10px] text-slate-500">Bear</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded" style={{ backgroundColor: LINE_COLOR }} />
          <span className="text-[10px] text-slate-500">S&P 500 (normalized)</span>
        </div>
      </div>

      <p className="text-[10px] text-slate-600 text-center mt-1">Click a period for details</p>

      {/* Selected period detail */}
      {selectedIdx !== null && periods[selectedIdx] && (
        <SelectedPeriodDetail period={periods[selectedIdx]} />
      )}

      {/* Period table — expandable */}
      <details className="mt-3 pt-3 border-t border-slate-700/50">
        <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300 flex items-center gap-1">
          <ChevronDown className="w-3 h-3" /> View all {periods.length} periods
        </summary>
        <div className="mt-2 overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-800">
              <tr className="text-slate-500 uppercase border-b border-slate-700">
                <th className="text-left py-1.5 px-1">#</th>
                <th className="text-left py-1.5 px-1">Type</th>
                <th className="text-left py-1.5 px-1">Start</th>
                <th className="text-left py-1.5 px-1">End</th>
                <th className="text-right py-1.5 px-1">Duration</th>
                <th className="text-right py-1.5 px-1">Return</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p, i) => {
                const isBull = p.regime === "BULL" || p.regime === "RECOVERY";
                return (
                  <tr
                    key={i}
                    className={`border-b border-slate-800/50 hover:bg-slate-700/30 cursor-pointer ${selectedIdx === i ? "bg-slate-700/40" : ""}`}
                    onClick={() => setSelectedIdx(selectedIdx === i ? null : i)}
                  >
                    <td className="py-1 px-1 text-slate-600">{i + 1}</td>
                    <td className="py-1 px-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isBull ? "bg-emerald-900/30 text-emerald-400" : "bg-red-900/30 text-red-400"}`}>
                        {p.regime}
                      </span>
                    </td>
                    <td className="py-1 px-1 text-slate-400">{new Date(p.start + "T00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })}</td>
                    <td className="py-1 px-1 text-slate-400">{new Date(p.end + "T00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })}</td>
                    <td className="py-1 px-1 text-right text-slate-300">{fmtDur(p.days)}</td>
                    <td className={`py-1 px-1 text-right font-mono font-bold ${isBull ? "text-emerald-400" : "text-red-400"}`}>{fmtRet(p.spy_return_pct)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function SelectedPeriodDetail({ period }: { period: HistoricPeriod }) {
  const isBull = period.regime === "BULL" || period.regime === "RECOVERY";
  const c = isBull ? "#22c55e" : "#ef4444";
  const fmtDate = (s: string) => new Date(s + "T00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const fmtRet = (p: number) => `${p >= 0 ? "+" : ""}${p.toFixed(1)}%`;
  const fmtDur = (d: number) => d >= 730 ? `${(d / 365).toFixed(1)}y` : d >= 60 ? `${Math.round(d / 30)}mo` : `${d}d`;

  return (
    <div className="mt-3 bg-slate-900/50 border border-slate-700/50 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
        <span className="text-xs font-bold" style={{ color: c }}>{period.regime}</span>
        <span className="text-xs text-slate-500">{fmtDate(period.start)} → {fmtDate(period.end)}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <p className="text-[10px] text-slate-500">Duration</p>
          <p className="text-sm font-semibold text-slate-200">{period.days} days ({fmtDur(period.days)})</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500">Return</p>
          <p className="text-sm font-semibold" style={{ color: c }}>{fmtRet(period.spy_return_pct)}</p>
        </div>
        {period.annualized_return_pct != null && (
          <div>
            <p className="text-[10px] text-slate-500">Annualized</p>
            <p className="text-sm font-semibold text-slate-200">{fmtRet(period.annualized_return_pct)}</p>
          </div>
        )}
        {period.spy_max_drawdown_pct != null && (
          <div>
            <p className="text-[10px] text-slate-500">Max Drawdown</p>
            <p className="text-sm font-semibold text-red-400">{period.spy_max_drawdown_pct.toFixed(1)}%</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Asset Detail Modal ───────────────────────────
function AssetDetailModal({
  visible,
  onClose,
  ticker,
  sectorName,
  rotationScore,
  currentCyclePosition,
  regimeData,
}: {
  visible: boolean;
  onClose: () => void;
  ticker: string;
  sectorName: string;
  rotationScore: RotationScore | null;
  currentCyclePosition: number;
  regimeData: RegimeComparison | null;
}) {
  if (!visible || !rotationScore) return null;

  const zone = SECTOR_OPTIMAL_ZONES[sectorName];
  const isFavorable = rotationScore.favorable_phase;
  const components = rotationScore.components;

  // Build reconciled insight
  const theorizedRegime = zone?.description?.includes("bear") ? "BEAR" : zone?.description?.includes("recovery") ? "RECOVERY" : "BULL";
  const reconciledInsight = useMemo(() => {
    const theory = SECTOR_THEORY[sectorName] ?? `${sectorName} rotation positioning from Stovall model.`;
    if (!regimeData) return { text: theory, verdict: "theory_only" as const };
    const targetRegimes = regimeData.regimes.filter((r) => r.regime === theorizedRegime);
    const periodsWithData = targetRegimes.filter((r) => r.assets[ticker]?.available && r.assets[ticker]?.relativeVsSpy !== undefined);
    if (periodsWithData.length === 0) return { text: theory, verdict: "theory_only" as const };
    const relatives = periodsWithData.map((r) => r.assets[ticker]!.relativeVsSpy!);
    const avgVsSpy = Math.round((relatives.reduce((a, b) => a + b, 0) / relatives.length) * 10) / 10;
    const winRate = Math.round((relatives.filter((v) => v > 0).length / relatives.length) * 100);
    const supported = avgVsSpy > 0 && winRate >= 50;
    const contradicted = avgVsSpy < 0 && winRate < 50;
    let dataNote: string;
    if (supported) {
      dataNote = `Historical data supports this: averages ${avgVsSpy > 0 ? "+" : ""}${avgVsSpy.toFixed(1)}% vs SPY with a ${winRate}% win rate across ${periodsWithData.length} periods.`;
    } else if (contradicted) {
      dataNote = `Historical data challenges this: averages ${avgVsSpy.toFixed(1)}% vs SPY with only a ${winRate}% win rate across ${periodsWithData.length} periods.`;
    } else {
      dataNote = `Mixed evidence: averages ${avgVsSpy > 0 ? "+" : ""}${avgVsSpy.toFixed(1)}% vs SPY with a ${winRate}% win rate across ${periodsWithData.length} periods.`;
    }
    return {
      text: `${theory}\n\n${dataNote}`,
      verdict: (supported ? "supported" : contradicted ? "contradicted" : "mixed") as "supported" | "contradicted" | "mixed",
    };
  }, [regimeData, sectorName, ticker, theorizedRegime]);

  // Mini sine wave for the modal
  const MINI_WIDTH = 500;
  const MINI_HEIGHT = 100;
  const MINI_MID_Y = MINI_HEIGHT / 2;
  const MINI_AMP = 32;
  const MINI_PHASE_OFFSET = -Math.PI / 2;

  const miniWavePath = useMemo(() => {
    let d = "";
    for (let i = 0; i <= 100; i++) {
      const x = (i / 100) * MINI_WIDTH;
      const t = (i / 100) * 2 * Math.PI + MINI_PHASE_OFFSET;
      const y = MINI_MID_Y - MINI_AMP * Math.sin(t);
      d += i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  }, []);

  const miniDotX = currentCyclePosition * MINI_WIDTH;
  const miniDotY = MINI_MID_Y - MINI_AMP * Math.sin(currentCyclePosition * 2 * Math.PI + MINI_PHASE_OFFSET);

  // Zone fill
  const zoneFill = useMemo(() => {
    if (!zone) return "";
    const start = zone.start;
    const end = zone.end;
    const wraps = start > end;
    const pts = 60;
    let d = "";
    if (wraps) {
      for (let i = 0; i <= pts; i++) {
        const pos = start + (i / pts) * (1.0 - start);
        const x = pos * MINI_WIDTH;
        const y = MINI_MID_Y - MINI_AMP * Math.sin(pos * 2 * Math.PI + MINI_PHASE_OFFSET);
        d += i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      d += ` L ${MINI_WIDTH.toFixed(1)} ${(MINI_HEIGHT + 5).toFixed(1)} L ${(start * MINI_WIDTH).toFixed(1)} ${(MINI_HEIGHT + 5).toFixed(1)} Z`;
      d += ` M 0 ${(MINI_MID_Y - MINI_AMP * Math.sin(MINI_PHASE_OFFSET)).toFixed(1)}`;
      for (let i = 1; i <= pts; i++) {
        const pos = (i / pts) * end;
        const x = pos * MINI_WIDTH;
        const y = MINI_MID_Y - MINI_AMP * Math.sin(pos * 2 * Math.PI + MINI_PHASE_OFFSET);
        d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      d += ` L ${(end * MINI_WIDTH).toFixed(1)} ${(MINI_HEIGHT + 5).toFixed(1)} L 0 ${(MINI_HEIGHT + 5).toFixed(1)} Z`;
    } else {
      for (let i = 0; i <= pts; i++) {
        const pos = start + (i / pts) * (end - start);
        const x = pos * MINI_WIDTH;
        const y = MINI_MID_Y - MINI_AMP * Math.sin(pos * 2 * Math.PI + MINI_PHASE_OFFSET);
        d += i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      d += ` L ${(end * MINI_WIDTH).toFixed(1)} ${(MINI_HEIGHT + 5).toFixed(1)} L ${(start * MINI_WIDTH).toFixed(1)} ${(MINI_HEIGHT + 5).toFixed(1)} Z`;
    }
    return d;
  }, [zone]);

  // Regime comparison table for this ticker
  const regimeStats = useMemo(() => {
    if (!regimeData) return [];
    const regimeTypes = ["BULL", "BEAR", "RECOVERY", "SIDEWAYS"];
    return regimeTypes.map((regime) => {
      const matchingPeriods = regimeData.regimes.filter((r) => r.regime === regime && r.assets[ticker]?.available);
      if (matchingPeriods.length === 0) return { regime, count: 0, avgReturn: 0, avgVsSpy: 0, winRate: 0 };
      const returns = matchingPeriods.map((r) => r.assets[ticker].totalReturn);
      const relatives = matchingPeriods.map((r) => r.assets[ticker].relativeVsSpy);
      return {
        regime,
        count: matchingPeriods.length,
        avgReturn: returns.reduce((a, b) => a + b, 0) / returns.length,
        avgVsSpy: relatives.reduce((a, b) => a + b, 0) / relatives.length,
        winRate: Math.round((relatives.filter((v) => v > 0).length / relatives.length) * 100),
      };
    });
  }, [regimeData, ticker]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700/50 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">{ticker}</h2>
            <p className="text-sm text-slate-400">{sectorName}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${isFavorable ? "bg-emerald-900/40 text-emerald-400" : "bg-red-900/40 text-red-400"}`}>
              {isFavorable ? "✓ Outperforming" : "✗ Underperforming"}
            </span>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700 transition-colors">
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Relative performance disclaimer */}
          <div className="flex items-start gap-2 bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
            <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-400 leading-relaxed">
              Outperforming = expected to lose less than SPY during downturns, or gain more during upturns. This is about <span className="font-bold text-slate-200">relative</span> performance, not absolute returns.
            </p>
          </div>

          {/* Mini Cycle Chart */}
          <div>
            <h3 className="text-sm font-bold text-slate-200 mb-2">Cycle Position</h3>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <svg width="100%" height={MINI_HEIGHT} viewBox={`0 0 ${MINI_WIDTH} ${MINI_HEIGHT}`} preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="modalZoneGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#22c55e" stopOpacity="0.3" />
                    <stop offset="1" stopColor="#22c55e" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                <line x1={0} y1={MINI_MID_Y} x2={MINI_WIDTH} y2={MINI_MID_Y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} strokeDasharray="4,8" />
                {zone && <path d={zoneFill} fill="url(#modalZoneGrad)" />}
                <path d={miniWavePath} fill="none" stroke={INDIGO} strokeWidth={2} opacity={0.8} />
                {zone && (
                  <text x={((zone.start > zone.end ? ((zone.start + 1 + zone.end) / 2) % 1 : (zone.start + zone.end) / 2)) * MINI_WIDTH} y={MINI_HEIGHT - 6} textAnchor="middle" fontSize={9} fill="#22c55e" opacity={0.7}>Optimal Zone</text>
                )}
                <circle cx={miniDotX} cy={miniDotY} r={7} fill={INDIGO} opacity={0.25} />
                <circle cx={miniDotX} cy={miniDotY} r={4} fill="#ffffff" />
                <text x={miniDotX} y={miniDotY > MINI_MID_Y ? miniDotY - 10 : miniDotY + 16} textAnchor="middle" fontSize={8} fontWeight="bold" fill="#ffffff">You Are Here</text>
              </svg>
            </div>
            {zone && (
              <p className="text-xs text-slate-500 text-center mt-1">{sectorName} typically outperforms during {zone.description}</p>
            )}
          </div>

          {/* V12 Score Breakdown */}
          <div>
            <h3 className="text-sm font-bold text-slate-200 mb-1">Rotation Score Breakdown</h3>
            <p className="text-xs text-slate-500 mb-3">V12 composite: {rotationScore.score.toFixed(2)} · RS vs SPY (60d): {(rotationScore.relative_strength_60d).toFixed(1)}%</p>
            <div className="space-y-3">
              {[
                { label: "Role Alignment", value: components.role_alignment, desc: "How well this asset fits the current cycle role" },
                { label: "RS Momentum", value: components.rs_momentum, desc: "Relative strength vs SPY over 60 days" },
                { label: "Recovery Sequence", value: components.recovery_sequence, desc: "Position in the traditional recovery order" },
                { label: "Trend Confirmation", value: components.trend_confirmation, desc: "Is the price trend supporting this position" },
              ].map((bar) => {
                const pct = Math.max(0, Math.min(1, bar.value)) * 100;
                const color = bar.value >= 0.7 ? "bg-emerald-500" : bar.value >= 0.4 ? "bg-amber-500" : "bg-red-500";
                const textColor = bar.value >= 0.7 ? "text-emerald-400" : bar.value >= 0.4 ? "text-amber-400" : "text-red-400";
                return (
                  <div key={bar.label}>
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-xs font-semibold text-slate-300">{bar.label}</span>
                      <span className={`text-xs font-bold ${textColor}`}>{bar.value.toFixed(2)}</span>
                    </div>
                    <p className="text-[10px] text-slate-600 mb-1">{bar.desc}</p>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Phase Alignment */}
          <div>
            <h3 className="text-sm font-bold text-slate-200 mb-2">Phase Alignment</h3>
            <div className="bg-slate-900/50 rounded-lg p-3 space-y-2">
              {[
                { label: "Alignment", value: rotationScore.phase_alignment, color: rotationScore.phase_alignment === "peak_favorable" || rotationScore.phase_alignment === "aligned" || rotationScore.phase_alignment === "favorable" ? "text-emerald-400" : rotationScore.phase_alignment === "neutral" ? "text-amber-400" : "text-red-400" },
                { label: "Favorable Phase", value: isFavorable ? "✓ Yes" : "✗ No", color: isFavorable ? "text-emerald-400" : "text-red-400" },
                ...(rotationScore.lead_lag_signal ? [{ label: "Lead / Lag", value: rotationScore.lead_lag_signal.replace(/_/g, " "), color: "text-slate-300" }] : []),
                { label: "Confidence", value: `${rotationScore.confidence_modifier > 0 ? "+" : ""}${rotationScore.confidence_modifier.toFixed(2)}`, color: "text-slate-300" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">{item.label}</span>
                  <span className={`text-xs font-bold capitalize ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Key Insight */}
          <div className={`flex items-start gap-2 rounded-lg p-3 ${
            reconciledInsight.verdict === "supported" ? "bg-emerald-900/20 border border-emerald-700/30" :
            reconciledInsight.verdict === "contradicted" ? "bg-red-900/20 border border-red-700/30" :
            "bg-indigo-900/20 border border-indigo-700/30"
          }`}>
            <span className="text-base mt-0.5">
              {reconciledInsight.verdict === "supported" ? "✅" : reconciledInsight.verdict === "contradicted" ? "⚠️" : reconciledInsight.verdict === "mixed" ? "🔀" : "📐"}
            </span>
            <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line">{reconciledInsight.text}</p>
          </div>

          {/* Regime Comparison Table */}
          {regimeStats.length > 0 && regimeStats.some((r) => r.count > 0) && (
            <div>
              <h3 className="text-sm font-bold text-slate-200 mb-2">Historical Regime Performance — {ticker}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 uppercase border-b border-slate-700">
                      <th className="text-left py-1.5 px-2">Regime</th>
                      <th className="text-right py-1.5 px-2">Periods</th>
                      <th className="text-right py-1.5 px-2">Avg Return</th>
                      <th className="text-right py-1.5 px-2">vs SPY</th>
                      <th className="text-right py-1.5 px-2">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regimeStats.filter((r) => r.count > 0).map((r) => (
                      <tr key={r.regime} className="border-b border-slate-800/50">
                        <td className="py-1.5 px-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            r.regime === "BULL" ? "bg-emerald-900/30 text-emerald-400" :
                            r.regime === "BEAR" ? "bg-red-900/30 text-red-400" :
                            r.regime === "RECOVERY" ? "bg-blue-900/30 text-blue-400" :
                            "bg-amber-900/30 text-amber-400"
                          }`}>
                            {r.regime}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-right text-slate-400">{r.count}</td>
                        <td className={`py-1.5 px-2 text-right font-mono ${r.avgReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {r.avgReturn >= 0 ? "+" : ""}{r.avgReturn.toFixed(1)}%
                        </td>
                        <td className={`py-1.5 px-2 text-right font-mono font-bold ${r.avgVsSpy >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {r.avgVsSpy >= 0 ? "+" : ""}{r.avgVsSpy.toFixed(1)}%
                        </td>
                        <td className={`py-1.5 px-2 text-right font-mono ${r.winRate >= 50 ? "text-emerald-400" : "text-red-400"}`}>
                          {r.winRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Main MarketCycles Component =====

export default function MarketCycles() {
  const [rotationStatus, setRotationStatus] = useState<RotationStatus | null>(null);
  const [historicPeriods, setHistoricPeriods] = useState<HistoricPeriod[]>([]);
  const [regimeData, setRegimeData] = useState<RegimeComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<{
    ticker: string;
    sectorName: string;
    rotationScore: RotationScore | null;
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [rotRes, histRes, regimeRes] = await Promise.all([
          fetch("/data/trading/rotation-status.json"),
          fetch("/data/trading/historic-bull-bear.json"),
          fetch("/data/trading/regime-comparison.json"),
        ]);

        if (!rotRes.ok) throw new Error("Failed to load rotation status");
        if (!histRes.ok) throw new Error("Failed to load historic bull/bear data");

        const rotJson = await rotRes.json();
        const histJson = await histRes.json();

        setRotationStatus(rotJson);

        // Deduplicate periods: Visual Capitalist (pre-1993) and MRE (post-1993) overlap.
        // Trim or remove VC periods that overlap with MRE data.
        const rawPeriods: HistoricPeriod[] = histJson.periods || [];
        const mreStart = rawPeriods.find((p) => p.source === "mre_v12")?.start;
        const deduped = mreStart
          ? rawPeriods.filter((p) => {
              if (p.source !== "visual_capitalist") return true;
              // Keep VC periods that end before MRE starts
              return p.end <= mreStart;
            })
          : rawPeriods;
        setHistoricPeriods(deduped);

        if (regimeRes.ok) {
          const regimeJson = await regimeRes.json();
          setRegimeData(regimeJson);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSectorClick = useCallback((ticker: string, sectorName: string, score: RotationScore | null) => {
    setSelectedAsset({ ticker, sectorName, rotationScore: score });
    setModalVisible(true);
  }, []);

  const currentPos = PHASE_POSITION[rotationStatus?.cycle_phase ?? ""] ?? 0.5;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  if (!rotationStatus) return null;

  return (
    <div className="space-y-6">
      {/* Section A: Cycle Position Chart */}
      <CyclePositionChart
        rotationStatus={rotationStatus}
        regimeData={regimeData}
        onSectorClick={handleSectorClick}
      />

      {/* Section B: Sector Rotation Card */}
      <SectorRotationCard rotationStatus={rotationStatus} />

      {/* Section C: Bull/Bear Timeline */}
      <BullBearTimeline periods={historicPeriods} />

      {/* Asset Detail Modal */}
      <AssetDetailModal
        visible={modalVisible && !!selectedAsset}
        onClose={() => {
          setModalVisible(false);
          setSelectedAsset(null);
        }}
        ticker={selectedAsset?.ticker ?? ""}
        sectorName={selectedAsset?.sectorName ?? ""}
        rotationScore={selectedAsset?.rotationScore ?? null}
        currentCyclePosition={currentPos}
        regimeData={regimeData}
      />
    </div>
  );
}
