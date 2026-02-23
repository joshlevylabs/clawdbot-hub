/**
 * MRE Signal Flow Database Types
 * Generated from Supabase schema for type safety
 * Created: 2025-01-27
 */

// ===============================================
// CORE SIGNAL FLOW TYPES
// ===============================================

export interface SignalFlowStrategy {
  id: string;
  name: string;
  slug: string;
  description?: string;
  active: boolean;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SignalFlowTicker {
  symbol: string;
  name: string;
  asset_class: string;
  sector?: string;
  role?: string; // 'Crisis Hedge' | 'All-Weather' | 'Risk-On' | 'Momentum' | 'Cyclical'
  active: boolean;
  sma_period?: number;
  regime_weight?: number;
  asset_confidence?: number;
  expected_sharpe?: number;
  expected_accuracy?: number;
  hold_days?: number;
  fear_threshold_conservative?: number;
  fear_threshold_opportunistic?: number;
  greed_fg_block?: number;
  sell_enabled: boolean;
  international_priority: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SignalFlowStrategyTicker {
  id: string;
  strategy_id: string;
  ticker_symbol: string;
  weight: number;
  monitoring_config: Record<string, any>;
  created_at: string;
  
  // Relations
  strategy?: SignalFlowStrategy;
  ticker?: SignalFlowTicker;
}

export interface SignalFlowSignal {
  id: string;
  strategy_id?: string;
  ticker_symbol: string;
  signal_type: 'BUY' | 'SELL' | 'HOLD' | 'WATCH';
  signal_strength: number;
  confidence: number;
  price_at_signal?: number;
  current_price?: number;
  regime?: string;
  fear_greed_score?: number;
  hold_days?: number;
  signal_track?: string;
  version?: string;
  processing_metadata: Record<string, any>;
  timestamp: string;
  
  // Relations
  strategy?: SignalFlowStrategy;
  ticker?: SignalFlowTicker;
}

export interface SignalFlowSnapshot {
  id: string;
  snapshot_type: string;
  data: Record<string, any>;
  fear_greed_score?: number;
  global_regime?: string;
  active_signals_count: number;
  version?: string;
  timestamp: string;
}

// ===============================================
// FEAR & GREED TYPES
// ===============================================

export interface FearGreedComponent {
  name: string;
  score: number;
  signal: 'FEAR' | 'NEUTRAL' | 'GREED';
  description: string;
  raw_value: number;
}

export interface FearGreedBreakdown {
  aggregate_score: number;
  rating: string;
  components: FearGreedComponent[];
  methodology: string;
  sources?: Array<{
    name: string;
    used_for: string;
  }>;
}

export interface SignalFlowFearGreedHistory {
  id: string;
  score: number;
  rating: string;
  is_fear: boolean;
  is_extreme_fear: boolean;
  is_greed: boolean;
  is_extreme_greed: boolean;
  breakdown?: FearGreedBreakdown;
  source: string;
  timestamp: string;
}

// ===============================================
// REGIME ANALYSIS TYPES  
// ===============================================

export interface SignalFlowRegimeHistory {
  id: string;
  ticker_symbol?: string;
  regime: 'bull' | 'bear' | 'sideways';
  regime_stage?: 'early' | 'mid' | 'late';
  regime_days?: number;
  predicted_remaining_days?: number;
  confidence?: number;
  momentum_20d?: number;
  ema_spread_pct?: number;
  price?: number;
  ema_20?: number;
  ema_50?: number;
  ema_200?: number;
  above_ema_20?: boolean;
  above_ema_50?: boolean;
  above_ema_200?: boolean;
  timestamp: string;
  
  // Relations
  ticker?: SignalFlowTicker;
}

// ===============================================
// PAIRS TRADING TYPES
// ===============================================

export interface SignalFlowPairsData {
  id: string;
  symbol1: string;
  symbol2: string;
  current_spread?: number;
  mean_spread?: number;
  std_deviation?: number;
  z_score?: number;
  is_diverged: boolean;
  divergence_direction?: string;
  reverter?: string;
  probability?: number;
  timestamp: string;
  
  // Relations
  ticker1?: SignalFlowTicker;
  ticker2?: SignalFlowTicker;
}

// ===============================================
// API RESPONSE TYPES
// ===============================================

export interface SignalFlowDashboardData {
  strategies: SignalFlowStrategy[];
  signals: SignalFlowSignal[];
  fear_greed: SignalFlowFearGreedHistory;
  regime: SignalFlowRegimeHistory[];
  pairs?: SignalFlowPairsData[];
  snapshot?: SignalFlowSnapshot;
  timestamp: string;
}

export interface StrategyPerformance {
  strategy: SignalFlowStrategy;
  tickers: SignalFlowTicker[];
  current_signals: SignalFlowSignal[];
  active_positions: number;
  total_signals_today: number;
  win_rate?: number;
  avg_return?: number;
  sharpe_ratio?: number;
}

export interface TickerAnalysis {
  ticker: SignalFlowTicker;
  current_signal: SignalFlowSignal;
  regime: SignalFlowRegimeHistory;
  recent_signals: SignalFlowSignal[];
  fibonacci_data?: FibonacciAnalysis;
  pairs_relationships?: SignalFlowPairsData[];
}

// ===============================================
// TECHNICAL ANALYSIS TYPES
// ===============================================

export interface FibonacciLevel {
  level: string;
  price: number;
  type: 'retracement' | 'extension';
}

export interface FibonacciAnalysis {
  symbol: string;
  current_price: number;
  swing_high: number;
  swing_low: number;
  trend: 'uptrend' | 'downtrend';
  swing_quality: string;
  retracements: Record<string, number>;
  extensions: Record<string, number>;
  nearest_support: number;
  nearest_resistance: number;
  entry_zone: string;
  profit_targets: number[];
  pullback_low?: number;
  pullback_high?: number;
  extension_type: string;
}

// ===============================================
// VISUALIZATION TYPES
// ===============================================

export interface SignalFlowChartData {
  timestamp: string;
  fear_greed_score: number;
  active_signals: number;
  regime_bull_count: number;
  regime_bear_count: number;
  regime_sideways_count: number;
}

export interface StrategyAllocation {
  strategy_name: string;
  strategy_slug: string;
  allocation_percent: number;
  active_tickers: number;
  current_signals: {
    buy: number;
    hold: number;
    sell: number;
    watch: number;
  };
}

export interface SignalHeatmapData {
  ticker_symbol: string;
  strategy_name: string;
  signal_type: 'BUY' | 'SELL' | 'HOLD' | 'WATCH';
  signal_strength: number;
  confidence: number;
  regime: string;
  price_change_24h?: number;
}

// ===============================================
// DATABASE QUERY FILTERS
// ===============================================

export interface SignalFlowFilters {
  strategies?: string[];
  tickers?: string[];
  signal_types?: ('BUY' | 'SELL' | 'HOLD' | 'WATCH')[];
  asset_classes?: string[];
  regimes?: ('bull' | 'bear' | 'sideways')[];
  min_confidence?: number;
  time_range?: {
    start: string;
    end: string;
  };
  active_only?: boolean;
}

// ===============================================
// UTILITY TYPES
// ===============================================

export type SignalType = 'BUY' | 'SELL' | 'HOLD' | 'WATCH';
export type RegimeType = 'bull' | 'bear' | 'sideways';
export type RegimeStage = 'early' | 'mid' | 'late';
export type FearGreedRating = 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';

export interface SignalFlowError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// ===============================================
// SUPABASE GENERATED TYPES
// ===============================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      signal_flow_strategies: {
        Row: SignalFlowStrategy
        Insert: Omit<SignalFlowStrategy, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<SignalFlowStrategy, 'id' | 'created_at'>>
      }
      signal_flow_tickers: {
        Row: SignalFlowTicker
        Insert: Omit<SignalFlowTicker, 'created_at' | 'updated_at'>
        Update: Partial<Omit<SignalFlowTicker, 'symbol' | 'created_at'>>
      }
      signal_flow_strategy_tickers: {
        Row: SignalFlowStrategyTicker
        Insert: Omit<SignalFlowStrategyTicker, 'id' | 'created_at'>
        Update: Partial<Omit<SignalFlowStrategyTicker, 'id' | 'created_at'>>
      }
      signal_flow_signals: {
        Row: SignalFlowSignal
        Insert: Omit<SignalFlowSignal, 'id' | 'timestamp'>
        Update: Partial<Omit<SignalFlowSignal, 'id'>>
      }
      signal_flow_snapshots: {
        Row: SignalFlowSnapshot
        Insert: Omit<SignalFlowSnapshot, 'id' | 'timestamp'>
        Update: Partial<Omit<SignalFlowSnapshot, 'id'>>
      }
      signal_flow_fear_greed_history: {
        Row: SignalFlowFearGreedHistory
        Insert: Omit<SignalFlowFearGreedHistory, 'id' | 'timestamp'>
        Update: Partial<Omit<SignalFlowFearGreedHistory, 'id'>>
      }
      signal_flow_regime_history: {
        Row: SignalFlowRegimeHistory
        Insert: Omit<SignalFlowRegimeHistory, 'id' | 'timestamp'>
        Update: Partial<Omit<SignalFlowRegimeHistory, 'id'>>
      }
      signal_flow_pairs_data: {
        Row: SignalFlowPairsData
        Insert: Omit<SignalFlowPairsData, 'id' | 'timestamp'>
        Update: Partial<Omit<SignalFlowPairsData, 'id'>>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// ===============================================
// EXPORT CONVENIENCE TYPES
// ===============================================

export type { Database as SignalFlowDatabase };
export type SignalFlowTables = Database['public']['Tables'];
export type SignalFlowTable<T extends keyof SignalFlowTables> = SignalFlowTables[T]['Row'];