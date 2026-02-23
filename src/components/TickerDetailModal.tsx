/**
 * Ticker Detail Modal - Shows detailed metrics when clicking a ticker node
 * NOTE: Named TickerDetailModal (not TicketDetailModal which is for bulletin tickets)
 */

import React from 'react';
import { X, TrendingUp, Target, Shield, AlertCircle, DollarSign, Clock, Activity, BarChart3 } from 'lucide-react';
import { TickerData, calculateSignalAttribution, calculateFearGreedContext, explainSignal } from '@/lib/signal-flow-metrics';

interface TickerDetailModalProps {
  ticker: TickerData;
  isOpen: boolean;
  onClose: () => void;
}

const SIGNAL_COLORS = {
  BUY: '#22c55e',
  HOLD: '#f59e0b', 
  SELL: '#ef4444',
  WATCH: '#64748b'
};

export default function TickerDetailModal({ ticker, isOpen, onClose }: TickerDetailModalProps) {
  if (!isOpen) return null;

  const signalAttribution = calculateSignalAttribution(ticker);
  const fgContext = calculateFearGreedContext(ticker);
  const signalExplanation = explainSignal(ticker);

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
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-bold text-white">{ticker.symbol}</h2>
                <span 
                  className="px-3 py-1 rounded-full text-sm font-semibold text-white"
                  style={{ backgroundColor: SIGNAL_COLORS[ticker.signal] }}
                >
                  {ticker.signal}
                </span>
              </div>
              <div className="flex items-center space-x-4 mt-1 text-slate-400">
                <span className="capitalize">{ticker.asset_class.replace('_', ' ')}</span>
                <span className="flex items-center space-x-1">
                  <DollarSign className="w-4 h-4" />
                  <span>${ticker.price.toFixed(2)}</span>
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="p-6">
          {/* Signal Details Section */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">Signal Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-primary-400" />
                  <span className="text-sm text-slate-400">Signal Strength</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {ticker.signal_strength}
                </div>
              </div>

              <div className="bg-slate-800 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-slate-400">Confidence</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {(ticker.asset_confidence * 100).toFixed(0)}%
                </div>
              </div>

              <div className="bg-slate-800 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-slate-400">Expected Accuracy</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {ticker.expected_accuracy.toFixed(1)}%
                </div>
              </div>

              <div className="bg-slate-800 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="w-5 h-5 text-yellow-400" />
                  <span className="text-sm text-slate-400">Hold Days</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {ticker.hold_days}
                </div>
              </div>
            </div>
          </div>

          {/* Fear & Greed Thresholds */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">Fear & Greed Context</h3>
            <div className="bg-slate-800 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <span className="text-sm text-slate-400">Conservative Threshold</span>
                  <div className="text-lg font-semibold text-white">{ticker.fear_threshold_conservative}</div>
                </div>
                <div>
                  <span className="text-sm text-slate-400">Opportunistic Threshold</span>
                  <div className="text-lg font-semibold text-white">{ticker.fear_threshold_opportunistic}</div>
                </div>
                <div>
                  <span className="text-sm text-slate-400">Current F&G Score</span>
                  <div className="text-lg font-semibold text-white">{ticker.current_fg.toFixed(1)}</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  fgContext.status === 'conservative_zone' ? 'bg-green-600 text-white' :
                  fgContext.status === 'opportunistic_zone' ? 'bg-yellow-600 text-white' :
                  'bg-slate-600 text-slate-300'
                }`}>
                  {fgContext.status.replace('_', ' ')}
                </div>
                <span className="text-slate-300 text-sm">{fgContext.recommendation}</span>
              </div>

              {/* F&G Visual Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Extreme Fear</span>
                  <span>Extreme Greed</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3 relative">
                  <div 
                    className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-3 rounded-full"
                    style={{ width: '100%' }}
                  />
                  <div 
                    className="absolute top-0 w-1 h-3 bg-white rounded shadow-lg"
                    style={{ left: `${ticker.current_fg}%` }}
                  />
                  {/* Conservative threshold marker */}
                  <div 
                    className="absolute -top-1 w-0.5 h-5 bg-green-400"
                    style={{ left: `${ticker.fear_threshold_conservative}%` }}
                  />
                  {/* Opportunistic threshold marker */}
                  <div 
                    className="absolute -top-1 w-0.5 h-5 bg-yellow-400"
                    style={{ left: `${ticker.fear_threshold_opportunistic}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>{ticker.fear_threshold_conservative}</span>
                  <span>{ticker.fear_threshold_opportunistic}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Strategy Attribution */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">Strategy Attribution</h3>
            <div className="bg-slate-800 p-4 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <span className="text-slate-400">Primary Strategy:</span>
                <span className="capitalize font-semibold text-white">
                  {signalAttribution.primaryStrategy.replace('_', ' ')}
                </span>
                <span className="text-slate-500">({(signalAttribution.confidenceScore * 100).toFixed(0)}% confidence)</span>
              </div>
              <div className="text-sm text-slate-400">
                Role: <span className="text-white font-medium">{ticker.role}</span>
              </div>
              <div className="text-sm text-slate-400 mt-1">
                Regime: <span className={`font-medium capitalize ${
                  ticker.regime === 'bull' ? 'text-green-400' :
                  ticker.regime === 'bear' ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  {ticker.regime}
                </span> (weight: {ticker.regime_weight}x)
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-white mb-4">Key Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-slate-400">Expected Sharpe</span>
                </div>
                <div className="text-xl font-bold text-white">
                  {ticker.expected_sharpe.toFixed(1)}
                </div>
              </div>

              <div className="bg-slate-800 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Activity className="w-5 h-5 text-red-400" />
                  <span className="text-sm text-slate-400">Volatility</span>
                </div>
                <div className="text-xl font-bold text-white">
                  {ticker.volatility_data.volatility_20d_pct.toFixed(1)}%
                </div>
              </div>

              <div className="bg-slate-800 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="w-5 h-5 text-purple-400" />
                  <span className="text-sm text-slate-400">Avg Hold Period</span>
                </div>
                <div className="text-xl font-bold text-white">
                  {ticker.hold_days} days
                </div>
              </div>

              <div className="bg-slate-800 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-slate-400">Success Rate</span>
                </div>
                <div className="text-xl font-bold text-white">
                  {ticker.expected_accuracy.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Action Zone - Signal Explanation */}
          <div>
            <h3 className="text-xl font-semibold text-white mb-4">What does this signal mean?</h3>
            <div className="bg-slate-800 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-primary-400 mt-0.5 flex-shrink-0" />
                <p className="text-slate-300 leading-relaxed">
                  {signalExplanation}
                </p>
              </div>
              
              {/* Additional context based on signal */}
              <div className="mt-4 pt-4 border-t border-slate-700">
                <div className="text-sm text-slate-400">
                  <strong className="text-slate-300">Trading Context:</strong>
                  {ticker.signal === 'BUY' && ' Consider entry positions or adding to existing holdings.'}
                  {ticker.signal === 'HOLD' && ' Maintain current position size - avoid major changes.'}
                  {ticker.signal === 'SELL' && ' Consider reducing position size or taking profits.'}
                  {ticker.signal === 'WATCH' && ' Monitor for signal changes - no immediate action required.'}
                </div>
                {ticker.volatility_data.volatility_20d_pct > 25 && (
                  <div className="text-sm text-yellow-400 mt-2">
                    <strong>⚠️ High Volatility:</strong> This asset shows elevated volatility ({ticker.volatility_data.volatility_20d_pct.toFixed(1)}%). Use appropriate position sizing.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export the icon components used
export { BarChart3 } from 'lucide-react';