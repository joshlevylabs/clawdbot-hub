"use client";

import { useEffect } from 'react';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  Pause, 
  Eye, 
  DollarSign, 
  Target,
  Zap,
  Activity,
  Clock,
  BarChart3
} from 'lucide-react';

interface SelectedNode {
  id: string;
  type: 'strategy' | 'ticker';
  label: string;
  symbol?: string;
  signal?: 'BUY' | 'HOLD' | 'SELL' | 'WATCH';
  signalStrength?: number;
  currentPrice?: number;
  fearGreed?: number;
  regime?: string;
  assetClass?: string;
  tickerCount?: number;
  avgSignalStrength?: number;
}

interface SignalFlowModalProps {
  node: SelectedNode;
  onClose: () => void;
}

const SIGNAL_COLORS = {
  BUY: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  HOLD: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  SELL: 'text-red-400 bg-red-400/10 border-red-400/20',
  WATCH: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
};

const SIGNAL_ICONS = {
  BUY: TrendingUp,
  HOLD: Pause,
  SELL: TrendingDown,
  WATCH: Eye,
};

export default function SignalFlowModal({ node, onClose }: SignalFlowModalProps) {
  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const getSignalIcon = (signal?: string) => {
    if (!signal || !(signal in SIGNAL_ICONS)) return Eye;
    return SIGNAL_ICONS[signal as keyof typeof SIGNAL_ICONS];
  };

  const getSignalClass = (signal?: string) => {
    if (!signal || !(signal in SIGNAL_COLORS)) return SIGNAL_COLORS.WATCH;
    return SIGNAL_COLORS[signal as keyof typeof SIGNAL_COLORS];
  };

  const formatPrice = (price?: number) => {
    if (!price) return 'N/A';
    return price >= 1000 ? `$${price.toLocaleString()}` : `$${price.toFixed(2)}`;
  };

  const formatPercentage = (value?: number) => {
    if (!value) return 'N/A';
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-950 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                node.type === 'strategy' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-slate-800 text-slate-300'
              }`}>
                {node.type === 'strategy' ? (
                  <Target className="w-6 h-6" />
                ) : (
                  <Activity className="w-6 h-6" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-100">
                  {node.type === 'ticker' ? node.symbol : node.label}
                </h2>
                <p className="text-slate-400">
                  {node.type === 'ticker' ? node.label : `${node.assetClass} Strategy`}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Signal Badge for Tickers */}
          {node.type === 'ticker' && node.signal && (
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${getSignalClass(node.signal)}`}>
              {(() => {
                const Icon = getSignalIcon(node.signal);
                return <Icon className="w-4 h-4" />;
              })()}
              <span className="font-semibold">{node.signal}</span>
              {node.signalStrength && (
                <span className="opacity-80">
                  ({formatPercentage(node.signalStrength)} confidence)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {node.type === 'ticker' ? (
            <TickerDetails node={node} formatPrice={formatPrice} formatPercentage={formatPercentage} />
          ) : (
            <StrategyDetails node={node} formatPercentage={formatPercentage} />
          )}

          {/* Chart Placeholder */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary-400" />
              <h3 className="text-lg font-semibold text-slate-100">Performance Chart</h3>
            </div>
            <div className="h-48 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Chart coming soon</p>
                <p className="text-sm opacity-75">Historical performance visualization</p>
              </div>
            </div>
          </div>

          {/* Strategy Attribution for Tickers */}
          {node.type === 'ticker' && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Strategy Attribution</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Primary Strategy</span>
                  <span className="text-slate-100 font-medium">Strategy Attribution Coming Soon</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Signal Source</span>
                  <span className="text-slate-100 font-medium">MRE Signal Engine</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-300">Last Updated</span>
                  <span className="text-slate-100 font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4 text-accent-400" />
                    Live
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 p-4 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function TickerDetails({ 
  node, 
  formatPrice, 
  formatPercentage 
}: { 
  node: SelectedNode;
  formatPrice: (price?: number) => string;
  formatPercentage: (value?: number) => string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Current Price */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="w-4 h-4 text-accent-400" />
          <span className="text-sm text-slate-400">Current Price</span>
        </div>
        <div className="text-xl font-bold text-slate-100">
          {formatPrice(node.currentPrice)}
        </div>
      </div>

      {/* Signal Strength */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-primary-400" />
          <span className="text-sm text-slate-400">Signal Strength</span>
        </div>
        <div className="text-xl font-bold text-slate-100">
          {formatPercentage(node.signalStrength)}
        </div>
      </div>

      {/* Fear & Greed */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-amber-400" />
          <span className="text-sm text-slate-400">Fear & Greed</span>
        </div>
        <div className="text-xl font-bold text-slate-100">
          {node.fearGreed || 'N/A'}
        </div>
        {node.fearGreed && (
          <div className="w-full bg-slate-800 rounded-full h-2 mt-2">
            <div 
              className="bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 h-2 rounded-full transition-all"
              style={{ width: `${node.fearGreed}%` }}
            />
          </div>
        )}
      </div>

      {/* Market Regime */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-accent-400" />
          <span className="text-sm text-slate-400">Market Regime</span>
        </div>
        <div className="text-xl font-bold text-slate-100">
          {node.regime || 'N/A'}
        </div>
      </div>
    </div>
  );
}

function StrategyDetails({ 
  node, 
  formatPercentage 
}: { 
  node: SelectedNode;
  formatPercentage: (value?: number) => string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Asset Class */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-primary-400" />
          <span className="text-sm text-slate-400">Asset Class</span>
        </div>
        <div className="text-lg font-bold text-slate-100">
          {node.assetClass || 'N/A'}
        </div>
      </div>

      {/* Ticker Count */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-accent-400" />
          <span className="text-sm text-slate-400">Tickers</span>
        </div>
        <div className="text-lg font-bold text-slate-100">
          {node.tickerCount || 0}
        </div>
      </div>

      {/* Average Signal Strength */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-primary-400" />
          <span className="text-sm text-slate-400">Avg Signal</span>
        </div>
        <div className="text-lg font-bold text-slate-100">
          {formatPercentage(node.avgSignalStrength)}
        </div>
      </div>
    </div>
  );
}