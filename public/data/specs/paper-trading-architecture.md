# Paper Trading Portfolio Management System
## Technical Architecture Specification

**Document Version:** 1.0  
**Created:** 2026-02-20  
**Last Updated:** 2026-02-20  
**Author:** Atlas (Technical Architecture Agent)

---

## Executive Summary

The Paper Trading Portfolio Management System is a comprehensive simulation platform that enables users to practice trading strategies with virtual capital. This specification defines the technical architecture for a clean, MVP-first implementation that prioritizes core trading functionality while maintaining extensibility for future educational features.

**Key Architectural Decisions:**
- **Supabase-first data layer** with offline-capable mobile clients
- **Event-driven real-time updates** using Supabase Realtime subscriptions
- **Modular component architecture** separating concerns cleanly
- **Progressive enhancement** from basic portfolio tracking to advanced analytics

---

## 1. System Overview

### 1.1 Architecture Principles

1. **MVP First**: Core trading functionality ships clean without educational prompts
2. **Real-time by Design**: Position values, P&L, and accuracy metrics update live
3. **Offline Resilient**: Mobile app functions with cached data when network is unavailable
4. **Type Safety**: TypeScript throughout, shared types between frontend/backend
5. **Graceful Degradation**: System works when supporting services are temporarily unavailable

### 1.2 Technology Stack

**Frontend (Mobile)**
- React Native 0.73+ with Expo SDK 50
- TypeScript for type safety
- Expo Router for navigation
- Supabase JS client for data access
- Expo SecureStore for credential persistence

**Backend Services**
- Supabase (PostgreSQL + Realtime + Auth)
- Edge Functions for complex business logic
- Row Level Security (RLS) for data isolation

**Data Sources**
- Real-time price feeds (Alpha Vantage, Polygon, or similar)
- MRE signal system integration
- Historical price data for backtesting

### 1.3 System Boundaries

**In Scope:**
- Portfolio management and position tracking
- Real-time P&L calculation and display
- Signal accuracy measurement
- Auto-trading based on MRE signals
- Basic performance analytics

**Out of Scope (Future Phases):**
- Educational prompts and tutorials
- Advanced charting and technical analysis
- Social features and leaderboards
- Options and derivatives trading

---

## 2. Data Architecture

### 2.1 Core Data Models

#### 2.1.1 User Portfolio
```typescript
interface Portfolio {
  id: string
  user_id: string
  initial_balance: number
  current_balance: number
  cash_available: number
  positions_value: number
  total_pnl: number
  total_pnl_pct: number
  daily_pnl: number
  daily_pnl_pct: number
  created_at: string
  updated_at: string
}
```

#### 2.1.2 Paper Positions (Open Trades)
```typescript
interface PaperPosition {
  id: string
  user_id: string
  portfolio_id: string
  symbol: string
  side: 'long' | 'short'
  quantity: number
  entry_price: number
  current_price: number
  stop_loss?: number
  take_profit?: number
  max_hold_days?: number
  signal_source?: 'mre' | 'manual' | 'auto'
  signal_confidence?: number
  signal_regime?: string
  opened_at: string
  updated_at: string
  
  // Computed fields (calculated)
  market_value: number
  unrealized_pnl: number
  unrealized_pnl_pct: number
  hold_days: number
  is_expired: boolean
}
```

#### 2.1.3 Trade History (Closed Positions)
```typescript
interface TradeHistory {
  id: string
  user_id: string
  portfolio_id: string
  position_id: string  // Reference to original position
  symbol: string
  side: 'long' | 'short'
  quantity: number
  entry_price: number
  exit_price: number
  entry_time: string
  exit_time: string
  hold_duration_hours: number
  realized_pnl: number
  realized_pnl_pct: number
  close_reason: 'manual' | 'stop_loss' | 'take_profit' | 'max_hold' | 'signal_exit'
  signal_was_correct: boolean
  created_at: string
}
```

#### 2.1.4 Trading Configuration
```typescript
interface TradingConfig {
  id: string
  user_id: string
  auto_trade_enabled: boolean
  default_position_size_pct: number    // % of portfolio per trade
  max_open_positions: number
  default_stop_loss_pct: number        // -5 = 5% stop loss
  default_take_profit_pct: number      // 15 = 15% take profit
  max_hold_days: number                // Auto-close after N days
  risk_management_enabled: boolean
  created_at: string
  updated_at: string
}
```

#### 2.1.5 Price Data Cache
```typescript
interface PriceSnapshot {
  symbol: string
  price: number
  timestamp: string
  source: 'alpha_vantage' | 'polygon' | 'yahoo'
  market_status: 'open' | 'closed' | 'pre_market' | 'after_hours'
}
```

### 2.2 Derived Analytics Models

#### 2.2.1 Portfolio Performance Metrics
```typescript
interface PerformanceMetrics {
  user_id: string
  portfolio_id: string
  time_period: '1d' | '1w' | '1m' | '3m' | 'ytd' | 'all'
  
  // Returns
  total_return_pct: number
  annualized_return_pct: number
  
  // Risk metrics
  max_drawdown_pct: number
  sharpe_ratio: number
  win_rate_pct: number
  profit_factor: number
  
  // Trading activity
  total_trades: number
  avg_hold_time_hours: number
  best_trade_pct: number
  worst_trade_pct: number
  
  computed_at: string
}
```

#### 2.2.2 Signal Accuracy Tracking
```typescript
interface SignalAccuracy {
  user_id: string
  signal_source: string     // 'mre', 'manual', etc.
  symbol?: string           // null for overall accuracy
  time_period: '1w' | '1m' | '3m' | 'all'
  
  total_signals: number
  correct_signals: number
  accuracy_pct: number
  
  avg_gain_on_correct_pct: number
  avg_loss_on_incorrect_pct: number
  
  computed_at: string
}
```

---

## 3. Database Schema (Supabase PostgreSQL)

### 3.1 Core Tables

```sql
-- User portfolios (one per user initially, can extend for multiple accounts)
CREATE TABLE portfolios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) DEFAULT 'Main Portfolio',
  initial_balance DECIMAL(12,2) DEFAULT 100000.00,
  current_balance DECIMAL(12,2) NOT NULL,
  cash_available DECIMAL(12,2) NOT NULL,
  positions_value DECIMAL(12,2) DEFAULT 0.00,
  total_pnl DECIMAL(12,2) DEFAULT 0.00,
  total_pnl_pct DECIMAL(8,4) DEFAULT 0.0000,
  daily_pnl DECIMAL(12,2) DEFAULT 0.00,
  daily_pnl_pct DECIMAL(8,4) DEFAULT 0.0000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Open positions
CREATE TABLE paper_positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
  symbol VARCHAR(10) NOT NULL,
  side VARCHAR(5) NOT NULL CHECK (side IN ('long', 'short')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  entry_price DECIMAL(10,4) NOT NULL CHECK (entry_price > 0),
  current_price DECIMAL(10,4) NOT NULL CHECK (current_price > 0),
  stop_loss DECIMAL(10,4) NULL,
  take_profit DECIMAL(10,4) NULL,
  max_hold_days INTEGER DEFAULT 30,
  signal_source VARCHAR(20) DEFAULT 'manual',
  signal_confidence DECIMAL(5,2) NULL,
  signal_regime VARCHAR(50) NULL,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Computed columns
  market_value DECIMAL(12,2) GENERATED ALWAYS AS (quantity * current_price) STORED,
  unrealized_pnl DECIMAL(12,2) GENERATED ALWAYS AS (
    CASE 
      WHEN side = 'long' THEN quantity * (current_price - entry_price)
      ELSE quantity * (entry_price - current_price)
    END
  ) STORED,
  unrealized_pnl_pct DECIMAL(8,4) GENERATED ALWAYS AS (
    CASE 
      WHEN side = 'long' THEN ((current_price - entry_price) / entry_price) * 100
      ELSE ((entry_price - current_price) / entry_price) * 100
    END
  ) STORED
);

-- Closed trades
CREATE TABLE trade_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
  position_id UUID NOT NULL, -- Reference to original position (may be deleted)
  symbol VARCHAR(10) NOT NULL,
  side VARCHAR(5) NOT NULL CHECK (side IN ('long', 'short')),
  quantity INTEGER NOT NULL,
  entry_price DECIMAL(10,4) NOT NULL,
  exit_price DECIMAL(10,4) NOT NULL,
  entry_time TIMESTAMPTZ NOT NULL,
  exit_time TIMESTAMPTZ DEFAULT NOW(),
  hold_duration_hours INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (exit_time - entry_time)) / 3600
  ) STORED,
  realized_pnl DECIMAL(12,2) NOT NULL,
  realized_pnl_pct DECIMAL(8,4) NOT NULL,
  close_reason VARCHAR(20) NOT NULL,
  signal_was_correct BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trading configuration per user
CREATE TABLE trading_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  auto_trade_enabled BOOLEAN DEFAULT FALSE,
  default_position_size_pct DECIMAL(5,2) DEFAULT 10.00,
  max_open_positions INTEGER DEFAULT 10,
  default_stop_loss_pct DECIMAL(5,2) DEFAULT -5.00,
  default_take_profit_pct DECIMAL(5,2) DEFAULT 15.00,
  max_hold_days INTEGER DEFAULT 30,
  risk_management_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price data cache
CREATE TABLE price_cache (
  symbol VARCHAR(10) NOT NULL,
  price DECIMAL(10,4) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  source VARCHAR(20) DEFAULT 'unknown',
  market_status VARCHAR(20) DEFAULT 'unknown',
  
  PRIMARY KEY (symbol, timestamp)
);
```

### 3.2 Indexes and Constraints

```sql
-- Performance indexes
CREATE INDEX idx_positions_user_portfolio ON paper_positions(user_id, portfolio_id);
CREATE INDEX idx_positions_symbol ON paper_positions(symbol);
CREATE INDEX idx_positions_opened_at ON paper_positions(opened_at);

CREATE INDEX idx_trades_user_portfolio ON trade_history(user_id, portfolio_id);
CREATE INDEX idx_trades_symbol ON trade_history(symbol);
CREATE INDEX idx_trades_exit_time ON trade_history(exit_time);
CREATE INDEX idx_trades_signal_correct ON trade_history(signal_was_correct);

CREATE INDEX idx_price_cache_symbol_time ON price_cache(symbol, timestamp DESC);

-- Data integrity constraints
ALTER TABLE paper_positions ADD CONSTRAINT valid_stop_loss 
  CHECK (stop_loss IS NULL OR (side = 'long' AND stop_loss < entry_price) OR (side = 'short' AND stop_loss > entry_price));

ALTER TABLE paper_positions ADD CONSTRAINT valid_take_profit
  CHECK (take_profit IS NULL OR (side = 'long' AND take_profit > entry_price) OR (side = 'short' AND take_profit < entry_price));

ALTER TABLE trading_config ADD CONSTRAINT valid_position_size
  CHECK (default_position_size_pct > 0 AND default_position_size_pct <= 100);
```

### 3.3 Row Level Security (RLS)

```sql
-- Enable RLS on all user tables
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_config ENABLE ROW LEVEL SECURITY;

-- Policies: users can only access their own data
CREATE POLICY "Users can view own portfolios" ON portfolios
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own positions" ON paper_positions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own trade history" ON trade_history
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own trading config" ON trading_config
  FOR ALL USING (auth.uid() = user_id);

-- Price cache is read-only for all authenticated users
ALTER TABLE price_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read price cache" ON price_cache
  FOR SELECT USING (auth.role() = 'authenticated');
```

---

## 4. API Design

### 4.1 Supabase Client Architecture

The mobile app uses the Supabase JavaScript client with the existing patterns established in the Lever app:

```typescript
// Existing pattern from ~/joshlevylabs/apps/mobile/lib/supabase.ts
export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: createStorage(), // expo-secure-store with fallback
      autoRefreshToken: true,
      persistSession: isNative,
      detectSessionInUrl: false,
    },
  },
)
```

### 4.2 Core API Operations

#### 4.2.1 Portfolio Management
```typescript
// Get portfolio summary
async function getPortfolio(userId: string): Promise<PortfolioSummary> {
  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error) throw error
  return data
}

// Real-time portfolio updates
function subscribeToPortfolio(userId: string, callback: (portfolio: Portfolio) => void) {
  return supabase
    .channel('portfolio-updates')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'portfolios',
      filter: `user_id=eq.${userId}`
    }, callback)
    .subscribe()
}
```

#### 4.2.2 Position Management
```typescript
// Open a new position
async function openPosition(params: OpenPositionParams): Promise<PaperPosition> {
  const { data, error } = await supabase
    .from('paper_positions')
    .insert(params)
    .select()
    .single()
  
  if (error) throw error
  
  // Update portfolio cash balance
  await updatePortfolioBalance(params.portfolio_id, -params.quantity * params.entry_price)
  
  return data
}

// Close a position
async function closePosition(positionId: string, closePrice: number, reason: string): Promise<TradeHistory> {
  const { data: position, error: fetchError } = await supabase
    .from('paper_positions')
    .select('*')
    .eq('id', positionId)
    .single()
  
  if (fetchError) throw fetchError
  
  // Calculate P&L
  const pnl = position.side === 'long' 
    ? position.quantity * (closePrice - position.entry_price)
    : position.quantity * (position.entry_price - closePrice)
  
  // Create trade record
  const trade = {
    position_id: positionId,
    user_id: position.user_id,
    portfolio_id: position.portfolio_id,
    symbol: position.symbol,
    side: position.side,
    quantity: position.quantity,
    entry_price: position.entry_price,
    exit_price: closePrice,
    entry_time: position.opened_at,
    realized_pnl: pnl,
    realized_pnl_pct: (pnl / (position.quantity * position.entry_price)) * 100,
    close_reason: reason,
    signal_was_correct: pnl > 0
  }
  
  // Transaction: insert trade and delete position
  const { data: tradeData, error: tradeError } = await supabase
    .from('trade_history')
    .insert(trade)
    .select()
    .single()
  
  if (tradeError) throw tradeError
  
  await supabase
    .from('paper_positions')
    .delete()
    .eq('id', positionId)
  
  // Update portfolio balance with sale proceeds
  await updatePortfolioBalance(position.portfolio_id, position.quantity * closePrice + pnl)
  
  return tradeData
}
```

### 4.3 Edge Functions

For complex operations that require transactions or external API calls:

#### 4.3.1 Price Update Function
```typescript
// Edge Function: update-positions-prices
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  try {
    // Get all unique symbols from open positions
    const { data: symbols } = await supabase
      .from('paper_positions')
      .select('symbol')
      .neq('symbol', '')
    
    const uniqueSymbols = [...new Set(symbols?.map(s => s.symbol) || [])]
    
    // Fetch prices from external API (Alpha Vantage, Polygon, etc.)
    const priceUpdates = await fetchCurrentPrices(uniqueSymbols)
    
    // Update positions with new prices
    for (const update of priceUpdates) {
      await supabase
        .from('paper_positions')
        .update({ 
          current_price: update.price,
          updated_at: new Date().toISOString()
        })
        .eq('symbol', update.symbol)
      
      // Cache the price
      await supabase
        .from('price_cache')
        .upsert({
          symbol: update.symbol,
          price: update.price,
          timestamp: new Date().toISOString(),
          source: 'alpha_vantage'
        })
    }
    
    return new Response(JSON.stringify({ updated: priceUpdates.length }))
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})

async function fetchCurrentPrices(symbols: string[]) {
  // Implementation depends on chosen price provider
  // Alpha Vantage, Polygon, Yahoo Finance, etc.
}
```

#### 4.3.2 Auto-Trading Function
```typescript
// Edge Function: process-mre-signals
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

serve(async (req) => {
  const { signal } = await req.json()
  
  // Get users with auto-trading enabled
  const { data: configs } = await supabase
    .from('trading_config')
    .select('user_id, *')
    .eq('auto_trade_enabled', true)
  
  for (const config of configs || []) {
    // Check if user already has position in this symbol
    const { data: existingPosition } = await supabase
      .from('paper_positions')
      .select('id')
      .eq('user_id', config.user_id)
      .eq('symbol', signal.symbol)
      .single()
    
    if (existingPosition) continue // Skip if already has position
    
    // Calculate position size based on config
    const { data: portfolio } = await supabase
      .from('portfolios')
      .select('cash_available')
      .eq('user_id', config.user_id)
      .single()
    
    const positionValue = portfolio.cash_available * (config.default_position_size_pct / 100)
    const quantity = Math.floor(positionValue / signal.price)
    
    if (quantity > 0) {
      // Open position
      await openPosition({
        user_id: config.user_id,
        portfolio_id: portfolio.id,
        symbol: signal.symbol,
        side: signal.direction, // 'long' or 'short'
        quantity: quantity,
        entry_price: signal.price,
        current_price: signal.price,
        stop_loss: signal.price * (1 + config.default_stop_loss_pct / 100),
        take_profit: signal.price * (1 + config.default_take_profit_pct / 100),
        signal_source: 'mre',
        signal_confidence: signal.confidence,
        signal_regime: signal.regime
      })
    }
  }
  
  return new Response(JSON.stringify({ processed: configs?.length || 0 }))
})
```

---

## 5. State Management

### 5.1 React Query + Zustand Pattern

Following the existing Lever app pattern, we use custom hooks for data management with local state optimization:

```typescript
// usePaperTrading.ts (enhanced version of existing hook)
export function usePaperTrading(): UsePaperTradingReturn {
  const { user } = useAuth()
  
  // Local state with optimistic updates
  const [positions, setPositions] = useState<PaperPosition[]>([])
  const [trades, setTrades] = useState<TradeHistory[]>([])
  const [portfolio, setPortfolio] = useState<Portfolio>(INITIAL_PORTFOLIO)
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  
  // Real-time subscriptions
  useEffect(() => {
    if (!user) return
    
    // Subscribe to position updates
    const positionSubscription = supabase
      .channel('positions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'paper_positions',
        filter: `user_id=eq.${user.id}`
      }, handlePositionChange)
      .subscribe()
    
    // Subscribe to portfolio updates
    const portfolioSubscription = supabase
      .channel('portfolio')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'portfolios',
        filter: `user_id=eq.${user.id}`
      }, handlePortfolioChange)
      .subscribe()
    
    return () => {
      positionSubscription.unsubscribe()
      portfolioSubscription.unsubscribe()
    }
  }, [user])
  
  // Optimistic updates for fast UI responsiveness
  const openPositionOptimistic = useCallback(async (params: OpenPositionParams) => {
    const tempPosition = { ...params, id: generateTempId(), current_price: params.entry_price }
    
    // Optimistic update
    setPositions(prev => [tempPosition, ...prev])
    
    try {
      // Actual API call
      const position = await openPosition(params)
      
      // Replace temp with real data
      setPositions(prev => prev.map(p => p.id === tempPosition.id ? position : p))
      
      return position
    } catch (error) {
      // Revert optimistic update
      setPositions(prev => prev.filter(p => p.id !== tempPosition.id))
      throw error
    }
  }, [])
  
  return {
    positions,
    trades,
    portfolio,
    metrics,
    openPosition: openPositionOptimistic,
    closePosition,
    // ... other methods
  }
}
```

### 5.2 Cache Management Strategy

```typescript
// Price update cache with aggressive caching
const PRICE_CACHE_TTL = 30 * 1000 // 30 seconds for real-time feel
const priceCache = new Map<string, { price: number; timestamp: number }>()

function getCachedPrice(symbol: string): number | null {
  const cached = priceCache.get(symbol)
  if (!cached || Date.now() - cached.timestamp > PRICE_CACHE_TTL) {
    return null
  }
  return cached.price
}

function updatePriceCache(symbol: string, price: number) {
  priceCache.set(symbol, { price, timestamp: Date.now() })
}
```

---

## 6. Real-time Price Integration

### 6.1 Price Provider Strategy

**Primary: Alpha Vantage**
- 5 API calls per minute free tier
- Good for MVP with limited concurrent users
- Reliable real-time quotes

**Backup: Yahoo Finance (yfinance)**
- Free, no API key required
- Good for fallback when Alpha Vantage quota exceeded
- Less reliable but sufficient for paper trading

**Future: Polygon.io**
- Higher tier when scaling beyond MVP
- Real-time WebSocket feeds
- More comprehensive market data

### 6.2 Price Update Architecture

```typescript
// Price update orchestrator
class PriceUpdateService {
  private updateInterval: NodeJS.Timeout | null = null
  private subscribers = new Set<string>() // User IDs subscribed to updates
  
  start() {
    this.updateInterval = setInterval(async () => {
      await this.updateAllPrices()
    }, 30000) // 30 second updates
  }
  
  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  }
  
  private async updateAllPrices() {
    try {
      // Get all unique symbols from active positions
      const { data: symbols } = await supabase
        .from('paper_positions')
        .select('symbol')
        .neq('symbol', '')
      
      const uniqueSymbols = [...new Set(symbols?.map(s => s.symbol))]
      
      // Batch fetch prices (respecting rate limits)
      const prices = await this.fetchBatchPrices(uniqueSymbols)
      
      // Update database
      await this.updatePositionPrices(prices)
      
      // Trigger client-side updates via Supabase Realtime
      // (happens automatically via postgres_changes subscription)
      
    } catch (error) {
      console.error('Price update failed:', error)
    }
  }
  
  private async fetchBatchPrices(symbols: string[]): Promise<Array<{symbol: string, price: number}>> {
    // Implement rate-limited batch fetching
    const results = []
    const BATCH_SIZE = 5 // Alpha Vantage limit
    
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE)
      const batchPrices = await Promise.all(
        batch.map(symbol => this.fetchSinglePrice(symbol))
      )
      results.push(...batchPrices)
      
      // Rate limiting delay
      if (i + BATCH_SIZE < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 12000)) // 1 min / 5 calls
      }
    }
    
    return results
  }
  
  private async fetchSinglePrice(symbol: string): Promise<{symbol: string, price: number}> {
    // Try cache first
    const cached = getCachedPrice(symbol)
    if (cached) return { symbol, price: cached }
    
    try {
      // Primary: Alpha Vantage
      const price = await this.fetchAlphaVantagePrice(symbol)
      updatePriceCache(symbol, price)
      return { symbol, price }
    } catch (error) {
      // Fallback: Yahoo Finance
      try {
        const price = await this.fetchYahooPrice(symbol)
        updatePriceCache(symbol, price)
        return { symbol, price }
      } catch (fallbackError) {
        // Use last known price
        const { data } = await supabase
          .from('price_cache')
          .select('price')
          .eq('symbol', symbol)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single()
        
        return { symbol, price: data?.price || 0 }
      }
    }
  }
}
```

### 6.3 Market Hours Handling

```typescript
function getMarketStatus(): 'pre_market' | 'open' | 'after_hours' | 'closed' {
  const now = new Date()
  const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}))
  const hour = easternTime.getHours()
  const minute = easternTime.getMinutes()
  const day = easternTime.getDay() // 0 = Sunday, 6 = Saturday
  
  // Weekend
  if (day === 0 || day === 6) return 'closed'
  
  // Pre-market: 4:00 AM - 9:30 AM ET
  if (hour < 4 || (hour === 4 && minute === 0)) return 'closed'
  if (hour < 9 || (hour === 9 && minute < 30)) return 'pre_market'
  
  // Market hours: 9:30 AM - 4:00 PM ET  
  if (hour < 16) return 'open'
  
  // After hours: 4:00 PM - 8:00 PM ET
  if (hour < 20) return 'after_hours'
  
  return 'closed'
}

// Adjust update frequency based on market status
function getUpdateInterval(): number {
  const status = getMarketStatus()
  switch (status) {
    case 'open': return 30000      // 30 seconds during market hours
    case 'pre_market':
    case 'after_hours': return 300000 // 5 minutes during extended hours
    case 'closed': return 3600000     // 1 hour when closed
  }
}
```

---

## 7. Performance Analytics Engine

### 7.1 Metrics Calculation

```typescript
// Performance metrics calculator
class PerformanceCalculator {
  static calculatePortfolioMetrics(
    trades: TradeHistory[], 
    currentPositions: PaperPosition[],
    portfolioValue: number,
    initialBalance: number
  ): PerformanceMetrics {
    
    // Basic returns
    const totalReturn = portfolioValue - initialBalance
    const totalReturnPct = (totalReturn / initialBalance) * 100
    
    // Time-based calculations
    const daysSinceStart = this.getDaysSinceFirstTrade(trades)
    const annualizedReturn = Math.pow(1 + totalReturnPct / 100, 365 / daysSinceStart) - 1
    
    // Risk metrics
    const dailyReturns = this.calculateDailyReturns(trades, currentPositions)
    const sharpeRatio = this.calculateSharpe(dailyReturns)
    const maxDrawdown = this.calculateMaxDrawdown(dailyReturns)
    
    // Trading statistics
    const winningTrades = trades.filter(t => t.realized_pnl > 0)
    const losingTrades = trades.filter(t => t.realized_pnl <= 0)
    
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0
    const profitFactor = this.calculateProfitFactor(winningTrades, losingTrades)
    
    return {
      total_return_pct: totalReturnPct,
      annualized_return_pct: annualizedReturn * 100,
      max_drawdown_pct: maxDrawdown,
      sharpe_ratio: sharpeRatio,
      win_rate_pct: winRate,
      profit_factor: profitFactor,
      total_trades: trades.length,
      avg_hold_time_hours: this.calculateAvgHoldTime(trades),
      best_trade_pct: trades.length > 0 ? Math.max(...trades.map(t => t.realized_pnl_pct)) : 0,
      worst_trade_pct: trades.length > 0 ? Math.min(...trades.map(t => t.realized_pnl_pct)) : 0,
      computed_at: new Date().toISOString()
    }
  }
  
  private static calculateSharpe(dailyReturns: number[]): number {
    if (dailyReturns.length < 2) return 0
    
    const avgReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length
    const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (dailyReturns.length - 1)
    const stdDev = Math.sqrt(variance)
    
    return stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0 // Annualized
  }
  
  private static calculateMaxDrawdown(returns: number[]): number {
    let peak = 0
    let maxDrawdown = 0
    let runningValue = 1
    
    for (const returnPct of returns) {
      runningValue *= (1 + returnPct / 100)
      peak = Math.max(peak, runningValue)
      const drawdown = (peak - runningValue) / peak
      maxDrawdown = Math.max(maxDrawdown, drawdown)
    }
    
    return maxDrawdown * 100
  }
  
  private static calculateProfitFactor(winners: TradeHistory[], losers: TradeHistory[]): number {
    const totalWins = winners.reduce((sum, t) => sum + t.realized_pnl, 0)
    const totalLosses = Math.abs(losers.reduce((sum, t) => sum + t.realized_pnl, 0))
    
    return totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0
  }
}
```

### 7.2 Signal Accuracy Tracking

```typescript
// Signal accuracy calculator
function calculateSignalAccuracy(userId: string, timeframe: '1w' | '1m' | '3m' | 'all'): Promise<SignalAccuracy[]> {
  const query = supabase
    .from('trade_history')
    .select('symbol, signal_source, signal_was_correct, realized_pnl')
    .eq('user_id', userId)
  
  // Add time filter
  if (timeframe !== 'all') {
    const days = timeframe === '1w' ? 7 : timeframe === '1m' ? 30 : 90
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    query.gte('exit_time', cutoff)
  }
  
  return query.then(({ data: trades }) => {
    const accuracyMap = new Map<string, SignalAccuracy>()
    
    for (const trade of trades || []) {
      const key = `${trade.signal_source || 'unknown'}_${trade.symbol || 'all'}`
      
      if (!accuracyMap.has(key)) {
        accuracyMap.set(key, {
          user_id: userId,
          signal_source: trade.signal_source || 'unknown',
          symbol: trade.symbol,
          time_period: timeframe,
          total_signals: 0,
          correct_signals: 0,
          accuracy_pct: 0,
          avg_gain_on_correct_pct: 0,
          avg_loss_on_incorrect_pct: 0,
          computed_at: new Date().toISOString()
        })
      }
      
      const accuracy = accuracyMap.get(key)!
      accuracy.total_signals++
      
      if (trade.signal_was_correct) {
        accuracy.correct_signals++
      }
    }
    
    // Calculate percentages
    for (const accuracy of accuracyMap.values()) {
      accuracy.accuracy_pct = accuracy.total_signals > 0 
        ? (accuracy.correct_signals / accuracy.total_signals) * 100 
        : 0
    }
    
    return Array.from(accuracyMap.values())
  })
}
```

---

## 8. Risk Management System

### 8.1 Position Size Management

```typescript
// Position sizing calculator
class PositionSizer {
  static calculateOptimalSize(
    portfolio: Portfolio,
    config: TradingConfig,
    currentPositions: PaperPosition[]
  ): number {
    
    // Check position limits
    if (currentPositions.length >= config.max_open_positions) {
      return 0 // No more positions allowed
    }
    
    // Calculate available capital
    const availableCash = portfolio.cash_available
    const reserveCash = portfolio.current_balance * 0.1 // Keep 10% in reserve
    const usableCash = Math.max(0, availableCash - reserveCash)
    
    // Position size based on configuration
    const targetPositionValue = portfolio.current_balance * (config.default_position_size_pct / 100)
    
    return Math.min(targetPositionValue, usableCash)
  }
  
  static checkRiskLimits(
    newPosition: OpenPositionParams,
    portfolio: Portfolio,
    currentPositions: PaperPosition[]
  ): { allowed: boolean; reason?: string } {
    
    // Check available cash
    const positionCost = newPosition.quantity * newPosition.entry_price
    if (positionCost > portfolio.cash_available) {
      return { allowed: false, reason: 'Insufficient cash' }
    }
    
    // Check concentration risk (max 20% in single symbol)
    const symbolExposure = currentPositions
      .filter(p => p.symbol === newPosition.symbol)
      .reduce((sum, p) => sum + p.quantity * p.current_price, 0)
    
    const newExposure = symbolExposure + positionCost
    if (newExposure > portfolio.current_balance * 0.2) {
      return { allowed: false, reason: 'Too much concentration in single symbol' }
    }
    
    // Check total exposure (max 90% invested)
    const totalExposure = currentPositions
      .reduce((sum, p) => sum + p.quantity * p.current_price, 0)
    
    if (totalExposure + positionCost > portfolio.current_balance * 0.9) {
      return { allowed: false, reason: 'Portfolio too heavily invested' }
    }
    
    return { allowed: true }
  }
}
```

### 8.2 Stop Loss and Take Profit Automation

```typescript
// Risk management monitor (runs via Edge Function)
class RiskManager {
  static async checkStopLossAndTakeProfit(): Promise<void> {
    const { data: positions } = await supabase
      .from('paper_positions')
      .select('*')
      .or('stop_loss.not.is.null,take_profit.not.is.null')
    
    for (const position of positions || []) {
      await this.checkPositionRiskLevels(position)
    }
  }
  
  private static async checkPositionRiskLevels(position: PaperPosition): Promise<void> {
    const currentPrice = position.current_price
    let shouldClose = false
    let closeReason = ''
    
    // Check stop loss
    if (position.stop_loss) {
      const shouldTriggerSL = position.side === 'long' 
        ? currentPrice <= position.stop_loss
        : currentPrice >= position.stop_loss
        
      if (shouldTriggerSL) {
        shouldClose = true
        closeReason = 'stop_loss'
      }
    }
    
    // Check take profit
    if (position.take_profit && !shouldClose) {
      const shouldTriggerTP = position.side === 'long'
        ? currentPrice >= position.take_profit
        : currentPrice <= position.take_profit
        
      if (shouldTriggerTP) {
        shouldClose = true
        closeReason = 'take_profit'
      }
    }
    
    // Check max hold time
    if (!shouldClose && position.max_hold_days) {
      const holdDays = Math.floor(
        (Date.now() - new Date(position.opened_at).getTime()) / (1000 * 60 * 60 * 24)
      )
      
      if (holdDays >= position.max_hold_days) {
        shouldClose = true
        closeReason = 'max_hold'
      }
    }
    
    if (shouldClose) {
      await this.closePositionRisk(position.id, currentPrice, closeReason)
    }
  }
  
  private static async closePositionRisk(
    positionId: string, 
    closePrice: number, 
    reason: string
  ): Promise<void> {
    // Use the same closePosition logic but triggered by risk management
    await closePosition(positionId, closePrice, reason)
  }
}
```

---

## 9. Integration Points

### 9.1 MRE Signal Integration

```typescript
// MRE signal handler
interface MRESignal {
  symbol: string
  direction: 'buy' | 'sell' | 'hold'
  confidence: number // 0-100
  price: number
  regime: string
  timestamp: string
}

async function processMRESignal(signal: MRESignal): Promise<void> {
  // Only process BUY signals for auto-trading
  if (signal.direction !== 'buy') return
  
  // Get users with auto-trading enabled
  const { data: autoTradingUsers } = await supabase
    .from('trading_config')
    .select('user_id, portfolios!inner(*)')
    .eq('auto_trade_enabled', true)
  
  for (const user of autoTradingUsers || []) {
    try {
      // Check if user already has position in this symbol
      const { data: existingPosition } = await supabase
        .from('paper_positions')
        .select('id')
        .eq('user_id', user.user_id)
        .eq('symbol', signal.symbol)
        .single()
      
      if (existingPosition) continue // Skip if already positioned
      
      // Check risk limits
      const positionValue = PositionSizer.calculateOptimalSize(
        user.portfolios,
        user,
        [] // Simplified for this example
      )
      
      if (positionValue === 0) continue
      
      const quantity = Math.floor(positionValue / signal.price)
      
      // Open position
      await openPosition({
        user_id: user.user_id,
        portfolio_id: user.portfolios.id,
        symbol: signal.symbol,
        side: 'long',
        quantity: quantity,
        entry_price: signal.price,
        current_price: signal.price,
        signal_source: 'mre',
        signal_confidence: signal.confidence,
        signal_regime: signal.regime,
        auto_tracked: true
      })
      
    } catch (error) {
      console.error(`Auto-trading failed for user ${user.user_id}:`, error)
    }
  }
}
```

### 9.2 Notification System

```typescript
// Push notification service for significant events
class TradingNotificationService {
  static async notifySignificantEvent(
    userId: string, 
    event: 'position_opened' | 'position_closed' | 'stop_loss_hit' | 'take_profit_hit' | 'large_gain' | 'large_loss',
    data: any
  ): Promise<void> {
    
    // Check user notification preferences
    const { data: config } = await supabase
      .from('trading_config')
      .select('notifications_enabled, notification_threshold_pct')
      .eq('user_id', userId)
      .single()
    
    if (!config?.notifications_enabled) return
    
    let shouldNotify = false
    let message = ''
    
    switch (event) {
      case 'position_opened':
        message = `Opened ${data.side} position in ${data.symbol} for ${formatCurrency(data.quantity * data.entry_price)}`
        shouldNotify = data.auto_tracked // Only notify for auto-trades
        break
        
      case 'position_closed':
        const pnlPct = Math.abs(data.realized_pnl_pct)
        shouldNotify = pnlPct >= (config.notification_threshold_pct || 5)
        message = `Closed ${data.symbol} position: ${data.realized_pnl > 0 ? 'Gain' : 'Loss'} of ${formatPct(pnlPct)}`
        break
        
      case 'stop_loss_hit':
        shouldNotify = true
        message = `Stop loss triggered on ${data.symbol} position`
        break
        
      case 'take_profit_hit':
        shouldNotify = true
        message = `Take profit achieved on ${data.symbol} position (+${formatPct(data.realized_pnl_pct)})`
        break
    }
    
    if (shouldNotify) {
      // Send push notification via Expo
      await this.sendPushNotification(userId, message, data)
    }
  }
  
  private static async sendPushNotification(userId: string, message: string, data: any): Promise<void> {
    // Integration with Expo push notification service
    // Implementation would depend on how notifications are set up in the Lever app
  }
}
```

---

## 10. Deployment Strategy

### 10.1 Database Migration Plan

```sql
-- Migration script for production deployment
-- Run these in order with proper backups

-- 1. Create new tables
\i create_paper_trading_tables.sql

-- 2. Set up RLS policies
\i setup_rls_policies.sql

-- 3. Create indexes for performance
\i create_indexes.sql

-- 4. Seed initial data
INSERT INTO trading_config (user_id) 
SELECT id FROM auth.users 
WHERE email IN (SELECT email FROM existing_premium_users);

-- 5. Create views for analytics
CREATE VIEW portfolio_performance_view AS
SELECT 
  p.user_id,
  p.current_balance,
  p.total_pnl_pct,
  COUNT(pos.id) as open_positions,
  AVG(th.realized_pnl_pct) as avg_trade_return,
  SUM(CASE WHEN th.signal_was_correct THEN 1 ELSE 0 END)::float / COUNT(th.id) * 100 as signal_accuracy
FROM portfolios p
LEFT JOIN paper_positions pos ON pos.portfolio_id = p.id
LEFT JOIN trade_history th ON th.portfolio_id = p.id
GROUP BY p.user_id, p.current_balance, p.total_pnl_pct;
```

### 10.2 Edge Function Deployment

```yaml
# supabase/functions/update-positions-prices/deploy.yml
functions:
  - name: update-positions-prices
    schedule: "*/30 * * * * *" # Every 30 seconds during market hours
    environment:
      ALPHA_VANTAGE_API_KEY: ${ALPHA_VANTAGE_API_KEY}
      
  - name: process-mre-signals
    trigger: http # Called by MRE system webhook
    
  - name: risk-management-monitor  
    schedule: "*/60 * * * * *" # Every minute for stop-loss checks
```

### 10.3 Mobile App Deployment

**Lever App Integration:**
1. Add paper trading types to `@joshlevylabs/shared` package
2. Update Supabase environment variables in `eas.json`
3. Add new tab route: `app/(tabs)/portfolio.tsx` (already exists, enhance)
4. Deploy via The Catapult: `~/clawd/agents/lever-deploy/catapult.sh "feat: paper trading system"`

**Configuration Updates:**
```json
// eas.json build configuration
{
  "build": {
    "testflight": {
      "env": {
        "EXPO_PUBLIC_PAPER_TRADING_ENABLED": "true",
        "EXPO_PUBLIC_SUPABASE_URL": "https://atldnpjaxaeqzgtqbrpy.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "eyJ..."
      }
    }
  }
}
```

---

## 11. Testing Strategy

### 11.1 Unit Tests

```typescript
// __tests__/portfolio-calculations.test.ts
import { PerformanceCalculator } from '../src/lib/performance'

describe('Portfolio Calculations', () => {
  test('calculates total return correctly', () => {
    const trades = [
      { realized_pnl: 100, realized_pnl_pct: 10 },
      { realized_pnl: -50, realized_pnl_pct: -5 }
    ]
    
    const metrics = PerformanceCalculator.calculatePortfolioMetrics(
      trades, [], 100150, 100000
    )
    
    expect(metrics.total_return_pct).toBe(0.15)
  })
  
  test('calculates Sharpe ratio correctly', () => {
    const dailyReturns = [1.2, -0.5, 0.8, 2.1, -1.1]
    const sharpe = PerformanceCalculator.calculateSharpe(dailyReturns)
    
    expect(sharpe).toBeGreaterThan(0)
  })
})

// __tests__/position-sizing.test.ts
describe('Position Sizing', () => {
  test('respects maximum position limits', () => {
    const portfolio = { cash_available: 50000, current_balance: 100000 }
    const config = { max_open_positions: 5, default_position_size_pct: 10 }
    const currentPositions = new Array(5).fill({}) // Already at limit
    
    const size = PositionSizer.calculateOptimalSize(portfolio, config, currentPositions)
    expect(size).toBe(0)
  })
})
```

### 11.2 Integration Tests

```typescript
// __tests__/integration/trading-flow.test.ts
describe('Full Trading Flow', () => {
  test('can open and close position with P&L calculation', async () => {
    // Setup test user and portfolio
    const testUser = await createTestUser()
    const portfolio = await createTestPortfolio(testUser.id)
    
    // Open position
    const position = await openPosition({
      user_id: testUser.id,
      portfolio_id: portfolio.id,
      symbol: 'TEST',
      side: 'long',
      quantity: 100,
      entry_price: 50.00,
      current_price: 50.00
    })
    
    expect(position.id).toBeDefined()
    
    // Update price and close
    await updatePositionPrice(position.id, 55.00)
    const trade = await closePosition(position.id, 55.00, 'manual')
    
    expect(trade.realized_pnl).toBe(500) // 100 shares * $5 gain
    expect(trade.realized_pnl_pct).toBe(10) // 10% gain
  })
})
```

### 11.3 Performance Tests

```typescript
// __tests__/performance/price-updates.test.ts
describe('Price Update Performance', () => {
  test('handles 100 concurrent position updates', async () => {
    // Create 100 test positions
    const positions = await createManyTestPositions(100)
    
    // Measure update time
    const startTime = Date.now()
    
    await Promise.all(
      positions.map(pos => updatePositionPrice(pos.id, Math.random() * 100))
    )
    
    const updateTime = Date.now() - startTime
    
    expect(updateTime).toBeLessThan(5000) // Should complete in under 5 seconds
  })
})
```

---

## 12. Monitoring and Observability

### 12.1 Key Metrics to Track

**Business Metrics:**
- Daily active users with open positions
- Average portfolio value
- Trade frequency per user  
- Signal accuracy rates
- Auto-trading adoption rate

**Technical Metrics:**
- Price update latency
- Database query performance
- API error rates
- Real-time subscription connection health
- Mobile app crash rates

**Financial Simulation Metrics:**
- Position P&L accuracy
- Price data freshness
- Risk management trigger rates
- Portfolio calculation consistency

### 12.2 Alerting Strategy

```typescript
// Monitoring alerts configuration
const alerts = {
  price_update_failure: {
    condition: 'price_updates_failed > 5 in 10 minutes',
    severity: 'critical',
    action: 'Switch to backup price provider'
  },
  
  high_error_rate: {
    condition: 'api_error_rate > 5% in 5 minutes',
    severity: 'warning', 
    action: 'Investigate API issues'
  },
  
  user_portfolio_corruption: {
    condition: 'portfolio_balance < 0 OR portfolio_balance > 10000000',
    severity: 'critical',
    action: 'Freeze affected account, manual review'
  },
  
  price_staleness: {
    condition: 'MAX(price_age) > 300 seconds during market hours',
    severity: 'warning',
    action: 'Check price provider connectivity'
  }
}
```

---

## 13. Security Considerations

### 13.1 Data Protection

1. **Authentication**: Leverages existing Supabase Auth in Lever app
2. **Authorization**: Row Level Security ensures users only access their own data
3. **Data Validation**: All inputs validated both client and server-side
4. **Audit Trail**: All trades and position changes logged with timestamps

### 13.2 Financial Data Security

```typescript
// Sensitive calculation validation
function validateTradeCalculation(trade: TradeHistory): boolean {
  // Recalculate P&L server-side to prevent manipulation
  const calculatedPnl = trade.side === 'long'
    ? trade.quantity * (trade.exit_price - trade.entry_price)
    : trade.quantity * (trade.entry_price - trade.exit_price)
  
  const tolerance = 0.01 // 1 cent tolerance for rounding
  return Math.abs(calculatedPnl - trade.realized_pnl) <= tolerance
}

// Prevent impossible trades
function validatePositionLimits(position: OpenPositionParams, portfolio: Portfolio): ValidationResult {
  if (position.quantity <= 0) return { valid: false, reason: 'Invalid quantity' }
  if (position.entry_price <= 0) return { valid: false, reason: 'Invalid price' }
  
  const totalCost = position.quantity * position.entry_price
  if (totalCost > portfolio.cash_available * 1.01) { // 1% tolerance for concurrent updates
    return { valid: false, reason: 'Insufficient funds' }
  }
  
  return { valid: true }
}
```

### 13.3 Rate Limiting

```sql
-- Database-level rate limiting for API abuse prevention
CREATE TABLE api_rate_limits (
  user_id UUID REFERENCES auth.users(id),
  endpoint VARCHAR(50),
  requests_count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, endpoint, window_start)
);

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_endpoint VARCHAR(50),
  p_max_requests INTEGER DEFAULT 100,
  p_window_minutes INTEGER DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
BEGIN
  SELECT requests_count INTO current_count
  FROM api_rate_limits
  WHERE user_id = p_user_id 
    AND endpoint = p_endpoint
    AND window_start > NOW() - INTERVAL '1 minute' * p_window_minutes;
  
  IF current_count IS NULL THEN
    INSERT INTO api_rate_limits (user_id, endpoint, requests_count) 
    VALUES (p_user_id, p_endpoint, 1);
    RETURN TRUE;
  ELSIF current_count >= p_max_requests THEN
    RETURN FALSE;
  ELSE
    UPDATE api_rate_limits 
    SET requests_count = requests_count + 1
    WHERE user_id = p_user_id AND endpoint = p_endpoint;
    RETURN TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

---

## 14. Future Extensibility

### 14.1 Educational Layer Hook Points

When the education layer is added in future phases, these extension points are available:

```typescript
// Educational hooks in the trading flow
interface EducationalHooks {
  beforePositionOpen?: (params: OpenPositionParams) => Promise<EducationalPrompt | null>
  afterPositionOpen?: (position: PaperPosition) => Promise<void>
  beforePositionClose?: (position: PaperPosition) => Promise<EducationalPrompt | null>
  afterTradeComplete?: (trade: TradeHistory) => Promise<void>
  onPerformanceReview?: (metrics: PerformanceMetrics) => Promise<EducationalContent[]>
}

// Plugin system for educational content
interface EducationalPlugin {
  name: string
  version: string
  hooks: EducationalHooks
  isEnabled(user: User): boolean
}
```

### 14.2 Advanced Analytics Extensions

```typescript
// Future analytics modules
interface AdvancedAnalytics {
  sectorAnalysis?: SectorPerformanceData
  correlationMatrix?: SymbolCorrelationData
  riskAttribution?: RiskAttributionData
  backtestResults?: BacktestData
}

// Plugin architecture for new analysis types
interface AnalyticsPlugin {
  calculate(portfolio: Portfolio, trades: TradeHistory[]): Promise<any>
  visualize(data: any): ChartConfig
  exportReport(data: any): ReportData
}
```

### 14.3 External Integration Points

```typescript
// Webhook system for external integrations
interface WebhookConfig {
  url: string
  events: ('position_opened' | 'position_closed' | 'portfolio_updated')[]
  secret: string
  enabled: boolean
}

// Discord/Slack bot integration hooks
interface ChatBotIntegration {
  sendTradeAlert(trade: TradeHistory): Promise<void>
  sendPerformanceUpdate(metrics: PerformanceMetrics): Promise<void>
  handleTradeCommand(command: string): Promise<string>
}
```

---

## 15. Performance Optimization

### 15.1 Database Optimization

```sql
-- Partitioning strategy for large tables
CREATE TABLE trade_history_2026 PARTITION OF trade_history
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE TABLE trade_history_2027 PARTITION OF trade_history
  FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

-- Materialized views for expensive calculations
CREATE MATERIALIZED VIEW portfolio_summary_mv AS
SELECT 
  user_id,
  SUM(quantity * current_price) as total_position_value,
  COUNT(*) as position_count,
  AVG(unrealized_pnl_pct) as avg_unrealized_return
FROM paper_positions
GROUP BY user_id;

-- Refresh strategy
CREATE OR REPLACE FUNCTION refresh_portfolio_summaries()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY portfolio_summary_mv;
END;
$$ LANGUAGE plpgsql;
```

### 15.2 Caching Strategy

```typescript
// Multi-layer caching for optimal performance
class CacheManager {
  private redis: RedisClient
  private memoryCache: Map<string, { data: any; expiry: number }>
  
  async get(key: string): Promise<any> {
    // L1: Memory cache (fastest)
    const memoryResult = this.memoryCache.get(key)
    if (memoryResult && memoryResult.expiry > Date.now()) {
      return memoryResult.data
    }
    
    // L2: Redis cache
    const redisResult = await this.redis.get(key)
    if (redisResult) {
      const data = JSON.parse(redisResult)
      this.memoryCache.set(key, { data, expiry: Date.now() + 30000 }) // 30s memory cache
      return data
    }
    
    return null
  }
  
  async set(key: string, data: any, ttlSeconds: number = 300): Promise<void> {
    // Store in both layers
    this.memoryCache.set(key, { data, expiry: Date.now() + Math.min(ttlSeconds, 60) * 1000 })
    await this.redis.setex(key, ttlSeconds, JSON.stringify(data))
  }
}

// Cache keys strategy
const CacheKeys = {
  userPortfolio: (userId: string) => `portfolio:${userId}`,
  symbolPrice: (symbol: string) => `price:${symbol}`,
  performanceMetrics: (userId: string, period: string) => `metrics:${userId}:${period}`,
  signalAccuracy: (userId: string, symbol: string) => `accuracy:${userId}:${symbol}`
}
```

---

## 16. Error Handling and Recovery

### 16.1 Graceful Degradation

```typescript
// Fallback strategies for service failures
class FallbackManager {
  static async getPositionValue(position: PaperPosition): Promise<number> {
    try {
      // Primary: Real-time price
      const currentPrice = await PriceService.getCurrentPrice(position.symbol)
      return position.quantity * currentPrice
    } catch (error) {
      try {
        // Fallback 1: Last cached price
        const cachedPrice = await this.getCachedPrice(position.symbol)
        return position.quantity * cachedPrice
      } catch (cacheError) {
        // Fallback 2: Entry price (worst case)
        return position.quantity * position.entry_price
      }
    }
  }
  
  static async handleDatabaseError(operation: string, fallbackData?: any): Promise<any> {
    // Log error for monitoring
    console.error(`Database operation failed: ${operation}`)
    
    // Attempt to use local storage/cache
    if (fallbackData) {
      return fallbackData
    }
    
    // Return safe default values
    switch (operation) {
      case 'getPortfolio':
        return INITIAL_PORTFOLIO
      case 'getPositions':
        return []
      default:
        throw new Error(`Unrecoverable database error: ${operation}`)
    }
  }
}
```

### 16.2 Data Consistency Checks

```typescript
// Background job to verify data integrity
class DataIntegrityChecker {
  static async runDailyCheck(): Promise<IntegrityReport> {
    const issues: string[] = []
    
    // Check portfolio balance consistency
    const portfolios = await supabase.from('portfolios').select('*')
    
    for (const portfolio of portfolios.data || []) {
      const calculatedValue = await this.recalculatePortfolioValue(portfolio.id)
      const storedValue = portfolio.current_balance
      
      if (Math.abs(calculatedValue - storedValue) > 1.00) { // $1 tolerance
        issues.push(`Portfolio ${portfolio.id} value mismatch: stored=${storedValue}, calculated=${calculatedValue}`)
        
        // Auto-fix if difference is small
        if (Math.abs(calculatedValue - storedValue) < 100) {
          await supabase
            .from('portfolios')
            .update({ current_balance: calculatedValue })
            .eq('id', portfolio.id)
        }
      }
    }
    
    // Check for orphaned positions
    const orphanedPositions = await supabase
      .from('paper_positions')
      .select('id, portfolio_id')
      .not('portfolio_id', 'in', portfolios.data?.map(p => p.id) || [])
    
    if (orphanedPositions.data?.length) {
      issues.push(`Found ${orphanedPositions.data.length} orphaned positions`)
    }
    
    return { issues, timestamp: new Date().toISOString() }
  }
}
```

---

## Conclusion

This technical architecture specification provides a comprehensive foundation for implementing a production-ready paper trading portfolio management system. The design prioritizes:

1. **Clean MVP Implementation** - Core trading functionality without educational bloat
2. **Real-time Performance** - Live position updates and P&L calculations
3. **Scalable Architecture** - Extensible for future educational and analytics features
4. **Risk Management** - Built-in position sizing and stop-loss automation
5. **Data Integrity** - Robust validation and consistency checking
6. **Mobile-First Design** - Optimized for the existing Lever app ecosystem

The system is designed to integrate seamlessly with the existing Lever app architecture while maintaining clean separation of concerns and providing room for future enhancement.

**Next Steps for Implementation:**
1. Deploy database schema to Supabase
2. Implement core trading hooks in the Lever app
3. Set up real-time price feeds via Edge Functions
4. Deploy risk management automation
5. Integrate with MRE signal system
6. Launch in TestFlight via The Catapult

**Total Estimated Implementation Time:** 2-3 weeks for MVP, 4-6 weeks for full feature set including analytics and automation.