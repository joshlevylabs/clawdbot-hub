import { promises as fs } from "fs";
import path from "path";

// Types for D3 graph structure
export interface GraphNode {
  id: string;
  type: 'strategy' | 'ticker';
  label: string;
  group?: string; // asset class for tickers, strategy type for strategies
  // Optional position data for D3 force simulation
  x?: number;
  y?: number;
  fx?: number; // fixed x position
  fy?: number; // fixed y position
  // Signal metadata
  signal?: 'BUY' | 'HOLD' | 'WATCH';
  strength?: number;
  confidence?: number;
  regime?: string;
  price?: number;
  role?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  strength: number; // 0-1 for signal strength
  confidence: number; // 0-1 for confidence
  signal: 'BUY' | 'HOLD' | 'WATCH';
  metadata?: {
    regime: string;
    fearGreed: number;
    volatility?: number;
  };
}

export interface FlowMetrics {
  totalSignals: number;
  buySignals: number;
  holdSignals: number;
  watchSignals: number;
  avgConfidence: number;
  regimeBreakdown: Record<string, number>;
  assetClassBreakdown: Record<string, number>;
  fearGreed: {
    current: number;
    rating: string;
    summary: string;
  };
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metrics: FlowMetrics;
  lastUpdated: string;
}

export interface HistoricalPoint {
  timestamp: string;
  fearGreed: number;
  regime: string;
  buySignals: number;
  divergedPairs: number;
}

// Main MRE signals data structure
interface MRETicker {
  asset_class: string;
  symbol: string;
  signal: 'BUY' | 'HOLD' | 'WATCH';
  signal_strength: number;
  signal_source?: string;
  signal_track?: string;
  strategies_agreeing?: number;
  regime: string;
  regime_weight?: number;
  price: number;
  confidence_adjusted?: boolean;
  asset_confidence?: number;
  rotation_modifier?: number;
  role: string;
  role_action: string;
  fear_threshold_conservative: number;
  fear_threshold_opportunistic: number;
  current_fg: number;
  hold_days?: number;
  expected_sharpe?: number;
  expected_accuracy?: number;
  rsi_14?: number;
  momentum_20d?: number;
  dip_5d_pct?: number;
  volatility_data?: {
    volatility_20d_pct: number;
  };
  [key: string]: any;
}

interface MRESignalsData {
  timestamp: string;
  last_updated: string;
  fear_greed: {
    current: number;
    rating: string;
    summary: string;
    breakdown: {
      aggregate_score: number;
      rating: string;
    };
  };
  regime: {
    global: string;
    outliers: Array<{
      symbol: string;
      asset_regime: string;
      market_regime: string;
    }>;
  };
  signals: {
    summary: {
      total_buy: number;
      total_hold: number;
      total_watch: number;
    };
    by_asset_class: MRETicker[];
  };
}

// Asset class groupings that act as "strategies"
const STRATEGY_MAP: Record<string, string> = {
  'broad_market': 'Broad Market',
  'technology': 'Technology',
  'financials': 'Financials', 
  'healthcare': 'Healthcare',
  'energy': 'Energy & Materials',
  'bonds': 'Fixed Income',
  'real_estate': 'Utilities & REITs',
  'international': 'International',
  'commodities': 'Commodities'
};

/**
 * Transform MRE signals data into graph structure for D3 visualization
 */
export function transformToGraphData(mreSignals: MRESignalsData): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  
  // Create strategy nodes (one per asset class)
  const assetClassesArr = Array.from(new Set(mreSignals.signals.by_asset_class.map(t => t.asset_class)));
  
  for (const assetClass of assetClassesArr) {
    nodes.push({
      id: `strategy_${assetClass}`,
      type: 'strategy',
      label: STRATEGY_MAP[assetClass] || assetClass,
      group: assetClass,
    });
  }
  
  // Create ticker nodes and edges from strategies to tickers
  for (const ticker of mreSignals.signals.by_asset_class) {
    const tickerNode: GraphNode = {
      id: `ticker_${ticker.symbol}`,
      type: 'ticker',
      label: ticker.symbol,
      group: ticker.asset_class,
      signal: ticker.signal,
      strength: ticker.signal_strength,
      confidence: ticker.asset_confidence || 1.0,
      regime: ticker.regime,
      price: ticker.price,
      role: ticker.role,
    };
    
    nodes.push(tickerNode);
    
    // Create edge from strategy to ticker
    const edge: GraphEdge = {
      id: `${ticker.asset_class}_to_${ticker.symbol}`,
      source: `strategy_${ticker.asset_class}`,
      target: `ticker_${ticker.symbol}`,
      strength: Math.max(ticker.signal_strength / 10, 0.1), // Normalize to 0-1
      confidence: ticker.asset_confidence || 1.0,
      signal: ticker.signal,
      metadata: {
        regime: ticker.regime,
        fearGreed: ticker.current_fg,
        volatility: ticker.volatility_data?.volatility_20d_pct,
      },
    };
    
    edges.push(edge);
  }
  
  // Calculate metrics
  const metrics = calculateFlowMetrics(mreSignals);
  
  return {
    nodes,
    edges,
    metrics,
    lastUpdated: mreSignals.last_updated,
  };
}

/**
 * Calculate aggregate flow metrics from signals
 */
export function calculateFlowMetrics(mreSignals: MRESignalsData): FlowMetrics {
  const tickers = mreSignals.signals.by_asset_class;
  
  const regimeBreakdown = tickers.reduce((acc, t) => {
    acc[t.regime] = (acc[t.regime] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const assetClassBreakdown = tickers.reduce((acc, t) => {
    acc[t.asset_class] = (acc[t.asset_class] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const totalConfidence = tickers.reduce((sum, t) => sum + (t.asset_confidence || 1.0), 0);
  
  return {
    totalSignals: tickers.length,
    buySignals: mreSignals.signals.summary.total_buy,
    holdSignals: mreSignals.signals.summary.total_hold,
    watchSignals: mreSignals.signals.summary.total_watch,
    avgConfidence: totalConfidence / tickers.length,
    regimeBreakdown,
    assetClassBreakdown,
    fearGreed: {
      current: mreSignals.fear_greed.current,
      rating: mreSignals.fear_greed.rating,
      summary: mreSignals.fear_greed.summary,
    },
  };
}

/**
 * Get historical signal data for time series visualization
 */
export async function getSignalHistory(symbol?: string, days: number = 30): Promise<HistoricalPoint[]> {
  try {
    const historyPath = path.join(process.cwd(), 'public', 'data', 'trading', 'mre-history.json');
    const historyData = await fs.readFile(historyPath, 'utf8');
    const history: HistoricalPoint[] = JSON.parse(historyData);
    
    // Filter by date range
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const filtered = history.filter(point => {
      const pointDate = new Date(point.timestamp);
      return pointDate >= cutoffDate;
    });
    
    // Sort by timestamp
    return filtered.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  } catch (error) {
    console.error('Failed to load signal history:', error);
    return [];
  }
}

/**
 * Find ticker details from the main signals data
 */
export function findTickerDetails(mreSignals: MRESignalsData, symbol: string): MRETicker | null {
  return mreSignals.signals.by_asset_class.find(t => t.symbol === symbol) || null;
}

/**
 * Get related tickers in the same asset class
 */
export function getRelatedTickers(mreSignals: MRESignalsData, symbol: string): MRETicker[] {
  const ticker = findTickerDetails(mreSignals, symbol);
  if (!ticker) return [];
  
  return mreSignals.signals.by_asset_class.filter(t => 
    t.asset_class === ticker.asset_class && t.symbol !== symbol
  );
}