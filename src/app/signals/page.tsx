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

// Mock data matching the GraphData interface
const MOCK_DATA = {
  nodes: [
    // Strategy nodes
    {
      id: "strategy-1",
      type: "strategy" as const,
      label: "Equity Momentum",
      assetClass: "Equity",
      tickerCount: 8,
      avgSignalStrength: 0.78,
    },
    {
      id: "strategy-2", 
      type: "strategy" as const,
      label: "Fixed Income Carry",
      assetClass: "Fixed Income",
      tickerCount: 4,
      avgSignalStrength: 0.62,
    },
    {
      id: "strategy-3",
      type: "strategy" as const,
      label: "Commodities Trend",
      assetClass: "Commodities",
      tickerCount: 3,
      avgSignalStrength: 0.85,
    },
    {
      id: "strategy-4",
      type: "strategy" as const,
      label: "Tech Growth",
      assetClass: "Equity",
      tickerCount: 6,
      avgSignalStrength: 0.71,
    },
    {
      id: "strategy-5",
      type: "strategy" as const,
      label: "Crypto Alpha",
      assetClass: "Digital Assets",
      tickerCount: 4,
      avgSignalStrength: 0.92,
    },
    // Ticker nodes - Strategy 1 (Equity Momentum)
    {
      id: "AAPL",
      type: "ticker" as const,
      label: "Apple Inc",
      symbol: "AAPL",
      signal: "BUY" as const,
      signalStrength: 0.86,
      currentPrice: 178.45,
      fearGreed: 72,
      regime: "Bull Market",
    },
    {
      id: "MSFT",
      type: "ticker" as const,
      label: "Microsoft Corp",
      symbol: "MSFT", 
      signal: "BUY" as const,
      signalStrength: 0.79,
      currentPrice: 412.33,
      fearGreed: 72,
      regime: "Bull Market",
    },
    {
      id: "NVDA",
      type: "ticker" as const,
      label: "NVIDIA Corp",
      symbol: "NVDA",
      signal: "HOLD" as const,
      signalStrength: 0.65,
      currentPrice: 875.22,
      fearGreed: 72,
      regime: "Bull Market",
    },
    // Strategy 2 (Fixed Income)
    {
      id: "TLT",
      type: "ticker" as const,
      label: "20+ Year Treasury",
      symbol: "TLT",
      signal: "SELL" as const,
      signalStrength: 0.88,
      currentPrice: 92.15,
      fearGreed: 72,
      regime: "Bull Market",
    },
    {
      id: "HYG",
      type: "ticker" as const,
      label: "High Yield Corp",
      symbol: "HYG",
      signal: "HOLD" as const,
      signalStrength: 0.42,
      currentPrice: 82.67,
      fearGreed: 72,
      regime: "Bull Market",
    },
    // Strategy 3 (Commodities)
    {
      id: "GLD",
      type: "ticker" as const,
      label: "Gold ETF",
      symbol: "GLD",
      signal: "BUY" as const,
      signalStrength: 0.91,
      currentPrice: 215.43,
      fearGreed: 72,
      regime: "Bull Market",
    },
    {
      id: "USO",
      type: "ticker" as const,
      label: "Oil ETF",
      symbol: "USO",
      signal: "WATCH" as const,
      signalStrength: 0.35,
      currentPrice: 68.22,
      fearGreed: 72,
      regime: "Bull Market",
    },
    // Strategy 4 (Tech Growth)
    {
      id: "GOOGL",
      type: "ticker" as const,
      label: "Alphabet Inc",
      symbol: "GOOGL",
      signal: "BUY" as const,
      signalStrength: 0.73,
      currentPrice: 165.87,
      fearGreed: 72,
      regime: "Bull Market",
    },
    {
      id: "TSLA",
      type: "ticker" as const,
      label: "Tesla Inc",
      symbol: "TSLA",
      signal: "HOLD" as const,
      signalStrength: 0.58,
      currentPrice: 234.56,
      fearGreed: 72,
      regime: "Bull Market",
    },
    // Strategy 5 (Crypto)
    {
      id: "BTC",
      type: "ticker" as const,
      label: "Bitcoin",
      symbol: "BTC",
      signal: "BUY" as const,
      signalStrength: 0.95,
      currentPrice: 42500,
      fearGreed: 72,
      regime: "Bull Market",
    },
    {
      id: "ETH",
      type: "ticker" as const,
      label: "Ethereum",
      symbol: "ETH",
      signal: "BUY" as const,
      signalStrength: 0.87,
      currentPrice: 2650,
      fearGreed: 72,
      regime: "Bull Market",
    },
  ],
  edges: [
    // Strategy 1 connections
    { source: "strategy-1", target: "AAPL", signal: "BUY", strength: 0.86 },
    { source: "strategy-1", target: "MSFT", signal: "BUY", strength: 0.79 },
    { source: "strategy-1", target: "NVDA", signal: "HOLD", strength: 0.65 },
    // Strategy 2 connections
    { source: "strategy-2", target: "TLT", signal: "SELL", strength: 0.88 },
    { source: "strategy-2", target: "HYG", signal: "HOLD", strength: 0.42 },
    // Strategy 3 connections
    { source: "strategy-3", target: "GLD", signal: "BUY", strength: 0.91 },
    { source: "strategy-3", target: "USO", signal: "WATCH", strength: 0.35 },
    // Strategy 4 connections
    { source: "strategy-4", target: "GOOGL", signal: "BUY", strength: 0.73 },
    { source: "strategy-4", target: "TSLA", signal: "HOLD", strength: 0.58 },
    // Strategy 5 connections
    { source: "strategy-5", target: "BTC", signal: "BUY", strength: 0.95 },
    { source: "strategy-5", target: "ETH", signal: "BUY", strength: 0.87 },
  ],
  metrics: {
    totalBuy: 6,
    totalHold: 3,
    totalSell: 1,
    totalWatch: 1,
    fearGreed: 72,
    regime: "Bull Market",
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
    totalBuy: number;
    totalHold: number;
    totalSell: number;
    totalWatch?: number;
    fearGreed: number;
    regime: string;
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

export default function SignalsPage() {
  const [graphData, setGraphData] = useState<GraphData>(MOCK_DATA);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [filters, setFilters] = useState({
    assetClass: 'all',
    signalType: 'all',
    searchQuery: '',
  });
  const [loading, setLoading] = useState(false);

  // Try to fetch real data, fall back to mock
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/signal-flow');
        if (response.ok) {
          const data = await response.json();
          setGraphData(data);
        } else {
          // API doesn't exist yet, use mock data
          console.log('Using mock data - API not ready yet');
        }
      } catch (error) {
        console.log('Using mock data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-100">Signal Flow</h1>
                <p className="text-slate-400">Real-time MRE strategy visualization</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-accent-500 rounded-full animate-pulse" />
              <span className="text-sm text-slate-400">Live Data</span>
            </div>
          </div>

          {/* Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-slate-400">BUY</span>
              </div>
              <div className="text-xl font-bold text-emerald-400">
                {graphData.metrics.totalBuy}
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <Pause className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-slate-400">HOLD</span>
              </div>
              <div className="text-xl font-bold text-amber-400">
                {graphData.metrics.totalHold}
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <span className="text-sm text-slate-400">SELL</span>
              </div>
              <div className="text-xl font-bold text-red-400">
                {graphData.metrics.totalSell}
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-400">WATCH</span>
              </div>
              <div className="text-xl font-bold text-slate-400">
                {graphData.metrics.totalWatch || 0}
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-primary-400" />
                <span className="text-sm text-slate-400">Fear & Greed</span>
              </div>
              <div className="text-xl font-bold text-primary-400">
                {graphData.metrics.fearGreed}
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-accent-400" />
                <span className="text-sm text-slate-400">Regime</span>
              </div>
              <div className="text-sm font-bold text-accent-400">
                {graphData.metrics.regime}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Filters */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-950/50 rounded-xl p-6 border border-slate-800">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5 text-primary-400" />
                Filters
              </h3>
              
              <div className="space-y-4">
                {/* Asset Class Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Asset Class
                  </label>
                  <select
                    value={filters.assetClass}
                    onChange={(e) => setFilters(f => ({ ...f, assetClass: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">All Asset Classes</option>
                    {assetClasses.map(ac => (
                      <option key={ac} value={ac}>{ac}</option>
                    ))}
                  </select>
                </div>

                {/* Signal Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Signal Type
                  </label>
                  <select
                    value={filters.signalType}
                    onChange={(e) => setFilters(f => ({ ...f, signalType: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">All Signals</option>
                    {signalTypes.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Search Tickers
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. AAPL, BTC..."
                      value={filters.searchQuery}
                      onChange={(e) => setFilters(f => ({ ...f, searchQuery: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="bg-slate-950/50 rounded-xl p-6 border border-slate-800">
              <h3 className="text-lg font-semibold mb-4">Legend</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-primary-600 rounded-full border-2 border-primary-400" />
                  <span className="text-sm text-slate-300">Strategy Node</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-emerald-500 rounded-full" />
                  <span className="text-sm text-slate-300">BUY Signal</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-amber-500 rounded-full" />
                  <span className="text-sm text-slate-300">HOLD Signal</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-red-500 rounded-full" />
                  <span className="text-sm text-slate-300">SELL Signal</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-slate-500 rounded-full" />
                  <span className="text-sm text-slate-300">WATCH Signal</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Graph Area */}
          <div className="lg:col-span-3">
            <div className="bg-slate-950/50 rounded-xl border border-slate-800 h-[700px] overflow-hidden">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400 mx-auto mb-4" />
                    <p className="text-slate-400">Loading signal flow...</p>
                  </div>
                </div>
              ) : (
                <SignalFlowGraph
                  data={graphData}
                  filters={filters}
                  onNodeClick={handleNodeClick}
                />
              )}
            </div>
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
    </div>
  );
}