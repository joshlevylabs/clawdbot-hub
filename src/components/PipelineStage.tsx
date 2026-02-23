"use client";

import { ChevronRight, Filter, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PipelineStageProps {
  name: string;
  description: string;
  inputCount: number;
  outputCount: number;
  filteredTickers?: string[];
  passedTickers?: string[];
  onClick: () => void;
  isLast?: boolean;
  stageType?: 'input' | 'filter' | 'modifier' | 'output';
}

export default function PipelineStage({
  name,
  description,
  inputCount,
  outputCount,
  filteredTickers = [],
  passedTickers = [],
  onClick,
  isLast = false,
  stageType = 'filter'
}: PipelineStageProps) {
  const passRate = inputCount > 0 ? (outputCount / inputCount) * 100 : 0;
  const filteredCount = inputCount - outputCount;
  
  // Color schemes based on stage type
  const getStageColors = () => {
    switch (stageType) {
      case 'input':
        return {
          card: 'bg-blue-800/30 border-blue-600/50 hover:bg-blue-700/40',
          bar: 'bg-blue-500',
          text: 'text-blue-300',
          icon: 'text-blue-400'
        };
      case 'output':
        return {
          card: 'bg-emerald-800/30 border-emerald-600/50 hover:bg-emerald-700/40',
          bar: 'bg-emerald-500',
          text: 'text-emerald-300',
          icon: 'text-emerald-400'
        };
      case 'modifier':
        return {
          card: 'bg-amber-800/30 border-amber-600/50 hover:bg-amber-700/40',
          bar: 'bg-amber-500',
          text: 'text-amber-300',
          icon: 'text-amber-400'
        };
      default: // filter
        return {
          card: 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/60',
          bar: 'bg-slate-500',
          text: 'text-slate-300',
          icon: 'text-slate-400'
        };
    }
  };

  const colors = getStageColors();
  
  // Icon based on stage type
  const getStageIcon = () => {
    switch (stageType) {
      case 'input':
        return <TrendingUp className={`w-4 h-4 ${colors.icon}`} />;
      case 'output':
        return <TrendingUp className={`w-4 h-4 ${colors.icon}`} />;
      case 'modifier':
        return <Minus className={`w-4 h-4 ${colors.icon}`} />;
      default:
        return <Filter className={`w-4 h-4 ${colors.icon}`} />;
    }
  };

  return (
    <div className="flex items-center">
      {/* Stage Card */}
      <div
        className={`${colors.card} rounded-lg p-4 border cursor-pointer transition-all duration-200 min-w-[180px] max-w-[220px]`}
        onClick={onClick}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          {getStageIcon()}
          <h3 className={`font-semibold text-sm ${colors.text}`}>{name}</h3>
        </div>
        
        {/* Description */}
        <p className="text-xs text-slate-400 mb-3 line-clamp-2">{description}</p>
        
        {/* Counts */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Input:</span>
            <span className="text-slate-200 font-medium">{inputCount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Output:</span>
            <span className="text-slate-200 font-medium">{outputCount.toLocaleString()}</span>
          </div>
          {filteredCount > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Filtered:</span>
              <span className="text-red-400 font-medium">{filteredCount.toLocaleString()}</span>
            </div>
          )}
        </div>
        
        {/* Pass Rate Bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">Pass Rate</span>
            <span className={`font-medium ${colors.text}`}>{Math.round(passRate)}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div 
              className={`${colors.bar} h-2 rounded-full transition-all duration-300`}
              style={{ width: `${Math.max(passRate, 2)}%` }} // Min 2% for visibility
            />
          </div>
        </div>
        
        {/* Click indicator */}
        <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
          <span>Click for details</span>
          <ChevronRight className="w-3 h-3" />
        </div>
      </div>
      
      {/* Arrow to next stage */}
      {!isLast && (
        <div className="flex items-center mx-4">
          {/* Flow line with thickness representing volume */}
          <div 
            className={`${colors.bar} rounded-full transition-all duration-300`}
            style={{ 
              height: `${Math.max(Math.min(outputCount / 50, 8), 2)}px`,
              width: '40px'
            }}
          />
          <ChevronRight className={`w-5 h-5 ${colors.icon} -ml-2`} />
        </div>
      )}
    </div>
  );
}