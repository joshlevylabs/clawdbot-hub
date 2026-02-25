"use client";

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface PersistenceFlipFlopProps {
  inputCount: number;
  confirmedCount: number;
  pendingCount: number;
  filteredCount: number;
  onClick?: () => void;
  version?: string;
  confidence?: number;
  className?: string;
}

/**
 * Integrated Persistence Gate card styled as a flip-flop.
 * Replaces the standard WorkflowNode for the persistence stage.
 * 
 * Layout:
 *  ┌─────────────────────────────────┐
 *  │  ⏱ Persistence Gate             │
 *  │  2-day confirmation required     │
 *  │                                  │
 *  │  D ──▶ ┌────────┐ ──▶ Q   ●    │
 *  │  415   │  GATE  │     0  confirmed
 *  │        │        │               │
 *  │        │  ⏳    │ ──▶ ◐   ●    │
 *  │        │        │     415 pending
 *  │        │  CLK   │               │
 *  │   ▷──  └────────┘ ──▶ Q̄   ●    │
 *  │  2-day              0  filtered  │
 *  │                                  │
 *  │  ████████████████████░░░░░░░░░  │
 *  │  v4.0.0  70% conf               │
 *  └─────────────────────────────────┘
 */
export default function PersistenceFlipFlop({
  inputCount,
  confirmedCount,
  pendingCount,
  filteredCount,
  onClick,
  version,
  confidence,
  className = '',
}: PersistenceFlipFlopProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 200);
    return () => clearTimeout(t);
  }, []);

  const total = Math.max(confirmedCount + pendingCount + filteredCount, 1);
  const confirmedPct = (confirmedCount / total) * 100;
  const pendingPct = (pendingCount / total) * 100;
  const filteredPct = (filteredCount / total) * 100;

  const isPending = pendingCount > 0 && confirmedCount === 0;
  const hasConfirmed = confirmedCount > 0;

  return (
    <div
      className={`
        relative bg-slate-800/90 rounded-xl border-2 p-4 cursor-pointer
        transition-all duration-200 hover:shadow-lg hover:shadow-black/20
        min-w-[200px] md:min-w-[240px] max-w-[280px]
        ${isPending ? 'border-amber-500/40 hover:border-amber-400/60' : hasConfirmed ? 'border-emerald-500/40 hover:border-emerald-400/60' : 'border-slate-600/40 hover:border-slate-500/60'}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Input connector dot */}
      <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-slate-600 border-2 border-slate-700 rounded-full" />
      
      {/* Output connector dot */}
      <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-slate-600 border-2 border-slate-700 rounded-full" />

      {/* Header */}
      <div className="flex items-start gap-2 mb-3">
        <div className="bg-amber-500/20 rounded-lg p-2 w-fit">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-200 leading-tight">Persistence Gate</h3>
          <p className="text-xs text-slate-400 leading-tight">2-day confirmation required</p>
        </div>
      </div>

      {/* ═══ FLIP-FLOP FLOW DIAGRAM ═══ */}
      <div className="relative bg-slate-900/60 rounded-lg border border-slate-700/30 p-3 mb-3">
        
        {/* Input → Gate Body → Three Outputs */}
        <div className="flex items-stretch gap-0">
          
          {/* INPUT SIDE */}
          <div className="flex flex-col justify-center items-center pr-1 shrink-0" style={{ width: 44 }}>
            <span className="text-[9px] text-slate-500 font-mono mb-0.5">D</span>
            <div className="bg-slate-800 border border-slate-600/50 rounded px-1.5 py-0.5">
              <span className="text-xs font-bold text-slate-200 font-mono">{inputCount}</span>
            </div>
          </div>

          {/* FLOW LINES → */}
          <div className="flex flex-col justify-center shrink-0" style={{ width: 16 }}>
            {/* Top line to confirmed */}
            <div className={`h-px mb-[18px] transition-all duration-700 ${confirmedCount > 0 ? 'bg-emerald-500/70' : 'bg-slate-700/40'}`} />
            {/* Middle line to pending */}
            <div className={`h-px mb-[18px] transition-all duration-700 ${pendingCount > 0 ? 'bg-amber-500/70' : 'bg-slate-700/40'}`} />
            {/* Bottom line to filtered */}
            <div className={`h-px transition-all duration-700 ${filteredCount > 0 ? 'bg-red-500/60' : 'bg-slate-700/40'}`} />
          </div>

          {/* GATE BODY */}
          <div className="flex-shrink-0 relative" style={{ width: 44 }}>
            <div className={`
              h-full border-2 rounded-md bg-slate-900/80 flex flex-col items-center justify-center gap-1
              transition-colors duration-500
              ${isPending ? 'border-amber-500/30' : hasConfirmed ? 'border-emerald-500/30' : 'border-slate-700/40'}
            `}>
              {/* Clock triangle */}
              <svg viewBox="0 0 16 12" className="w-3 h-2.5 mt-1">
                <polygon
                  points="0,0 8,6 0,12"
                  fill="none"
                  stroke={isPending ? 'rgba(251,191,36,0.5)' : 'rgba(148,163,184,0.3)'}
                  strokeWidth="1.5"
                />
              </svg>
              <span className="text-[7px] text-slate-500 font-mono leading-none">CLK</span>
              <span className="text-[7px] text-slate-600 font-mono leading-none">2d</span>
            </div>
          </div>

          {/* FLOW LINES → */}
          <div className="flex flex-col justify-center shrink-0" style={{ width: 16 }}>
            <div className={`h-px mb-[18px] transition-all duration-700 ${confirmedCount > 0 ? 'bg-emerald-500/70' : 'bg-slate-700/40'}`} />
            <div className={`h-px mb-[18px] transition-all duration-700 ${pendingCount > 0 ? 'bg-amber-500/70' : 'bg-slate-700/40'}`} />
            <div className={`h-px transition-all duration-700 ${filteredCount > 0 ? 'bg-red-500/60' : 'bg-slate-700/40'}`} />
          </div>

          {/* OUTPUT SIDE — Three rows */}
          <div className="flex flex-col justify-center gap-1.5 flex-1 min-w-0">
            
            {/* Q — Confirmed */}
            <div className="flex items-center gap-1.5">
              <span className={`text-[9px] font-mono font-bold shrink-0 ${confirmedCount > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>Q</span>
              <div className={`
                flex items-center gap-1 rounded px-1.5 py-0.5 flex-1 min-w-0
                ${confirmedCount > 0 ? 'bg-emerald-900/30 border border-emerald-700/30' : 'bg-slate-800/40 border border-slate-700/20'}
              `}>
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${confirmedCount > 0 ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-700'}`} />
                <span className={`text-[10px] font-bold font-mono ${confirmedCount > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {confirmedCount}
                </span>
                <span className={`text-[8px] truncate ${confirmedCount > 0 ? 'text-emerald-500/70' : 'text-slate-600/50'}`}>
                  confirmed
                </span>
              </div>
            </div>

            {/* ◐ — Pending */}
            <div className="flex items-center gap-1.5">
              <span className={`text-[9px] font-mono font-bold shrink-0 ${pendingCount > 0 ? 'text-amber-400' : 'text-slate-600'}`}>◐</span>
              <div className={`
                flex items-center gap-1 rounded px-1.5 py-0.5 flex-1 min-w-0
                ${pendingCount > 0 ? 'bg-amber-900/30 border border-amber-700/30' : 'bg-slate-800/40 border border-slate-700/20'}
              `}>
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${pendingCount > 0 ? 'bg-amber-400 shadow-sm shadow-amber-400/50 animate-pulse' : 'bg-slate-700'}`} />
                <span className={`text-[10px] font-bold font-mono ${pendingCount > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                  {pendingCount}
                </span>
                <span className={`text-[8px] truncate ${pendingCount > 0 ? 'text-amber-500/70' : 'text-slate-600/50'}`}>
                  pending
                </span>
              </div>
            </div>

            {/* Q̄ — Filtered */}
            <div className="flex items-center gap-1.5">
              <span className={`text-[9px] font-mono font-bold shrink-0 ${filteredCount > 0 ? 'text-red-400' : 'text-slate-600'}`}>Q̄</span>
              <div className={`
                flex items-center gap-1 rounded px-1.5 py-0.5 flex-1 min-w-0
                ${filteredCount > 0 ? 'bg-red-900/30 border border-red-700/30' : 'bg-slate-800/40 border border-slate-700/20'}
              `}>
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${filteredCount > 0 ? 'bg-red-400 shadow-sm shadow-red-400/50' : 'bg-slate-700'}`} />
                <span className={`text-[10px] font-bold font-mono ${filteredCount > 0 ? 'text-red-400' : 'text-slate-600'}`}>
                  {filteredCount}
                </span>
                <span className={`text-[8px] truncate ${filteredCount > 0 ? 'text-red-500/70' : 'text-slate-600/50'}`}>
                  filtered
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback loop indicator for pending */}
        {pendingCount > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-700/20 flex items-center gap-1.5">
            <svg viewBox="0 0 16 10" className="w-3 h-2 shrink-0">
              <path d="M 14,1 L 14,5 L 2,5 L 2,1" fill="none" stroke="rgba(251,191,36,0.4)" strokeWidth="1.2" strokeDasharray="2 2" />
              <polygon points="2,1 0,3 4,3" fill="rgba(251,191,36,0.4)" />
            </svg>
            <span className="text-[8px] text-amber-500/60 font-mono">
              {pendingCount} cycling back → awaiting day 2
            </span>
          </div>
        )}
      </div>

      {/* Proportional flow bar */}
      {(confirmedCount > 0 || pendingCount > 0 || filteredCount > 0) && (
        <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden bg-slate-900/50 mb-3">
          {confirmedPct > 0 && (
            <div
              className="bg-emerald-500/70 rounded-full transition-all duration-700"
              style={{ width: `${confirmedPct}%` }}
            />
          )}
          {pendingPct > 0 && (
            <div
              className="bg-amber-500/70 rounded-full transition-all duration-700"
              style={{ width: `${pendingPct}%` }}
            />
          )}
          {filteredPct > 0 && (
            <div
              className="bg-red-500/50 rounded-full transition-all duration-700"
              style={{ width: `${filteredPct}%` }}
            />
          )}
        </div>
      )}

      {/* Version + Confidence badges */}
      {(version || confidence !== undefined) && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {version && (
            <span className="inline-block bg-slate-700/50 text-slate-500 px-2 py-0.5 rounded text-[9px] font-medium">
              v{version}
            </span>
          )}
          {confidence !== undefined && (
            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-medium ${
              confidence >= 85 ? 'bg-emerald-900/40 text-emerald-400' :
              confidence >= 70 ? 'bg-amber-900/40 text-amber-400' :
              confidence >= 50 ? 'bg-orange-900/40 text-orange-400' :
              'bg-red-900/40 text-red-400'
            }`}>
              {confidence}% conf
            </span>
          )}
        </div>
      )}

      {/* Hover glow */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
}
