"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp } from "lucide-react";

interface WaterfallStep {
  name: string;
  displayName: string;
  value: number;
  cumulative: number;
  isBase: boolean;
  isFinal: boolean;
  contribution?: number;
  color: string;
  description: string;
}

export default function RobustnessWaterfallChart() {
  // Define the waterfall steps based on the robustness improvement journey
  const steps: WaterfallStep[] = [
    {
      name: "base",
      displayName: "Base",
      value: 13.5,
      cumulative: 13.5,
      isBase: true,
      isFinal: false,
      color: "#EF4444",
      description: "Original backtest-only validation"
    },
    {
      name: "cpcv",
      displayName: "+CPCV",
      value: 15,
      cumulative: 28.5,
      isBase: false,
      isFinal: false,
      contribution: 15,
      color: "#4F46E5",
      description: "Combinatorially Purged Cross-Validation"
    },
    {
      name: "ensemble",
      displayName: "+Ensemble",
      value: 20,
      cumulative: 48.5,
      isBase: false,
      isFinal: false,
      contribution: 20,
      color: "#8B5CF6",
      description: "Multi-strategy ensemble voting"
    },
    {
      name: "noise",
      displayName: "+Noise Testing",
      value: 18.5,
      cumulative: 67,
      isBase: false,
      isFinal: true,
      contribution: 18.5,
      color: "#10B981",
      description: "Synthetic noise resilience validation"
    }
  ];

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) {
      return null;
    }

    const data = payload[0].payload as WaterfallStep;
    
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
        <p className="text-slate-200 font-semibold">{data.displayName}</p>
        <p className="text-slate-300 text-sm">{data.description}</p>
        {data.contribution && (
          <p className="text-emerald-400 font-mono">
            +{data.contribution.toFixed(1)}% contribution
          </p>
        )}
        <p className="text-slate-200 font-mono">
          {data.isBase ? 'Starting point' : 'Cumulative'}: {data.cumulative.toFixed(1)}%
        </p>
      </div>
    );
  };

  // Custom bar component to show waterfall effect
  const WaterfallBar = (props: any) => {
    const { payload, x, y, width, height } = props;
    const step = payload as WaterfallStep;
    
    if (step.isBase) {
      // Base bar starts from 0
      return (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={step.color}
          className="opacity-80"
        />
      );
    } else {
      // Contribution bars start from previous cumulative
      const startY = y + height;
      const barHeight = (step.contribution || 0) * (height / step.cumulative);
      const barY = startY - barHeight;
      
      return (
        <rect
          x={x}
          y={barY}
          width={width}
          height={barHeight}
          fill={step.color}
          className="opacity-80"
        />
      );
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          Robustness Improvement Journey
        </h3>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">Starting Point</div>
          <div className="text-lg font-bold text-red-400">13.5%</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">Final Robustness</div>
          <div className="text-lg font-bold text-emerald-400">67.0%</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">Total Improvement</div>
          <div className="text-lg font-bold text-amber-400">+53.5%</div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3 text-center">
          <div className="text-xs text-slate-500">Multiplier</div>
          <div className="text-lg font-bold text-cyan-400">5.0×</div>
        </div>
      </div>

      {/* Waterfall chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={steps} 
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1A1A24" />
            <XAxis 
              dataKey="displayName" 
              stroke="#8B8B80"
              tick={{ fill: '#8B8B80', fontSize: 12 }}
              tickLine={{ stroke: '#8B8B80' }}
            />
            <YAxis 
              domain={[0, 75]}
              stroke="#8B8B80"
              tick={{ fill: '#8B8B80', fontSize: 12 }}
              tickLine={{ stroke: '#8B8B80' }}
              label={{ value: 'Robustness Score (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="cumulative" shape={<WaterfallBar />}>
              {steps.map((step, index) => (
                <Cell key={`cell-${index}`} fill={step.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Technique breakdown */}
      <div className="mt-4 grid grid-cols-4 gap-3">
        {steps.map(step => (
          <div key={step.name} className="bg-slate-900/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <div 
                className="w-3 h-3 rounded" 
                style={{ backgroundColor: step.color }}
              ></div>
              <div className="text-xs font-semibold text-slate-300">
                {step.displayName}
              </div>
            </div>
            <div className="text-sm text-slate-400 mb-1">
              {step.description}
            </div>
            <div className="text-lg font-bold" style={{ color: step.color }}>
              {step.isBase 
                ? `${step.value.toFixed(1)}%` 
                : `+${step.contribution?.toFixed(1)}%`
              }
            </div>
          </div>
        ))}
      </div>

      {/* Method descriptions */}
      <div className="mt-4 bg-slate-900/30 rounded-lg p-3">
        <h4 className="text-sm font-semibold text-slate-300 mb-2">Validation Methods</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-400">
          <div>
            <span className="text-blue-400 font-semibold">CPCV:</span> Prevents data leakage through purged cross-validation with combinatorial splits
          </div>
          <div>
            <span className="text-purple-400 font-semibold">Ensemble:</span> Multi-strategy agreement reduces overfitting to single approach
          </div>
          <div>
            <span className="text-emerald-400 font-semibold">Noise Testing:</span> Synthetic data perturbation validates signal vs. noise
          </div>
          <div>
            <span className="text-amber-400 font-semibold">Combined Effect:</span> Multiplicative robustness from independent validation layers
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-500 text-center">
        MRE Robustness Framework • Updated 2026-02-24
      </div>
    </div>
  );
}