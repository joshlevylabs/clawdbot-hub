import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Paper trading uses a separate Supabase instance (unified system with Lever app)
const paperSupabaseUrl = process.env.NEXT_PUBLIC_PAPER_SUPABASE_URL || '';
const paperSupabaseKey = process.env.NEXT_PUBLIC_PAPER_SUPABASE_ANON_KEY || '';

export const paperSupabase: SupabaseClient = paperSupabaseUrl && paperSupabaseKey
  ? createClient(paperSupabaseUrl, paperSupabaseKey)
  : null as unknown as SupabaseClient;

export const isPaperSupabaseConfigured = () => Boolean(paperSupabaseUrl && paperSupabaseKey);

// ===== Types matching the unified paper trading schema =====

export interface PaperPosition {
  id: string;
  user_id: string | null;
  symbol: string;
  side: string; // 'long' | 'short'
  qty: number;
  entry_price: number;
  current_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  signal_confidence: number | null;
  signal_regime: string | null;
  signal_version: string | null;
  opened_at: string;
  hold_days: number | null;
  notes: string | null;
  auto_tracked: boolean | null;
  created_at: string;
}

export interface PaperTrade {
  id: string;
  user_id: string | null;
  position_id: string | null;
  symbol: string;
  side: string;
  qty: number;
  entry_price: number;
  exit_price: number;
  pnl: number;
  pnl_pct: number;
  hold_days_actual: number | null;
  signal_was_correct: boolean | null;
  signal_confidence: number | null;
  signal_regime: string | null;
  close_reason: string | null;
  opened_at: string;
  closed_at: string;
  created_at: string | null;
}

export interface PaperPortfolioSnapshot {
  id: string;
  user_id: string | null;
  date: string;
  equity: number;
  cash: number;
  positions_value: number;
  daily_pnl: number | null;
  daily_pnl_pct: number | null;
  total_pnl: number | null;
  total_pnl_pct: number | null;
  spy_price: number | null;
  spy_baseline: number | null;
  open_positions: number | null;
  created_at: string | null;
}

export interface SignalHistoryRecord {
  id: string;
  symbol: string;
  signal: string;
  confidence: number | null;
  fear_greed: number | null;
  regime: string | null;
  regime_stage: string | null;
  price_at_signal: number;
  price_after_5d: number | null;
  price_after_10d: number | null;
  price_after_20d: number | null;
  outcome_5d_pct: number | null;
  outcome_10d_pct: number | null;
  outcome_20d_pct: number | null;
  was_correct_5d: boolean | null;
  was_correct_10d: boolean | null;
  was_correct_20d: boolean | null;
  sma_period: number | null;
  version: string | null;
  generated_at: string;
  created_at: string | null;
}

export interface PaperTradingConfig {
  id: string;
  user_id: string | null;
  starting_capital: number | null;
  current_cash: number | null;
  auto_trade: boolean | null;
  max_position_pct: number | null;
  default_stop_loss_pct: number | null;
  default_take_profit_pct: number | null;
  created_at: string | null;
  updated_at: string | null;
}
