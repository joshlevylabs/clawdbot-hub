"use client";

import { useEffect, useRef, useState } from 'react';

interface PersistenceFlipFlopProps {
  inputCount: number;
  confirmedCount: number;
  pendingCount: number;
  filteredCount: number;
  className?: string;
}

/**
 * Flip-flop style persistence gate visual.
 * 
 * Shows a D flip-flop inspired diagram with:
 *  - Input (D) on the left
 *  - Clock triangle at the bottom (representing 2-day confirmation cycle)
 *  - Q output (confirmed) — top right, green
 *  - Pending (feedback loop) — middle, amber, loops back
 *  - Q̄ output (filtered) — bottom right, red
 */
export default function PersistenceFlipFlop({
  inputCount,
  confirmedCount,
  pendingCount,
  filteredCount,
  className = '',
}: PersistenceFlipFlopProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 300);
    return () => clearTimeout(t);
  }, []);

  const total = confirmedCount + pendingCount + filteredCount;
  const confirmedPct = total > 0 ? (confirmedCount / total) * 100 : 0;
  const pendingPct = total > 0 ? (pendingCount / total) * 100 : 0;
  const filteredPct = total > 0 ? (filteredCount / total) * 100 : 0;

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 320 200"
        className="w-full h-auto"
        style={{ maxWidth: 320 }}
      >
        <defs>
          {/* Glow filters */}
          <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-amber" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Animated dash for pending loop */}
          <style>{`
            @keyframes dashFlow {
              to { stroke-dashoffset: -20; }
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes pulseGlow {
              0%, 100% { opacity: 0.6; }
              50% { opacity: 1; }
            }
            .flow-dash {
              animation: dashFlow 1s linear infinite;
            }
            .fade-in {
              animation: fadeIn 0.6s ease-out forwards;
            }
            .pulse-glow {
              animation: pulseGlow 2s ease-in-out infinite;
            }
          `}</style>
        </defs>

        {/* ═══ FLIP-FLOP BODY ═══ */}
        <rect
          x="90" y="25" width="140" height="150"
          rx="6" ry="6"
          fill="rgba(15, 23, 42, 0.9)"
          stroke="rgba(148, 163, 184, 0.3)"
          strokeWidth="2"
        />

        {/* Inner divider lines (like IC pin sections) */}
        <line x1="90" y1="75" x2="230" y2="75" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="1" />
        <line x1="90" y1="125" x2="230" y2="125" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="1" />

        {/* Clock triangle at bottom-left of body */}
        <polygon
          points="90,155 105,145 90,135"
          fill="none"
          stroke="rgba(251, 191, 36, 0.6)"
          strokeWidth="1.5"
        />
        <text x="108" y="150" fontSize="8" fill="rgba(251, 191, 36, 0.5)" fontFamily="monospace">CLK</text>
        <text x="108" y="160" fontSize="7" fill="rgba(148, 163, 184, 0.4)" fontFamily="monospace">2-day</text>

        {/* ═══ INPUT (D) — LEFT SIDE ═══ */}
        {/* Input line */}
        <line
          x1="20" y1="50" x2="90" y2="50"
          stroke="rgba(148, 163, 184, 0.5)"
          strokeWidth="2"
          className={animate ? 'fade-in' : ''}
          style={{ opacity: animate ? 1 : 0 }}
        />
        {/* D label */}
        <text x="82" y="45" fontSize="10" fill="rgba(148, 163, 184, 0.6)" fontFamily="monospace" textAnchor="end">D</text>
        {/* Input count bubble */}
        <circle cx="20" cy="50" r="14" fill="rgba(30, 41, 59, 0.9)" stroke="rgba(148, 163, 184, 0.4)" strokeWidth="1.5" />
        <text x="20" y="54" fontSize="11" fill="rgba(226, 232, 240, 0.9)" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
          {inputCount}
        </text>
        <text x="20" y="72" fontSize="7" fill="rgba(148, 163, 184, 0.5)" fontFamily="sans-serif" textAnchor="middle">input</text>

        {/* ═══ OUTPUT Q (CONFIRMED) — TOP RIGHT ═══ */}
        {/* Q output line */}
        <line
          x1="230" y1="50" x2="280" y2="50"
          stroke={confirmedCount > 0 ? 'rgba(52, 211, 153, 0.7)' : 'rgba(148, 163, 184, 0.2)'}
          strokeWidth="2"
          filter={confirmedCount > 0 ? 'url(#glow-green)' : undefined}
          className={animate ? 'fade-in' : ''}
          style={{ opacity: animate ? 1 : 0 }}
        />
        {/* Q label */}
        <text x="236" y="45" fontSize="10" fill={confirmedCount > 0 ? 'rgba(52, 211, 153, 0.8)' : 'rgba(148, 163, 184, 0.4)'} fontFamily="monospace">Q</text>
        {/* Confirmed count bubble */}
        <circle
          cx="295" cy="50" r="14"
          fill={confirmedCount > 0 ? 'rgba(6, 78, 59, 0.6)' : 'rgba(30, 41, 59, 0.6)'}
          stroke={confirmedCount > 0 ? 'rgba(52, 211, 153, 0.5)' : 'rgba(148, 163, 184, 0.2)'}
          strokeWidth="1.5"
        />
        <text x="295" y="54" fontSize="11" fill={confirmedCount > 0 ? 'rgba(52, 211, 153, 1)' : 'rgba(148, 163, 184, 0.4)'} fontFamily="monospace" textAnchor="middle" fontWeight="bold">
          {confirmedCount}
        </text>
        <text x="295" y="72" fontSize="7" fill={confirmedCount > 0 ? 'rgba(52, 211, 153, 0.7)' : 'rgba(148, 163, 184, 0.4)'} fontFamily="sans-serif" textAnchor="middle">
          confirmed
        </text>

        {/* ═══ PENDING (FEEDBACK LOOP) — MIDDLE ═══ */}
        {/* Pending output line to right */}
        <line
          x1="230" y1="100" x2="255" y2="100"
          stroke={pendingCount > 0 ? 'rgba(251, 191, 36, 0.6)' : 'rgba(148, 163, 184, 0.15)'}
          strokeWidth="2"
          className={animate ? 'fade-in' : ''}
          style={{ opacity: animate ? 1 : 0 }}
        />
        {/* Feedback loop: right, down, left, back to input */}
        {pendingCount > 0 ? (
          <path
            d="M 255,100 L 255,190 L 55,190 L 55,50 L 90,50"
            fill="none"
            stroke="rgba(251, 191, 36, 0.4)"
            strokeWidth="1.5"
            strokeDasharray="6 4"
            className="flow-dash"
          />
        ) : (
          <path
            d="M 255,100 L 255,190 L 55,190 L 55,50 L 90,50"
            fill="none"
            stroke="rgba(148, 163, 184, 0.08)"
            strokeWidth="1"
            strokeDasharray="6 4"
          />
        )}
        {/* Loop arrow */}
        {pendingCount > 0 && (
          <polygon
            points="90,50 78,44 78,56"
            fill="rgba(251, 191, 36, 0.4)"
          />
        )}
        {/* Pending label on loop */}
        <rect x="100" y="182" width="60" height="16" rx="3" fill="rgba(30, 41, 59, 0.9)" />
        <text x="130" y="193" fontSize="8" fill={pendingCount > 0 ? 'rgba(251, 191, 36, 0.8)' : 'rgba(148, 163, 184, 0.3)'} fontFamily="monospace" textAnchor="middle">
          ⏳ {pendingCount} pending
        </text>
        {/* Internal label */}
        <text x="160" y="104" fontSize="9" fill={pendingCount > 0 ? 'rgba(251, 191, 36, 0.5)' : 'rgba(148, 163, 184, 0.3)'} fontFamily="monospace" textAnchor="middle">
          wait
        </text>

        {/* ═══ OUTPUT Q̄ (FILTERED) — BOTTOM RIGHT ═══ */}
        {/* Q-bar output line */}
        <line
          x1="230" y1="150" x2="280" y2="150"
          stroke={filteredCount > 0 ? 'rgba(248, 113, 113, 0.6)' : 'rgba(148, 163, 184, 0.15)'}
          strokeWidth="2"
          filter={filteredCount > 0 ? 'url(#glow-red)' : undefined}
          className={animate ? 'fade-in' : ''}
          style={{ opacity: animate ? 1 : 0 }}
        />
        {/* Q-bar label */}
        <text x="236" y="145" fontSize="10" fill={filteredCount > 0 ? 'rgba(248, 113, 113, 0.7)' : 'rgba(148, 163, 184, 0.3)'} fontFamily="monospace">
          Q̄
        </text>
        {/* Filtered count bubble */}
        <circle
          cx="295" cy="150" r="14"
          fill={filteredCount > 0 ? 'rgba(127, 29, 29, 0.5)' : 'rgba(30, 41, 59, 0.6)'}
          stroke={filteredCount > 0 ? 'rgba(248, 113, 113, 0.4)' : 'rgba(148, 163, 184, 0.15)'}
          strokeWidth="1.5"
        />
        <text x="295" y="154" fontSize="11" fill={filteredCount > 0 ? 'rgba(248, 113, 113, 1)' : 'rgba(148, 163, 184, 0.3)'} fontFamily="monospace" textAnchor="middle" fontWeight="bold">
          {filteredCount}
        </text>
        <text x="295" y="172" fontSize="7" fill={filteredCount > 0 ? 'rgba(248, 113, 113, 0.6)' : 'rgba(148, 163, 184, 0.3)'} fontFamily="sans-serif" textAnchor="middle">
          filtered
        </text>

        {/* ═══ INTERNAL STATE LABELS ═══ */}
        {/* Top section: Confirmed state */}
        <text x="160" y="55" fontSize="9" fill="rgba(52, 211, 153, 0.4)" fontFamily="monospace" textAnchor="middle">
          SET
        </text>
        {/* Middle section: Pending state */}
        {/* Bottom section: Reset/filtered state */}
        <text x="160" y="153" fontSize="9" fill="rgba(248, 113, 113, 0.3)" fontFamily="monospace" textAnchor="middle">
          RST
        </text>

        {/* Active indicator dot — shows which state is dominant */}
        {confirmedCount > 0 && (
          <circle cx="220" cy="50" r="3" fill="rgba(52, 211, 153, 0.8)" className="pulse-glow" />
        )}
        {pendingCount > 0 && confirmedCount === 0 && (
          <circle cx="220" cy="100" r="3" fill="rgba(251, 191, 36, 0.8)" className="pulse-glow" />
        )}
      </svg>

      {/* Status bar below the diagram */}
      {total > 0 && (
        <div className="mt-2 flex gap-1 h-1.5 rounded-full overflow-hidden bg-slate-800/50">
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
    </div>
  );
}
