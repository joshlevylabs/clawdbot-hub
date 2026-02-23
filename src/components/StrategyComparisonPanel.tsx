/**
 * Strategy Comparison Panel - Side panel showing all strategies ranked by performance
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, TrendingUp, Target, BarChart3, Eye, EyeOff } from 'lucide-react';
import { StrategyMetrics, TickerData } from '@/lib/signal-flow-metrics';

interface StrategyComparisonPanelProps {
  strategies: StrategyMetrics[];
  isVisible: boolean;
  onToggleVisibility: () => void;
  onStrategyClick?: (strategy: StrategyMetrics) => void;
  onTickerClick?: (ticker: TickerData) => void;
}

type SortField = 'signalStrength' | 'sharpe' | 'winRate' | 'tickerCount';

const SIGNAL_COLORS = {
  BUY: '#22c55e',
  HOLD: '#f59e0b', 
  SELL: '#ef4444',
  WATCH: '#64748b'
};

export default function StrategyComparisonPanel({ 
  strategies, 
  isVisible, 
  onToggleVisibility, 
  onStrategyClick, 
  onTickerClick 
}: StrategyComparisonPanelProps) {
  const [sortField, setSortField] = useState<SortField>('sharpe');
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);

  const sortedStrategies = [...strategies].sort((a, b) => {
    switch (sortField) {
      case 'signalStrength':
        return b.avgSignalStrength - a.avgSignalStrength;
      case 'sharpe':
        return b.expectedSharpe - a.expectedSharpe;
      case 'winRate':
        return b.winRate - a.winRate;
      case 'tickerCount':
        return b.tickerCount - a.tickerCount;
      default:
        return 0;
    }
  });

  const toggleStrategyExpansion = (strategyName: string) => {
    setExpandedStrategy(expandedStrategy === strategyName ? null : strategyName);
  };

  return (
    <div className={`fixed right-0 top-0 h-full bg-slate-900 border-l border-slate-700 transition-transform duration-300 z-40 ${
      isVisible ? 'translate-x-0' : 'translate-x-full'
    }`} style={{ width: '400px' }}>
      
      {/* Toggle Button */}
      <button
        onClick={onToggleVisibility}
        className="absolute -left-12 top-1/2 transform -translate-y-1/2 bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-l-lg shadow-lg transition-colors"
      >
        {isVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>

      {/* Panel Content */}
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">Strategy Rankings</h2>
          
          {/* Sort Controls */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSortField('sharpe')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                sortField === 'sharpe' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Sharpe
            </button>
            <button
              onClick={() => setSortField('winRate')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                sortField === 'winRate' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Win Rate
            </button>
            <button
              onClick={() => setSortField('signalStrength')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                sortField === 'signalStrength' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Signal
            </button>
            <button
              onClick={() => setSortField('tickerCount')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                sortField === 'tickerCount' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Size
            </button>
          </div>
        </div>

        {/* Strategy List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sortedStrategies.map((strategy, index) => (
            <div key={strategy.name} className="bg-slate-800 rounded-lg overflow-hidden">
              {/* Strategy Card Header */}
              <div 
                className="p-4 cursor-pointer hover:bg-slate-750 transition-colors"
                onClick={() => onStrategyClick?.(strategy)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-bold text-slate-400">#{index + 1}</span>
                    <h3 className="font-semibold text-white capitalize">
                      {strategy.name.replace('_', ' ')}
                    </h3>
                    <span 
                      className="px-2 py-1 rounded text-xs font-semibold text-white"
                      style={{ backgroundColor: SIGNAL_COLORS[strategy.overallSignal] }}
                    >
                      {strategy.overallSignal}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStrategyExpansion(strategy.name);
                    }}
                    className="p-1 hover:bg-slate-700 rounded transition-colors"
                  >
                    {expandedStrategy === strategy.name ? 
                      <ChevronDown className="w-4 h-4 text-slate-400" /> : 
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    }
                  </button>
                </div>

                {/* Top 3 Metrics */}
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="flex items-center space-x-1 text-slate-400">
                      <BarChart3 className="w-3 h-3" />
                      <span>Sharpe</span>
                    </div>
                    <div className="font-semibold text-white">
                      {strategy.expectedSharpe.toFixed(1)}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-1 text-slate-400">
                      <Target className="w-3 h-3" />
                      <span>Win Rate</span>
                    </div>
                    <div className="font-semibold text-white">
                      {(strategy.winRate * 100).toFixed(1)}%
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-1 text-slate-400">
                      <TrendingUp className="w-3 h-3" />
                      <span>Signal</span>
                    </div>
                    <div className="font-semibold text-white">
                      {strategy.avgSignalStrength.toFixed(1)}
                    </div>
                  </div>
                </div>

                {/* Ticker Count */}
                <div className="mt-2 text-xs text-slate-500">
                  {strategy.tickerCount} tickers • {(strategy.regimeAlignment * 100).toFixed(0)}% bull regime
                </div>
              </div>

              {/* Expanded Ticker List */}
              {expandedStrategy === strategy.name && (
                <div className="border-t border-slate-700 bg-slate-750">
                  <div className="p-3">
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Tickers in Strategy</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {strategy.tickers.map((ticker) => (
                        <div 
                          key={ticker.symbol}
                          className="flex items-center justify-between p-2 bg-slate-800 rounded hover:bg-slate-700 cursor-pointer transition-colors"
                          onClick={() => onTickerClick?.(ticker)}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-white text-sm">{ticker.symbol}</span>
                            <span
                              className="px-1.5 py-0.5 rounded text-xs font-semibold text-white"
                              style={{ backgroundColor: SIGNAL_COLORS[ticker.signal] }}
                            >
                              {ticker.signal}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3 text-xs">
                            <span className="text-slate-400">
                              {ticker.expected_sharpe.toFixed(1)}
                            </span>
                            <span className="text-slate-400">
                              {ticker.expected_accuracy.toFixed(0)}%
                            </span>
                            <span className={`capitalize ${
                              ticker.regime === 'bull' ? 'text-green-400' :
                              ticker.regime === 'bear' ? 'text-red-400' : 'text-yellow-400'
                            }`}>
                              {ticker.regime.charAt(0)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {strategies.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <p>No strategies available</p>
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="border-t border-slate-700 p-4 bg-slate-850">
          <div className="text-sm text-slate-400">
            <div className="flex justify-between">
              <span>Total Strategies:</span>
              <span className="text-white">{strategies.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Tickers:</span>
              <span className="text-white">
                {strategies.reduce((sum, s) => sum + s.tickerCount, 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Avg Sharpe:</span>
              <span className="text-white">
                {strategies.length > 0 
                  ? (strategies.reduce((sum, s) => sum + s.expectedSharpe, 0) / strategies.length).toFixed(1)
                  : '0.0'
                }
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}