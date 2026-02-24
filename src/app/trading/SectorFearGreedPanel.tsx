"use client";

import { Thermometer, BarChart2, ArrowUpDown, AlertTriangle } from 'lucide-react';
import { useMemo } from 'react';

interface SectorFearGreedData {
  broad_market: number;
  technology: number;
  healthcare: number;
  financials: number;
  real_estate: number;
  energy: number;
  bonds: number;
  international: number;
  commodities: number;
}

interface SectorFearGreedPanelProps {
  sectorFearGreed?: SectorFearGreedData;
  globalFearGreed: number;
}

// Sector metadata mapping
const SECTOR_CONFIG = {
  broad_market: { name: 'Broad Market', etf: 'SPY', color: 'blue' },
  technology: { name: 'Technology', etf: 'QQQ', color: 'purple' },
  healthcare: { name: 'Healthcare', etf: 'XLV', color: 'emerald' },
  financials: { name: 'Financials', etf: 'XLF', color: 'amber' },
  real_estate: { name: 'Real Estate', etf: 'IYR', color: 'orange' },
  energy: { name: 'Energy', etf: 'XLE', color: 'red' },
  bonds: { name: 'Bonds', etf: 'TLT', color: 'slate' },
  international: { name: 'International', etf: 'EFA', color: 'indigo' },
  commodities: { name: 'Commodities', etf: 'GLD', color: 'yellow' }
};

// Get F&G color based on score
function getFearGreedColor(score: number): string {
  if (score < 25) return 'bg-red-500/20 border-red-500/30 text-red-400';
  if (score < 40) return 'bg-orange-500/20 border-orange-500/30 text-orange-400';
  if (score < 60) return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400';
  if (score < 75) return 'bg-green-500/20 border-green-500/30 text-green-400';
  return 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400';
}

// Get F&G rating from score
function getFearGreedRating(score: number): string {
  if (score < 25) return 'Extreme Fear';
  if (score < 40) return 'Fear';
  if (score < 60) return 'Neutral';
  if (score < 75) return 'Greed';
  return 'Extreme Greed';
}

// Get divergence indicator
function getDivergenceIndicator(sectorScore: number, globalScore: number) {
  const divergence = sectorScore - globalScore;
  const absDiv = Math.abs(divergence);
  
  if (absDiv <= 10) return null; // No divergence indicator
  
  const isHighDivergence = absDiv > 15;
  
  return {
    divergence,
    isHigh: isHighDivergence,
    icon: divergence > 0 ? '↑' : '↓',
    color: divergence > 0 ? 'text-emerald-400' : 'text-red-400',
    text: `${divergence > 0 ? '+' : ''}${divergence.toFixed(0)}`
  };
}

export default function SectorFearGreedPanel({ 
  sectorFearGreed, 
  globalFearGreed 
}: SectorFearGreedPanelProps) {
  
  const hasSectorData = sectorFearGreed && Object.keys(sectorFearGreed).length > 0;
  
  // Calculate divergences for animation
  const highDivergenceSectors = useMemo(() => {
    if (!hasSectorData) return [];
    
    return Object.entries(sectorFearGreed).filter(([_, score]) => {
      return Math.abs(score - globalFearGreed) > 15;
    }).map(([sector, _]) => sector);
  }, [sectorFearGreed, globalFearGreed]);
  
  if (!hasSectorData) {
    return (
      <div className="mb-8 bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Thermometer className="w-5 h-5 text-primary-400" />
          <h3 className="text-lg font-semibold text-slate-200">Sector Fear & Greed</h3>
        </div>
        <div className="flex items-center justify-center py-8 text-slate-400">
          <AlertTriangle className="w-6 h-6 mr-2" />
          <span className="text-sm">Sector data pending (A-198 pipeline update)</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 bg-slate-800/30 rounded-xl border border-slate-700/50 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Thermometer className="w-5 h-5 text-primary-400" />
        <h3 className="text-lg font-semibold text-slate-200">Sector Fear & Greed</h3>
        <div className="ml-auto flex items-center gap-2 text-sm text-slate-400">
          <BarChart2 className="w-4 h-4" />
          <span>Global: {globalFearGreed.toFixed(0)} ({getFearGreedRating(globalFearGreed)})</span>
        </div>
      </div>
      
      {/* Sector Grid - responsive 3x3 layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(SECTOR_CONFIG).map(([sectorKey, config]) => {
          const score = sectorFearGreed[sectorKey as keyof SectorFearGreedData] || 0;
          const divergenceInfo = getDivergenceIndicator(score, globalFearGreed);
          const isHighDivergence = highDivergenceSectors.includes(sectorKey);
          
          return (
            <div
              key={sectorKey}
              className={`relative border rounded-lg p-3 transition-all duration-300 ${getFearGreedColor(score)} ${
                isHighDivergence ? 'animate-pulse' : ''
              }`}
            >
              {/* Divergence indicator */}
              {divergenceInfo && (
                <div className={`absolute top-1 right-1 text-xs font-bold ${divergenceInfo.color}`}>
                  <ArrowUpDown className="w-3 h-3 inline mr-0.5" />
                  {divergenceInfo.text}
                </div>
              )}
              
              {/* Sector info */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-sm font-semibold">{config.name}</div>
                  <div className="text-xs opacity-80">{config.etf}</div>
                </div>
              </div>
              
              {/* Score and rating */}
              <div className="mt-2">
                <div className="text-lg font-bold">{score.toFixed(0)}</div>
                <div className="text-xs opacity-90">{getFearGreedRating(score)}</div>
              </div>
              
              {/* Visual gauge bar */}
              <div className="mt-2 w-full bg-slate-700/30 rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    score < 25 ? 'bg-red-500' :
                    score < 40 ? 'bg-orange-500' :
                    score < 60 ? 'bg-yellow-500' :
                    score < 75 ? 'bg-green-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(score, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Summary info */}
      <div className="mt-4 p-3 bg-slate-900/50 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <div className="text-slate-400">
            <span className="font-medium">High Divergence:</span> {highDivergenceSectors.length} sectors
          </div>
          <div className="text-slate-400">
            <span className="font-medium">Range:</span> {Math.min(...Object.values(sectorFearGreed)).toFixed(0)} - {Math.max(...Object.values(sectorFearGreed)).toFixed(0)}
          </div>
        </div>
      </div>
    </div>
  );
}