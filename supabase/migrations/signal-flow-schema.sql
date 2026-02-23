-- MRE Signal Flow Database Schema
-- Created: 2025-01-27
-- Description: Database schema for MRE Signal Flow Dashboard on Clawdbot Hub

-- Enable Row Level Security
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===============================================
-- TABLE: signal_flow_strategies
-- Description: MRE strategies mapped from asset class groupings
-- ===============================================
CREATE TABLE signal_flow_strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE, 
    description TEXT,
    active BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- TABLE: signal_flow_tickers
-- Description: Individual tickers (24 total) with metadata
-- ===============================================
CREATE TABLE signal_flow_tickers (
    symbol VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    asset_class VARCHAR(50) NOT NULL,
    sector VARCHAR(50),
    role VARCHAR(50), -- Crisis Hedge, All-Weather, Risk-On, etc.
    active BOOLEAN DEFAULT true,
    sma_period INTEGER,
    regime_weight DECIMAL(3,2),
    asset_confidence DECIMAL(3,2),
    expected_sharpe DECIMAL(8,2),
    expected_accuracy DECIMAL(5,2),
    hold_days INTEGER,
    fear_threshold_conservative INTEGER,
    fear_threshold_opportunistic INTEGER,
    greed_fg_block INTEGER,
    sell_enabled BOOLEAN DEFAULT true,
    international_priority BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- TABLE: signal_flow_strategy_tickers  
-- Description: Junction table linking strategies to tickers with weights
-- ===============================================
CREATE TABLE signal_flow_strategy_tickers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id UUID NOT NULL REFERENCES signal_flow_strategies(id) ON DELETE CASCADE,
    ticker_symbol VARCHAR(10) NOT NULL REFERENCES signal_flow_tickers(symbol) ON DELETE CASCADE,
    weight DECIMAL(5,4) DEFAULT 1.0,
    monitoring_config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(strategy_id, ticker_symbol)
);

-- ===============================================
-- TABLE: signal_flow_signals
-- Description: Time-series signal events (BUY/SELL/HOLD)
-- ===============================================
CREATE TABLE signal_flow_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    strategy_id UUID REFERENCES signal_flow_strategies(id) ON DELETE CASCADE,
    ticker_symbol VARCHAR(10) NOT NULL REFERENCES signal_flow_tickers(symbol) ON DELETE CASCADE,
    signal_type VARCHAR(10) NOT NULL CHECK (signal_type IN ('BUY', 'SELL', 'HOLD', 'WATCH')),
    signal_strength DECIMAL(5,2) DEFAULT 0,
    confidence DECIMAL(5,2) DEFAULT 0,
    price_at_signal DECIMAL(12,4),
    current_price DECIMAL(12,4),
    regime VARCHAR(20),
    fear_greed_score DECIMAL(8,4),
    hold_days INTEGER,
    signal_track VARCHAR(50),
    version VARCHAR(10),
    processing_metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes for time-series queries
    INDEX CONCURRENTLY idx_signal_flow_signals_timestamp (timestamp DESC),
    INDEX CONCURRENTLY idx_signal_flow_signals_ticker_timestamp (ticker_symbol, timestamp DESC),
    INDEX CONCURRENTLY idx_signal_flow_signals_strategy_timestamp (strategy_id, timestamp DESC)
);

-- ===============================================
-- TABLE: signal_flow_snapshots
-- Description: Periodic full-state snapshots for visualization
-- ===============================================
CREATE TABLE signal_flow_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_type VARCHAR(50) NOT NULL, -- 'full_state', 'fear_greed', 'regime', 'pairs', etc.
    data JSONB NOT NULL,
    fear_greed_score DECIMAL(8,4),
    global_regime VARCHAR(20),
    active_signals_count INTEGER DEFAULT 0,
    version VARCHAR(10),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Indexes for snapshot queries
    INDEX CONCURRENTLY idx_signal_flow_snapshots_timestamp (timestamp DESC),
    INDEX CONCURRENTLY idx_signal_flow_snapshots_type_timestamp (snapshot_type, timestamp DESC)
);

-- ===============================================
-- TABLE: signal_flow_fear_greed_history
-- Description: Historical fear & greed data with component breakdowns
-- ===============================================
CREATE TABLE signal_flow_fear_greed_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    score DECIMAL(8,4) NOT NULL,
    rating VARCHAR(20) NOT NULL,
    is_fear BOOLEAN DEFAULT false,
    is_extreme_fear BOOLEAN DEFAULT false, 
    is_greed BOOLEAN DEFAULT false,
    is_extreme_greed BOOLEAN DEFAULT false,
    breakdown JSONB, -- Component scores (momentum, strength, breadth, etc.)
    source VARCHAR(20) DEFAULT 'cnn',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    INDEX CONCURRENTLY idx_fear_greed_timestamp (timestamp DESC)
);

-- ===============================================
-- TABLE: signal_flow_regime_history
-- Description: Market regime analysis history (bull/bear/sideways)
-- ===============================================
CREATE TABLE signal_flow_regime_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticker_symbol VARCHAR(10) REFERENCES signal_flow_tickers(symbol),
    regime VARCHAR(20) NOT NULL, -- bull, bear, sideways
    regime_stage VARCHAR(20), -- early, mid, late
    regime_days INTEGER,
    predicted_remaining_days INTEGER,
    confidence INTEGER,
    momentum_20d DECIMAL(8,4),
    ema_spread_pct DECIMAL(8,4),
    price DECIMAL(12,4),
    ema_20 DECIMAL(12,4),
    ema_50 DECIMAL(12,4),
    ema_200 DECIMAL(12,4),
    above_ema_20 BOOLEAN,
    above_ema_50 BOOLEAN, 
    above_ema_200 BOOLEAN,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    INDEX CONCURRENTLY idx_regime_ticker_timestamp (ticker_symbol, timestamp DESC),
    INDEX CONCURRENTLY idx_regime_timestamp (timestamp DESC)
);

-- ===============================================
-- TABLE: signal_flow_pairs_data
-- Description: Pairs trading analysis between tickers
-- ===============================================
CREATE TABLE signal_flow_pairs_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol1 VARCHAR(10) NOT NULL REFERENCES signal_flow_tickers(symbol),
    symbol2 VARCHAR(10) NOT NULL REFERENCES signal_flow_tickers(symbol),
    current_spread DECIMAL(12,6),
    mean_spread DECIMAL(12,6),
    std_deviation DECIMAL(12,6),
    z_score DECIMAL(8,4),
    is_diverged BOOLEAN DEFAULT false,
    divergence_direction VARCHAR(20),
    reverter VARCHAR(10), -- Which symbol expected to revert
    probability DECIMAL(4,3), -- Reversion probability
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    INDEX CONCURRENTLY idx_pairs_timestamp (timestamp DESC),
    INDEX CONCURRENTLY idx_pairs_symbols (symbol1, symbol2),
    UNIQUE(symbol1, symbol2, timestamp)
);

-- ===============================================
-- ROW LEVEL SECURITY POLICIES
-- ===============================================

-- Enable RLS on all tables
ALTER TABLE signal_flow_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_flow_tickers ENABLE ROW LEVEL SECURITY;  
ALTER TABLE signal_flow_strategy_tickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_flow_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_flow_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_flow_fear_greed_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_flow_regime_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_flow_pairs_data ENABLE ROW LEVEL SECURITY;

-- Anonymous (public) read access
CREATE POLICY "Allow anonymous read on strategies" ON signal_flow_strategies 
    FOR SELECT TO anon USING (active = true);

CREATE POLICY "Allow anonymous read on tickers" ON signal_flow_tickers
    FOR SELECT TO anon USING (active = true);

CREATE POLICY "Allow anonymous read on strategy_tickers" ON signal_flow_strategy_tickers
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous read on signals" ON signal_flow_signals
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous read on snapshots" ON signal_flow_snapshots
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous read on fear_greed" ON signal_flow_fear_greed_history
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous read on regime" ON signal_flow_regime_history
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous read on pairs" ON signal_flow_pairs_data
    FOR SELECT TO anon USING (true);

-- Service role full access for data ingestion
CREATE POLICY "Allow service_role full access on strategies" ON signal_flow_strategies
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service_role full access on tickers" ON signal_flow_tickers
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service_role full access on strategy_tickers" ON signal_flow_strategy_tickers
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service_role full access on signals" ON signal_flow_signals
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service_role full access on snapshots" ON signal_flow_snapshots
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service_role full access on fear_greed" ON signal_flow_fear_greed_history
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service_role full access on regime" ON signal_flow_regime_history
    FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service_role full access on pairs" ON signal_flow_pairs_data
    FOR ALL TO service_role USING (true);

-- ===============================================
-- FUNCTIONS & TRIGGERS
-- ===============================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_strategies_updated_at 
    BEFORE UPDATE ON signal_flow_strategies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickers_updated_at 
    BEFORE UPDATE ON signal_flow_tickers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- COMMENTS
-- ===============================================

COMMENT ON TABLE signal_flow_strategies IS 'MRE signal flow strategies mapped from asset class groupings';
COMMENT ON TABLE signal_flow_tickers IS 'Individual tickers (24 total) with metadata and configuration';
COMMENT ON TABLE signal_flow_strategy_tickers IS 'Junction table linking strategies to tickers with weights';
COMMENT ON TABLE signal_flow_signals IS 'Time-series signal events (BUY/SELL/HOLD) for each ticker';
COMMENT ON TABLE signal_flow_snapshots IS 'Periodic full-state snapshots for visualization layer';
COMMENT ON TABLE signal_flow_fear_greed_history IS 'Historical fear & greed index data with component breakdowns';
COMMENT ON TABLE signal_flow_regime_history IS 'Market regime analysis history (bull/bear/sideways) per ticker';
COMMENT ON TABLE signal_flow_pairs_data IS 'Pairs trading analysis between different tickers';