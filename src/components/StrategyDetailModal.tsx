/**
 * Strategy Detail Modal - Shows detailed metrics when clicking a strategy node
 */

import React from 'react';
import { X, TrendingUp, Target, Shield, BarChart3 } from 'lucide-react';
import { StrategyMetrics, TickerData, calculateRiskMetrics } from '@/lib/signal-flow-metrics';

interface StrategyDetailModalProps {
  strategy: StrategyMetrics;
  isOpen: boolean;
  onClose: () => void;
}

const SIGNAL_COLORS = {
  BUY: '#22c55e',
  HOLD: '#f59e0b', 
  SELL: '#ef4444',
  WATCH: '#64748b'
};

export default function StrategyDetailModal({ strategy, isOpen, onClose }: StrategyDetailModalProps) {
  if (!isOpen) return null;

  const riskMetrics = calculateRiskMetrics(strategy.tickers);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-slate-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-bold text-white capitalize">
                {strategy.name.replace('_', ' ')} Strategy
              </h2>
              <span 
                className="px-3 py-1 rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: SIGNAL_COLORS[strategy.overallSignal] }}
              >
                {strategy.overallSignal}
              </span>
            </div>
            <div className="text-slate-400">
              {strategy.tickerCount} tickers
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-800 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-5 h-5 text-primary-400" />
                <span className="text-sm text-slate-400">Avg Signal Strength</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {strategy.avgSignalStrength.toFixed(1)}
              </div>
            </div>

            <div className="bg-slate-800 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-5 h-5 text-green-400" />
                <span className="text-sm text-slate-400">Win Rate</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {(strategy.winRate * 100).toFixed(1)}%
              </div>
            </div>

            <div className="bg-slate-800 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                <span className="text-sm text-slate-400">Expected Sharpe</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {strategy.expectedSharpe.toFixed(1)}
              </div>
            </div>

            <div className="bg-slate-800 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Shield className="w-5 h-5 text-yellow-400" />
                <span className="text-sm text-slate-400">Regime Alignment</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {(strategy.regimeAlignment * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Ticker Breakdown Table */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">Ticker Breakdown</h3>
            <div className="bg-slate-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="text-left p-3 text-slate-300 font-medium">Symbol</th>
                      <th className="text-left p-3 text-slate-300 font-medium">Signal</th>
                      <th className="text-left p-3 text-slate-300 font-medium">Strength</th>
                      <th className="text-left p-3 text-slate-300 font-medium">Regime</th>
                      <th className="text-left p-3 text-slate-300 font-medium">Sharpe</th>
                      <th className="text-left p-3 text-slate-300 font-medium">Accuracy</th>
                      <th className="text-left p-3 text-slate-300 font-medium">Volatility</th>
                      <th className="text-left p-3 text-slate-300 font-medium">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strategy.tickers.map((ticker, index) => (
                      <tr key={ticker.symbol} className={index % 2 === 0 ? 'bg-slate-800' : 'bg-slate-750'}>
                        <td className="p-3 font-semibold text-white">{ticker.symbol}</td>
                        <td className="p-3">
                          <span
                            className="px-2 py-1 rounded text-xs font-semibold text-white"
                            style={{ backgroundColor: SIGNAL_COLORS[ticker.signal] }}
                          >
                            {ticker.signal}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300">{ticker.signal_strength}</td>
                        <td className="p-3">
                          <span className={`capitalize ${
                            ticker.regime === 'bull' ? 'text-green-400' :
                            ticker.regime === 'bear' ? 'text-red-400' : 'text-yellow-400'
                          }`}>
                            {ticker.regime}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300">{ticker.expected_sharpe.toFixed(1)}</td>
                        <td className="p-3 text-slate-300">{ticker.expected_accuracy.toFixed(1)}%</td>
                        <td className="p-3 text-slate-300">{ticker.volatility_data.volatility_20d_pct.toFixed(1)}%</td>
                        <td className="p-3 text-slate-400 text-sm">{ticker.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Risk Section */}
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">Risk Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-800 p-4 rounded-lg">
                <h4 className="text-sm text-slate-400 mb-2">Average Volatility</h4>
                <div className="text-xl font-bold text-white">
                  {strategy.avgVolatility.toFixed(1)}%
                </div>
                <div className="text-xs text-slate-500 mt-1">20-day rolling</div>
              </div>

              <div className="bg-slate-800 p-4 rounded-lg">
                <h4 className="text-sm text-slate-400 mb-2">Estimated Max Drawdown</h4>
                <div className="text-xl font-bold text-red-400">
                  {riskMetrics.maxDrawdown.toFixed(1)}%
                </div>
                <div className="text-xs text-slate-500 mt-1">Based on volatility</div>
              </div>

              <div className="bg-slate-800 p-4 rounded-lg">
                <h4 className="text-sm text-slate-400 mb-2">Avg Correlation</h4>
                <div className="text-xl font-bold text-white">
                  {(riskMetrics.correlation * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-slate-500 mt-1">Within strategy</div>
              </div>
            </div>

            {/* Strategy Description */}
            <div className="mt-6 bg-slate-800 p-4 rounded-lg">
              <h4 className="text-sm text-slate-400 mb-2">Strategy Overview</h4>
              <p className="text-slate-300 text-sm leading-relaxed">
                The <span className="capitalize font-semibold">{strategy.name.replace('_', ' ')}</span> strategy 
                manages {strategy.tickerCount} tickers with an average expected Sharpe ratio of {strategy.expectedSharpe.toFixed(1)} 
                and {(strategy.winRate * 100).toFixed(1)}% win rate. 
                Current regime alignment is {(strategy.regimeAlignment * 100).toFixed(0)}% of tickers in bull markets.
                {strategy.avgVolatility > 20 && ' This is a higher volatility strategy requiring careful risk management.'}
                {strategy.regimeAlignment < 0.5 && ' Mixed regime signals suggest a transitional market period.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}