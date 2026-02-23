"use client";

import { X, TrendingUp, TrendingDown, Filter, Minus, DollarSign, Activity } from 'lucide-react';
import { useEffect } from 'react';

interface StageDetails {
  name: string;
  description: string;
  stageType: 'input' | 'filter' | 'modifier' | 'output';
  inputCount: number;
  outputCount: number;
  filteredTickers: Array<{
    symbol: string;
    reason?: string;
    beforeValue?: number;
    afterValue?: number;
    signal?: string;
    signalStrength?: number;
    currentPrice?: number;
  }>;
  passedTickers: Array<{
    symbol: string;
    signal?: string;
    signalStrength?: number;
    currentPrice?: number;
    adjustmentValue?: number;
  }>;
}

interface PipelineDetailPanelProps {
  stageDetails: StageDetails | null;
  onClose: () => void;
}

export default function PipelineDetailPanel({
  stageDetails,
  onClose
}: PipelineDetailPanelProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!stageDetails) return null;

  const getStageIcon = () => {
    switch (stageDetails.stageType) {
      case 'input':
        return <TrendingUp className="w-5 h-5 text-blue-400" />;
      case 'output':
        return <TrendingUp className="w-5 h-5 text-emerald-400" />;
      case 'modifier':
        return <Minus className="w-5 h-5 text-amber-400" />;
      default:
        return <Filter className="w-5 h-5 text-slate-400" />;
    }
  };

  const getSignalColor = (signal?: string) => {
    switch (signal) {
      case 'BUY': return 'text-emerald-400';
      case 'HOLD': return 'text-amber-400';
      case 'SELL': return 'text-red-400';
      case 'WATCH': return 'text-slate-400';
      default: return 'text-slate-300';
    }
  };

  const getSignalBg = (signal?: string) => {
    switch (signal) {
      case 'BUY': return 'bg-emerald-900/50 border-emerald-700/50';
      case 'HOLD': return 'bg-amber-900/50 border-amber-700/50';
      case 'SELL': return 'bg-red-900/50 border-red-700/50';
      case 'WATCH': return 'bg-slate-900/50 border-slate-700/50';
      default: return 'bg-slate-800/50 border-slate-700/50';
    }
  };

  const filteredCount = stageDetails.filteredTickers.length;
  const passedCount = stageDetails.passedTickers.length;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-slate-900 border-l border-slate-700/50 z-50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            {getStageIcon()}
            <div>
              <h2 className="text-xl font-bold text-slate-100">{stageDetails.name}</h2>
              <p className="text-sm text-slate-400 mt-1">{stageDetails.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        {/* Summary Stats */}
        <div className="p-6 border-b border-slate-700/50">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-200">{stageDetails.inputCount.toLocaleString()}</div>
              <div className="text-sm text-slate-400">Input</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">{stageDetails.outputCount.toLocaleString()}</div>
              <div className="text-sm text-slate-400">Output</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{filteredCount.toLocaleString()}</div>
              <div className="text-sm text-slate-400">Filtered</div>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Filtered Tickers (for filter stages) */}
            {stageDetails.stageType === 'filter' && filteredCount > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-400" />
                  Filtered Out ({filteredCount})
                </h3>
                <div className="space-y-3">
                  {stageDetails.filteredTickers.map((ticker, idx) => (
                    <div 
                      key={idx}
                      className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-semibold text-slate-200">{ticker.symbol}</span>
                          {ticker.signal && (
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getSignalBg(ticker.signal)}`}>
                              {ticker.signal}
                            </span>
                          )}
                        </div>
                        {ticker.currentPrice && (
                          <div className="flex items-center gap-1 text-slate-400">
                            <DollarSign className="w-3 h-3" />
                            <span className="text-sm">{ticker.currentPrice.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                      {ticker.reason && (
                        <div className="mt-2 text-sm text-slate-400">{ticker.reason}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Modifier Adjustments (for modifier stages) */}
            {stageDetails.stageType === 'modifier' && passedCount > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-400" />
                  Adjustments Applied ({passedCount})
                </h3>
                <div className="space-y-3">
                  {stageDetails.passedTickers.map((ticker, idx) => (
                    <div 
                      key={idx}
                      className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-semibold text-slate-200">{ticker.symbol}</span>
                          {ticker.signal && (
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getSignalBg(ticker.signal)}`}>
                              {ticker.signal}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {ticker.adjustmentValue !== undefined && (
                            <div className="text-sm">
                              <span className="text-slate-400">Adjustment: </span>
                              <span className={ticker.adjustmentValue >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                {ticker.adjustmentValue >= 0 ? '+' : ''}{(ticker.adjustmentValue * 100).toFixed(1)}%
                              </span>
                            </div>
                          )}
                          {ticker.currentPrice && (
                            <div className="flex items-center gap-1 text-slate-400">
                              <DollarSign className="w-3 h-3" />
                              <span className="text-sm">{ticker.currentPrice.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Final Output (for output stage) */}
            {stageDetails.stageType === 'output' && passedCount > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Final BUY Signals ({passedCount})
                </h3>
                <div className="space-y-3">
                  {stageDetails.passedTickers
                    .sort((a, b) => (b.signalStrength || 0) - (a.signalStrength || 0))
                    .map((ticker, idx) => (
                    <div 
                      key={idx}
                      className="bg-emerald-900/20 rounded-lg p-4 border border-emerald-700/50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-semibold text-slate-200">{ticker.symbol}</span>
                          <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-900/50 border border-emerald-700/50 text-emerald-400">
                            BUY
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          {ticker.signalStrength !== undefined && (
                            <div className="text-sm">
                              <span className="text-slate-400">Confidence: </span>
                              <span className="text-emerald-400 font-medium">{Math.round(ticker.signalStrength)}</span>
                            </div>
                          )}
                          {ticker.currentPrice && (
                            <div className="flex items-center gap-1 text-slate-400">
                              <DollarSign className="w-3 h-3" />
                              <span className="text-sm">{ticker.currentPrice.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Asset Class Breakdown (for input stage) */}
            {stageDetails.stageType === 'input' && (
              <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  Universe Breakdown
                </h3>
                <div className="text-center text-slate-400">
                  <p>{stageDetails.inputCount.toLocaleString()} tickers entering the pipeline</p>
                  <p className="mt-2 text-sm">Click on subsequent stages to see filtering details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}