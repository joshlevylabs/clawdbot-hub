"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Eye,
  Pause,
  Filter,
  Search,
  Zap,
  Target,
} from "lucide-react";
import SignalFlowGraph from "@/components/SignalFlowGraph";
import SignalFlowModal from "@/components/SignalFlowModal";

// Mock data matching the GraphData interface — used until API is live
const MOCK_DATA: GraphData = {
  nodes: [
    { id: "strategy-1", type: "strategy" as const, label: "Broad Market", assetClass: "broad_market", tickerCount: 3, avgSignalStrength: 0.65 },
    { id: "strategy-2", type: "strategy" as const, label: "Technology", assetClass: "technology", tickerCount: 2, avgSignalStrength: 0.72 },
    { id: "strategy-3", type: "strategy" as const, label: "Commodities", assetClass: "commodities", tickerCount: 4, avgSignalStrength: 0.58 },
    { id: "strategy-4", type: "strategy" as const, label: "Bonds", assetClass: "bonds", tickerCount: 3, avgSignalStrength: 0.45 },
    { id: "strategy-5", type: "strategy" as const, label: "International", assetClass: "international", tickerCount: 5, avgSignalStrength: 0.55 },
    // Tickers
    { id: "SPY", type: "ticker" as const, label: "SPY", symbol: "SPY", signal: "HOLD" as const, signalStrength: 0.0, currentPrice: 502.12, fearGreed: 42, regime: "bull" },
    { id: "QQQ", type: "ticker" as const, label: "QQQ", symbol: "QQQ", signal: "HOLD" as const, signalStrength: 0.0, currentPrice: 432.56, fearGreed: 42, regime: "bull" },
    { id: "IWM", type: "ticker" as const, label: "IWM", symbol: "IWM", signal: "HOLD" as const, signalStrength: 0.0, currentPrice: 220.34, fearGreed: 42, regime: "bull" },
    { id: "XLK", type: "ticker" as const, label: "XLK", symbol: "XLK", signal: "HOLD" as const, signalStrength: 0.0, currentPrice: 210.78, fearGreed: 42, regime: "bull" },
    { id: "GLD", type: "ticker" as const, label: "GLD", symbol: "GLD", signal: "HOLD" as const, signalStrength: 0.0, currentPrice: 265.89, fearGreed: 42, regime: "bull" },
    { id: "TLT", type: "ticker" as const, label: "TLT", symbol: "TLT", signal: "HOLD" as const, signalStrength: 0.0, currentPrice: 87.45, fearGreed: 42, regime: "bull" },
    { id: "EFA", type: "ticker" as const, label: "EFA", symbol: "EFA", signal: "HOLD" as const, signalStrength: 0.0, currentPrice: 78.23, fearGreed: 42, regime: "bull" },
  ],
  edges: [
    { source: "strategy-1", target: "SPY", signal: "HOLD", strength: 0.65 },
    { source: "strategy-1", target: "QQQ", signal: "HOLD", strength: 0.60 },
    { source: "strategy-1", target: "IWM", signal: "HOLD", strength: 0.55 },
    { source: "strategy-2", target: "XLK", signal: "HOLD", strength: 0.72 },
    { source: "strategy-3", target: "GLD", signal: "HOLD", strength: 0.58 },
    { source: "strategy-4", target: "TLT", signal: "HOLD", strength: 0.45 },
    { source: "strategy-5", target: "EFA", signal: "HOLD", strength: 0.55 },
  ],
  metrics: {
    totalBuy: 0,
    totalHold: 24,
    totalSell: 0,
    totalWatch: 0,
    fearGreed: 42,
    regime: "bull",
  },
};

interface GraphData {
  nodes: Array<{
    id: string;
    type: 'strategy' | 'ticker';
    label: string;
    assetClass?: string;
    tickerCount?: number;
    avgSignalStrength?: number;
    symbol?: string;
    signal?: 'BUY' | 'HOLD' | 'SELL' | 'WATCH';
    signalStrength?: number;
    currentPrice?: number;
    fearGreed?: number;
    regime?: string;
  }>;
  edges: Array<{
    source: string;
    target: string;
    signal: string;
    strength: number;
  }>;
  metrics: {
    totalBuy?: number;
    totalHold?: number;
    totalSell?: number;
    totalWatch?: number;
    // API returns these names from calculateFlowMetrics
    buySignals?: number;
    holdSignals?: number;
    watchSignals?: number;
    totalSignals?: number;
    fearGreed: number | { current: number; rating: string; summary?: string };
    regime: string | { global: string };
    [key: string]: any;
  };
}

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

/** Safely extract fear/greed number from API response (could be number or object) */
function getFearGreedValue(fg: number | { current: number; rating: string; summary?: string } | undefined): number {
  if (typeof fg === 'number') return fg;
  if (fg && typeof fg === 'object' && 'current' in fg) return fg.current;
  return 0;
}

function getFearGreedRating(fg: number | { current: number; rating: string; summary?: string } | undefined): string {
  if (fg && typeof fg === 'object' && 'rating' in fg) return fg.rating;
  const val = getFearGreedValue(fg);
  if (val <= 25) return "Extreme Fear";
  if (val <= 45) return "Fear";
  if (val <= 55) return "Neutral";
  if (val <= 75) return "Greed";
  return "Extreme Greed";
}

/** Safely extract regime string */
function getRegimeValue(regime: string | { global: string } | undefined): string {
  if (typeof regime === 'string') return regime;
  if (regime && typeof regime === 'object' && 'global' in regime) return regime.global;
  return "unknown";
}

export default function SignalFlowTab() {
  const [graphData, setGraphData] = useState<GraphData>(MOCK_DATA);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [filters, setFilters] = useState({
    assetClass: 'all',
    signalType: 'all',
    searchQuery: '',
  });
  const [loading, setLoading] = useState(false);

  // Fetch real data from API, fall back to mock
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/signal-flow');
        if (response.ok) {
          const data = await response.json();
          setGraphData(data);
        } else {
          console.log('Signal Flow: Using mock data — API not ready');
        }
      } catch (error) {
        console.log('Signal Flow: Using mock data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Auto-refresh every 60s
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleNodeClick = (node: SelectedNode) => {
    setSelectedNode(node);
  };

  const handleModalClose = () => {
    setSelectedNode(null);
  };

  const assetClasses = Array.from(new Set(
    graphData.nodes
      .filter(n => n.type === 'strategy')
      .map(n => n.assetClass)
      .filter((x): x is string => Boolean(x))
  ));

  const signalTypes = ['BUY', 'HOLD', 'SELL', 'WATCH'];
  const fgValue = getFearGreedValue(graphData.metrics.fearGreed);
  const fgRating = getFearGreedRating(graphData.metrics.fearGreed);
  const regimeValue = getRegimeValue(graphData.metrics.regime);
  
  // Handle both API field names (buySignals) and mock field names (totalBuy)
  const buyCount = graphData.metrics.totalBuy ?? graphData.metrics.buySignals ?? 0;
  const holdCount = graphData.metrics.totalHold ?? graphData.metrics.holdSignals ?? 0;
  const sellCount = graphData.metrics.totalSell ?? 0;
  const watchCount = graphData.metrics.totalWatch ?? graphData.metrics.watchSignals ?? 0;

  return (
    <>
      {/* Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-400">BUY</span>
          </div>
          <div className="text-xl font-bold text-emerald-400">
            {buyCount}
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <Pause className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-400">HOLD</span>
          </div>
          <div className="text-xl font-bold text-amber-400">
            {holdCount}
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-xs text-slate-400">SELL</span>
          </div>
          <div className="text-xl font-bold text-red-400">
            {sellCount}
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400">WATCH</span>
          </div>
          <div className="text-xl font-bold text-slate-400">
            {watchCount}
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-primary-400" />
            <span className="text-xs text-slate-400">Fear & Greed</span>
          </div>
          <div className="text-xl font-bold text-primary-400">
            {Math.round(fgValue)}
          </div>
          <div className="text-xs text-slate-500">{fgRating}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-accent-400" />
            <span className="text-xs text-slate-400">Regime</span>
          </div>
          <div className="text-sm font-bold text-accent-400 capitalize">
            {regimeValue}
          </div>
        </div>
      </div>

      {/* Main Content - Graph + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Filters */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary-400" />
              Filters
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Asset Class</label>
                <select
                  value={filters.assetClass}
                  onChange={(e) => setFilters(f => ({ ...f, assetClass: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All</option>
                  {assetClasses.map(ac => (
                    <option key={ac} value={ac}>{ac.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Signal Type</label>
                <select
                  value={filters.signalType}
                  onChange={(e) => setFilters(f => ({ ...f, signalType: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All</option>
                  {signalTypes.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="SPY, GLD..."
                    value={filters.searchQuery}
                    onChange={(e) => setFilters(f => ({ ...f, searchQuery: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h3 className="text-sm font-semibold mb-3">Legend</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-primary-600 rounded-full border-2 border-primary-400" />
                <span className="text-xs text-slate-300">Strategy Node</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                <span className="text-xs text-slate-300">BUY</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full" />
                <span className="text-xs text-slate-300">HOLD</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-xs text-slate-300">SELL</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-slate-500 rounded-full" />
                <span className="text-xs text-slate-300">WATCH</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Graph Area */}
        <div className="lg:col-span-3">
          <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 h-[650px] overflow-hidden">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400 mx-auto mb-4" />
                  <p className="text-slate-400">Loading signal flow...</p>
                </div>
              </div>
            ) : (
              <SignalFlowGraph
                data={{
                  ...graphData,
                  metrics: {
                    ...graphData.metrics,
                    totalBuy: buyCount,
                    totalHold: holdCount,
                    totalSell: sellCount,
                    totalWatch: watchCount,
                    fearGreed: fgValue,
                    regime: regimeValue,
                  }
                }}
                filters={filters}
                onNodeClick={handleNodeClick}
              />
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedNode && (
        <SignalFlowModal
          node={selectedNode}
          onClose={handleModalClose}
        />
      )}
    </>
  );
}
