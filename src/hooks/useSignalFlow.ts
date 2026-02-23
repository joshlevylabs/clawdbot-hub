import { useState, useEffect, useCallback } from 'react';
import type { GraphData, GraphNode, GraphEdge, FlowMetrics } from '@/lib/signal-flow-transform';

export interface SignalFlowOptions {
  view?: 'overview' | 'strategy' | 'ticker';
  filter?: string; // asset class filter
  symbol?: string; // specific ticker
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds, default 60s
}

export interface SignalFlowState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metrics: FlowMetrics;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  meta?: {
    totalNodes: number;
    totalEdges: number;
    filteredNodes: number;
    filteredEdges: number;
    view?: string;
    filter?: string;
    symbol?: string;
    generated: string;
  };
}

/**
 * React hook for fetching and managing signal flow graph data
 * 
 * @param options Configuration options for the signal flow data
 * @returns Signal flow state and refresh function
 */
export function useSignalFlow(options: SignalFlowOptions = {}): SignalFlowState & { 
  refresh: () => Promise<void>; 
} {
  const {
    view,
    filter,
    symbol,
    autoRefresh = true,
    refreshInterval = 60000, // 60 seconds
  } = options;

  const [state, setState] = useState<SignalFlowState>({
    nodes: [],
    edges: [],
    metrics: {
      totalSignals: 0,
      buySignals: 0,
      holdSignals: 0,
      watchSignals: 0,
      avgConfidence: 0,
      regimeBreakdown: {},
      assetClassBreakdown: {},
      fearGreed: {
        current: 0,
        rating: 'unknown',
        summary: '',
      },
    },
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const fetchData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Build query parameters
      const params = new URLSearchParams();
      if (view) params.append('view', view);
      if (filter) params.append('filter', filter);
      if (symbol) params.append('symbol', symbol);

      const response = await fetch(`/api/signal-flow?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: GraphData & { meta?: any } = await response.json();

      setState({
        nodes: data.nodes,
        edges: data.edges,
        metrics: data.metrics,
        loading: false,
        error: null,
        lastUpdated: data.lastUpdated,
        meta: data.meta,
      });

    } catch (error) {
      console.error('Failed to fetch signal flow data:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [view, filter, symbol]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData]);

  return {
    ...state,
    refresh: fetchData,
  };
}

// Types for ticker detail data
export interface TickerDetailData {
  symbol: string;
  currentSignal: {
    signal: 'BUY' | 'HOLD' | 'WATCH';
    strength: number;
    signalSource: string;
    strategiesAgreeing: number;
    signalTrack: string;
  };
  currentData: {
    price: number;
    regime: string;
    assetClass: string;
    volatility?: number;
    rsi?: number;
    momentum20d?: number;
    dip5dPct?: number;
  };
  fibonacci?: any;
  regimeDetails?: any;
  strategyAttribution: {
    primaryStrategy: string;
    role: string;
    roleAction: string;
    confidence: {
      base: number;
      adjusted: boolean;
      rotationModifier: number;
    };
    thresholds: {
      fearConservative: number;
      fearOpportunistic: number;
      currentFearGreed: number;
    };
    backtest: {
      expectedSharpe: number;
      expectedAccuracy: number;
      holdDays: number;
    };
  };
  relatedTickers: Array<{
    symbol: string;
    signal: string;
    strength: number;
    regime: string;
    price: number;
    role: string;
  }>;
  relatedPairs: {
    correlationPairs: any[];
    divergenceSignals: any[];
  };
  history: Array<{
    timestamp: string;
    fearGreed: number;
    regime: string;
    buySignals: number;
    divergedPairs: number;
  }>;
  meta: {
    generated: string;
    lastUpdated: string;
    historyDays: number;
    historyPoints: number;
  };
}

export interface TickerDetailOptions {
  symbol: string;
  days?: number; // historical data days
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface TickerDetailState {
  data: TickerDetailData | null;
  loading: boolean;
  error: string | null;
}

/**
 * React hook for fetching detailed ticker information
 * 
 * @param options Ticker detail options
 * @returns Ticker detail state and refresh function  
 */
export function useTickerDetail(options: TickerDetailOptions): TickerDetailState & { 
  refresh: () => Promise<void>; 
} {
  const {
    symbol,
    days = 30,
    autoRefresh = true,
    refreshInterval = 60000,
  } = options;

  const [state, setState] = useState<TickerDetailState>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    if (!symbol) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const params = new URLSearchParams();
      if (days) params.append('days', days.toString());

      const response = await fetch(`/api/signal-flow/${symbol}?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: TickerDetailData = await response.json();

      setState({
        data,
        loading: false,
        error: null,
      });

    } catch (error) {
      console.error(`Failed to fetch ticker detail for ${symbol}:`, error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [symbol, days]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData]);

  return {
    ...state,
    refresh: fetchData,
  };
}