"use client";

import { useState, useEffect } from "react";
import { Target, TrendingUp } from "lucide-react";

interface CalibrationBin {
  label: string;
  predicted: number;
  actual: number;
  count: number;
}

interface BrierData {
  generated_at: string;
  total_signals: number;
  with_5d_outcomes: number;
  brier_score_5d: number | null;
  brier_score_10d: number | null;
  brier_by_signal: { BUY: number | null; HOLD: number | null };
  calibration_curve: CalibrationBin[];
  rolling: Record<string, { brier: number | null; accuracy: number | null; count: number }>;
  overall_accuracy_5d: number | null;
}

function BrierGauge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-slate-500">—</span>;
  const color = score < 0.15 ? "text-emerald-400" : score < 0.20 ? "text-amber-400" : "text-red-400";
  const label = score < 0.10 ? "Excellent" : score < 0.15 ? "Good" : score < 0.20 ? "Fair" : score < 0.25 ? "Below Avg" : "Poor";
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${color}`}>{score.toFixed(3)}</div>
      <div className={`text-[10px] ${color} opacity-75`}>{label}</div>
    </div>
  );
}

function MiniCalibrationChart({ bins }: { bins: CalibrationBin[] }) {
  if (!bins.length) return null;
  // Simple bar chart showing predicted vs actual for each bin
  const maxVal = 1.0;
  
  return (
    <div className="flex items-end gap-1.5 h-[80px]">
      {bins.map((bin, i) => {
        const predH = (bin.predicted / maxVal) * 100;
        const actH = (bin.actual / maxVal) * 100;
        const isOver = bin.actual > bin.predicted; // overperforming
        return (
          <div key={i} className="flex flex-col items-center gap-0.5 flex-1 min-w-0" title={`${bin.label}: predicted ${(bin.predicted*100).toFixed(0)}%, actual ${(bin.actual*100).toFixed(0)}% (n=${bin.count})`}>
            <div className="flex items-end gap-px h-[60px] w-full justify-center">
              <div className="w-2 rounded-t bg-slate-600" style={{ height: `${predH * 0.6}px` }} />
              <div className={`w-2 rounded-t ${isOver ? "bg-emerald-500" : "bg-red-400"}`} style={{ height: `${actH * 0.6}px` }} />
            </div>
            <span className="text-[8px] text-slate-500 truncate w-full text-center">{bin.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function BrierCalibrationCard() {
  const [data, setData] = useState<BrierData | null>(null);

  useEffect(() => {
    fetch("/data/trading/brier-calibration.json")
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data || data.brier_score_5d === null) return null;

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Target className="w-4 h-4 text-primary-400" />
          Signal Calibration
        </h3>
        <span className="text-[10px] text-slate-500">{data.with_5d_outcomes} signals scored</span>
      </div>
      
      <div className="grid grid-cols-3 gap-3 mb-3">
        {/* Brier Score */}
        <div className="bg-slate-900/50 rounded-lg p-2">
          <div className="text-[10px] text-slate-500 mb-1 text-center">Brier Score</div>
          <BrierGauge score={data.brier_score_5d} />
        </div>
        
        {/* BUY accuracy */}
        <div className="bg-slate-900/50 rounded-lg p-2">
          <div className="text-[10px] text-slate-500 mb-1 text-center">BUY Brier</div>
          <BrierGauge score={data.brier_by_signal.BUY} />
        </div>
        
        {/* Overall accuracy */}
        <div className="bg-slate-900/50 rounded-lg p-2">
          <div className="text-[10px] text-slate-500 mb-1 text-center">Accuracy</div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-200">
              {data.overall_accuracy_5d !== null ? `${(data.overall_accuracy_5d * 100).toFixed(0)}%` : "—"}
            </div>
            <div className="text-[10px] text-slate-500">5-day</div>
          </div>
        </div>
      </div>
      
      {/* Calibration curve mini chart */}
      <div className="bg-slate-900/50 rounded-lg p-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-slate-500">Calibration Curve</span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[8px] text-slate-500">
              <span className="w-1.5 h-1.5 rounded-sm bg-slate-600 inline-block" /> Predicted
            </span>
            <span className="flex items-center gap-1 text-[8px] text-slate-500">
              <span className="w-1.5 h-1.5 rounded-sm bg-emerald-500 inline-block" /> Actual
            </span>
          </div>
        </div>
        <MiniCalibrationChart bins={data.calibration_curve} />
      </div>
    </div>
  );
}
