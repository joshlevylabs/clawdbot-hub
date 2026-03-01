"use client";

import { useState, useEffect } from "react";
import { Shield, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

interface CorrelationData {
  generated_at: string;
  tickers: string[];
  ticker_count: number;
  matrix: number[][];
  pairs: { ticker1: string; ticker2: string; correlation: number }[];
  diversity_score: number;
  mean_abs_correlation: number;
  high_correlation_warnings: { ticker1: string; ticker2: string; correlation: number }[];
  warning_count: number;
}

function DiversityBadge({ score }: { score: number }) {
  const color = score >= 70 ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" :
    score >= 50 ? "text-amber-400 bg-amber-500/15 border-amber-500/30" :
    "text-red-400 bg-red-500/15 border-red-500/30";
  const label = score >= 70 ? "Diversified" : score >= 50 ? "Moderate" : "Concentrated";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium ${color}`}>
      <Shield className="w-3 h-3" />
      Diversity: {score}/100 · {label}
    </span>
  );
}

function CorrCell({ value }: { value: number }) {
  const abs = Math.abs(value);
  const bg = value === 1 ? "bg-slate-700" :
    abs > 0.7 ? "bg-red-500/30" :
    abs > 0.5 ? "bg-amber-500/20" :
    abs > 0.3 ? "bg-blue-500/10" :
    "bg-slate-800/50";
  return (
    <td className={`p-0.5 text-center text-[9px] font-mono ${bg}`} 
        style={{ minWidth: "28px" }}
        title={`ρ = ${value.toFixed(3)}`}>
      {value === 1 ? "—" : value.toFixed(2)}
    </td>
  );
}

export function CorrelationDiversityBadge() {
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    fetch("/data/trading/correlation-heatmap.json")
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setScore(d.diversity_score))
      .catch(() => {});
  }, []);

  if (score === null) return null;
  return <DiversityBadge score={score} />;
}

export default function CorrelationPanel() {
  const [data, setData] = useState<CorrelationData | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/data/trading/correlation-heatmap.json")
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data || data.ticker_count < 2) return null;

  // Show only top 15 tickers in heatmap (otherwise too wide)
  const maxDisplay = 15;
  const displayTickers = data.tickers.slice(0, maxDisplay);
  const displayMatrix = data.matrix.slice(0, maxDisplay).map(row => row.slice(0, maxDisplay));

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50">
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-700/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary-400" />
            Position Correlation
          </h3>
          <DiversityBadge score={data.diversity_score} />
          {data.warning_count > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-amber-400">
              <AlertTriangle className="w-3 h-3" />
              {data.warning_count} high-ρ pairs
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-700/50 pt-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Heatmap */}
            <div className="overflow-x-auto">
              <table className="border-collapse text-[9px]">
                <thead>
                  <tr>
                    <th className="p-0.5" />
                    {displayTickers.map(t => (
                      <th key={t} className="p-0.5 text-slate-400 font-medium" style={{ writingMode: "vertical-rl", maxHeight: "60px" }}>{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayTickers.map((t, i) => (
                    <tr key={t}>
                      <td className="p-0.5 text-slate-400 font-medium text-right pr-1">{t}</td>
                      {displayMatrix[i].map((val, j) => (
                        <CorrCell key={j} value={val} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.ticker_count > maxDisplay && (
                <div className="text-[10px] text-slate-500 mt-1">Showing top {maxDisplay} of {data.ticker_count} tickers</div>
              )}
            </div>

            {/* High correlation warnings */}
            <div>
              <h4 className="text-xs font-medium text-slate-400 mb-2">High Correlation Pairs (ρ &gt; 0.7)</h4>
              {data.high_correlation_warnings.length === 0 ? (
                <p className="text-[11px] text-emerald-400">✓ No highly correlated pairs</p>
              ) : (
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {data.high_correlation_warnings.map((w, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-slate-900/50">
                      <span className="text-slate-300">{w.ticker1} ↔ {w.ticker2}</span>
                      <span className={`font-mono font-medium ${
                        Math.abs(w.correlation) > 0.85 ? "text-red-400" : "text-amber-400"
                      }`}>
                        ρ={w.correlation.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-3 flex items-center gap-3 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500/30" /> &gt;0.7</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500/20" /> 0.5-0.7</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-500/10" /> 0.3-0.5</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-slate-800/50" /> &lt;0.3</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
