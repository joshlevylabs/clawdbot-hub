-- MRE Signal Flow Seed Data  
-- Created: 2025-01-27
-- Description: Seed data for MRE Signal Flow system based on mre-signals.json analysis

-- ===============================================
-- SEED: signal_flow_strategies
-- Map asset classes to strategies
-- ===============================================

INSERT INTO signal_flow_strategies (name, slug, description, active, config) VALUES 
('Broad Market Strategy', 'broad-market', 'Core equity exposure through SPY, QQQ, IWM targeting momentum and regime-based signals', true, '{"asset_classes": ["broad_market"], "primary_focus": "momentum", "risk_profile": "moderate"}'),

('Technology & Growth Strategy', 'tech-growth', 'Technology and growth-focused positions via XLK, XLC targeting momentum and disruption themes', true, '{"asset_classes": ["technology"], "primary_focus": "momentum", "risk_profile": "aggressive"}'),

('Defensive & Healthcare Strategy', 'defensive-healthcare', 'Defensive positioning through healthcare (XLV, XLP) and utilities (XLU) for crisis hedge and stability', true, '{"asset_classes": ["healthcare"], "primary_focus": "crisis_hedge", "risk_profile": "conservative"}'),

('International & Emerging Strategy', 'international-emerging', 'Global diversification via EFA, EEM, INDA, FXI, EWJ for all-weather exposure', true, '{"asset_classes": ["international"], "primary_focus": "all_weather", "risk_profile": "moderate"}'),

('Alternative Assets Strategy', 'alternative-assets', 'Commodities (GLD, GDX, DBA), bonds (TLT, IEF, HYG), energy (XLE, XLB), crypto (BITO), and REITs (VNQ) for diversification', true, '{"asset_classes": ["commodities", "bonds", "energy", "real_estate"], "primary_focus": "cyclical", "risk_profile": "moderate"}');

-- ===============================================  
-- SEED: signal_flow_tickers
-- All 24 tickers with metadata from mre-signals.json
-- ===============================================

INSERT INTO signal_flow_tickers (
    symbol, name, asset_class, sector, role, active, sma_period, regime_weight, 
    asset_confidence, expected_sharpe, expected_accuracy, hold_days,
    fear_threshold_conservative, fear_threshold_opportunistic, greed_fg_block,
    sell_enabled, international_priority, metadata
) VALUES 

-- Broad Market
('SPY', 'SPDR S&P 500 ETF Trust', 'broad_market', 'broad_market', 'Momentum', true, 100, 1.0, 0.8, 10.65, 70.6, 15, 8, 19, 70, true, false, '{"role_action": "momentum_unconfirmed", "version": "3.1.0"}'),
('QQQ', 'Invesco QQQ Trust ETF', 'broad_market', 'broad_market', 'Risk-On', true, 100, 1.5, 1.1, 10.65, 70.6, 15, 8, 19, 70, true, false, '{"role_action": "risk_on_active", "version": "3.1.0"}'),
('IWM', 'iShares Russell 2000 ETF', 'broad_market', 'broad_market', 'All-Weather', true, 100, 0.5, 0.75, 10.65, 70.6, 15, 8, 19, 70, true, false, '{"role_action": "all_weather", "version": "3.1.0"}'),

-- Technology  
('XLK', 'Technology Select Sector SPDR Fund', 'technology', 'technology', 'Momentum', true, 50, 1.0, 1.25, 16.68, 83.3, 5, 8, 19, 70, true, false, '{"role_action": "momentum_confirmed", "version": "3.1.0"}'),
('XLC', 'Communication Services Select Sector SPDR Fund', 'technology', 'communication', 'All-Weather', true, 50, 1.0, 1.1, 16.68, 83.3, 5, 8, 19, 70, true, false, '{"role_action": "all_weather", "version": "3.1.0"}'),

-- Financials
('XLF', 'Financial Select Sector SPDR Fund', 'financials', 'financials', 'All-Weather', true, 100, 1.0, 0.9, 15.52, 65.0, 10, 8, 19, 70, true, false, '{"role_action": "all_weather", "version": "3.1.0"}'),

-- Healthcare  
('XLV', 'Health Care Select Sector SPDR Fund', 'healthcare', 'healthcare', 'Crisis Hedge', true, 50, 0.5, 1.25, 33.4, 83.3, 5, 8, 19, 70, true, false, '{"role_action": "crisis_standby", "version": "3.1.0"}'),
('XLP', 'Consumer Staples Select Sector SPDR Fund', 'healthcare', 'consumer_staples', 'Cyclical', true, 50, 0.5, 1.05, 33.4, 83.3, 5, 8, 19, 70, true, false, '{"role_action": "cyclical_adjacent", "version": "3.1.0"}'),

-- Energy & Materials
('XLE', 'Energy Select Sector SPDR Fund', 'energy', 'energy', 'All-Weather', true, 100, 0.5, 0.8, 4.74, 40.0, 20, 6, 16, 70, true, false, '{"role_action": "all_weather", "version": "3.1.0"}'),
('XLB', 'Materials Select Sector SPDR Fund', 'energy', 'materials', 'All-Weather', true, 100, 0.5, 0.75, 4.74, 40.0, 10, 6, 16, 70, true, false, '{"role_action": "all_weather", "version": "3.1.0"}'),

-- Utilities
('XLU', 'Utilities Select Sector SPDR Fund', 'real_estate', 'utilities', 'Cyclical', true, 100, 0.5, 1.3, 122.81, 75.0, 5, 8, 19, 70, true, false, '{"role_action": "cyclical_favorable", "version": "3.1.0"}'),

-- International
('EFA', 'iShares MSCI EAFE ETF', 'international', 'international_developed', 'All-Weather', true, 200, 0.5, 1.3, 117.59, 90.0, 30, 8, 32, 70, true, true, '{"role_action": "all_weather", "version": "3.1.0"}'),
('EEM', 'iShares MSCI Emerging Markets ETF', 'international', 'international_emerging', 'Cyclical', true, 200, 0.5, 1.3, 117.59, 90.0, 30, 8, 32, 70, true, true, '{"role_action": "cyclical_favorable", "version": "3.1.0"}'),
('INDA', 'iShares MSCI India ETF', 'international', 'international_emerging', 'All-Weather', true, 200, 1.0, 1.3, 117.59, 90.0, 30, 8, 32, 70, true, true, '{"role_action": "all_weather", "version": "3.1.0"}'),
('FXI', 'iShares China Large-Cap ETF', 'international', 'international_emerging', 'All-Weather', true, 200, 1.5, 0.6, 117.59, 90.0, 10, 8, 32, 70, true, true, '{"role_action": "all_weather", "version": "3.1.0"}'),
('EWJ', 'iShares MSCI Japan ETF', 'international', 'international_developed', 'All-Weather', true, 200, 0.5, 1.2, 117.59, 90.0, 30, 8, 32, 70, true, true, '{"role_action": "all_weather", "version": "3.1.0"}'),

-- Bonds
('TLT', 'iShares 20+ Year Treasury Bond ETF', 'bonds', 'treasury_bonds', 'Crisis Hedge', true, 200, 0.5, 0.7, 18.55, 51.8, 5, 8, 19, 70, false, false, '{"role_action": "crisis_standby", "version": "3.1.0"}'),
('IEF', 'iShares 7-10 Year Treasury Bond ETF', 'bonds', 'treasury_bonds', 'Crisis Hedge', true, 200, 0.5, 0.7, 18.55, 51.8, 5, 8, 19, 70, false, false, '{"role_action": "crisis_standby", "version": "3.1.0"}'),
('HYG', 'iShares iBoxx $ High Yield Corporate Bond ETF', 'bonds', 'corporate_bonds', 'Cyclical', true, 200, 0.5, 1.15, 18.55, 51.8, 20, 8, 19, 70, false, false, '{"role_action": "cyclical_favorable", "version": "3.1.0"}'),

-- Commodities
('GLD', 'SPDR Gold Trust', 'commodities', 'precious_metals', 'Cyclical', true, 200, 1.0, 1.2, 25.8, 61.3, 15, 8, 19, 70, true, false, '{"role_action": "cyclical_favorable", "version": "3.1.0"}'),
('GDX', 'VanEck Gold Miners ETF', 'commodities', 'precious_metals', 'Cyclical', true, 200, 0.5, 0.7, 25.8, 61.3, 5, 8, 19, 70, true, false, '{"role_action": "cyclical_adjacent", "version": "3.1.0"}'),
('DBA', 'Invesco DB Agriculture Fund', 'commodities', 'agriculture', 'All-Weather', true, 200, 1.0, 0.8, 25.8, 61.3, 10, 8, 19, 70, true, false, '{"role_action": "all_weather", "version": "3.1.0"}'),
('BITO', 'ProShares Bitcoin Strategy ETF', 'commodities', 'crypto', 'All-Weather', true, 200, 1.0, 1.05, 25.8, 61.3, 5, 8, 19, 70, true, false, '{"role_action": "all_weather", "version": "3.1.0"}'),

-- Real Estate
('VNQ', 'Vanguard Real Estate Investment Trust ETF', 'real_estate', 'real_estate', 'All-Weather', true, 100, 0.5, 0.8, 122.81, 75.0, 10, 8, 19, 70, true, false, '{"role_action": "all_weather", "version": "3.1.0"}');

-- ===============================================
-- SEED: strategy_ticker relationships  
-- Map tickers to strategies based on asset classes
-- ===============================================

-- Broad Market Strategy  
INSERT INTO signal_flow_strategy_tickers (strategy_id, ticker_symbol, weight, monitoring_config) 
SELECT s.id, t.symbol, 
    CASE 
        WHEN t.symbol = 'SPY' THEN 0.5
        WHEN t.symbol = 'QQQ' THEN 0.35  
        WHEN t.symbol = 'IWM' THEN 0.15
    END as weight,
    '{"primary_ticker": true}'::jsonb as monitoring_config
FROM signal_flow_strategies s, signal_flow_tickers t 
WHERE s.slug = 'broad-market' AND t.asset_class = 'broad_market';

-- Technology & Growth Strategy
INSERT INTO signal_flow_strategy_tickers (strategy_id, ticker_symbol, weight, monitoring_config)
SELECT s.id, t.symbol,
    CASE 
        WHEN t.symbol = 'XLK' THEN 0.7
        WHEN t.symbol = 'XLC' THEN 0.3
    END as weight,
    '{"growth_focus": true}'::jsonb as monitoring_config  
FROM signal_flow_strategies s, signal_flow_tickers t
WHERE s.slug = 'tech-growth' AND t.asset_class = 'technology';

-- Defensive & Healthcare Strategy
INSERT INTO signal_flow_strategy_tickers (strategy_id, ticker_symbol, weight, monitoring_config)
SELECT s.id, t.symbol,
    CASE 
        WHEN t.symbol = 'XLV' THEN 0.4
        WHEN t.symbol = 'XLP' THEN 0.3  
        WHEN t.symbol = 'XLU' THEN 0.3
    END as weight,
    '{"defensive_role": true}'::jsonb as monitoring_config
FROM signal_flow_strategies s, signal_flow_tickers t  
WHERE s.slug = 'defensive-healthcare' AND (t.asset_class = 'healthcare' OR t.symbol = 'XLU');

-- International & Emerging Strategy  
INSERT INTO signal_flow_strategy_tickers (strategy_id, ticker_symbol, weight, monitoring_config)
SELECT s.id, t.symbol,
    CASE
        WHEN t.symbol = 'EFA' THEN 0.3
        WHEN t.symbol = 'EEM' THEN 0.25
        WHEN t.symbol = 'INDA' THEN 0.2
        WHEN t.symbol = 'FXI' THEN 0.15
        WHEN t.symbol = 'EWJ' THEN 0.1
    END as weight,
    '{"international_priority": true}'::jsonb as monitoring_config
FROM signal_flow_strategies s, signal_flow_tickers t
WHERE s.slug = 'international-emerging' AND t.asset_class = 'international';

-- Alternative Assets Strategy
INSERT INTO signal_flow_strategy_tickers (strategy_id, ticker_symbol, weight, monitoring_config)  
SELECT s.id, t.symbol,
    CASE 
        -- Commodities (35%)
        WHEN t.symbol = 'GLD' THEN 0.20
        WHEN t.symbol = 'GDX' THEN 0.05  
        WHEN t.symbol = 'DBA' THEN 0.05
        WHEN t.symbol = 'BITO' THEN 0.05
        -- Bonds (35%)
        WHEN t.symbol = 'TLT' THEN 0.15
        WHEN t.symbol = 'IEF' THEN 0.10  
        WHEN t.symbol = 'HYG' THEN 0.10
        -- Energy & Materials (20%)  
        WHEN t.symbol = 'XLE' THEN 0.12
        WHEN t.symbol = 'XLB' THEN 0.08
        -- Real Estate (10%)
        WHEN t.symbol = 'VNQ' THEN 0.10
        -- Financials (Also add XLF to this strategy as it fits alternatives)
        WHEN t.symbol = 'XLF' THEN 0.00 -- Placeholder, will be in separate insert
    END as weight,
    CASE 
        WHEN t.asset_class = 'commodities' THEN '{"asset_type": "commodities", "inflation_hedge": true}'::jsonb
        WHEN t.asset_class = 'bonds' THEN '{"asset_type": "bonds", "crisis_hedge": true}'::jsonb  
        WHEN t.asset_class = 'energy' THEN '{"asset_type": "energy", "cyclical": true}'::jsonb
        WHEN t.asset_class = 'real_estate' THEN '{"asset_type": "real_estate", "yield_focus": true}'::jsonb
    END as monitoring_config
FROM signal_flow_strategies s, signal_flow_tickers t
WHERE s.slug = 'alternative-assets' AND t.asset_class IN ('commodities', 'bonds', 'energy', 'real_estate');

-- Add XLF to Alternative Assets Strategy as well (financial diversification)
INSERT INTO signal_flow_strategy_tickers (strategy_id, ticker_symbol, weight, monitoring_config)
SELECT s.id, 'XLF', 0.05, '{"asset_type": "financials", "alternative_exposure": true}'::jsonb
FROM signal_flow_strategies s
WHERE s.slug = 'alternative-assets';

-- ===============================================
-- SEED: Sample signal data from current snapshot
-- ===============================================

-- Get strategy IDs for signal insertion
DO $$
DECLARE
    broad_market_id UUID;
    tech_growth_id UUID; 
    defensive_id UUID;
    international_id UUID;
    alternative_id UUID;
    current_ts TIMESTAMPTZ := '2026-02-23T20:57:13Z';
    fear_greed_score DECIMAL := 41.9243460764587;
BEGIN
    -- Get strategy IDs
    SELECT id INTO broad_market_id FROM signal_flow_strategies WHERE slug = 'broad-market';
    SELECT id INTO tech_growth_id FROM signal_flow_strategies WHERE slug = 'tech-growth';
    SELECT id INTO defensive_id FROM signal_flow_strategies WHERE slug = 'defensive-healthcare';
    SELECT id INTO international_id FROM signal_flow_strategies WHERE slug = 'international-emerging';
    SELECT id INTO alternative_id FROM signal_flow_strategies WHERE slug = 'alternative-assets';

    -- Insert sample signals (all HOLD from current snapshot)
    
    -- Broad Market signals
    INSERT INTO signal_flow_signals (strategy_id, ticker_symbol, signal_type, signal_strength, confidence, price_at_signal, current_price, regime, fear_greed_score, hold_days, signal_track, version, processing_metadata, timestamp) VALUES
    (broad_market_id, 'SPY', 'HOLD', 0, 0.8, 681.18, 681.18, 'bull', fear_greed_score, 15, 'none', '3.1.0', '{"role": "Momentum", "regime_days": 2, "regime_stage": "early"}'::jsonb, current_ts),
    (broad_market_id, 'QQQ', 'HOLD', 0, 1.1, 600.32, 600.32, 'sideways', fear_greed_score, 15, 'none', '3.1.0', '{"role": "Risk-On", "regime_days": 14, "regime_stage": "early"}'::jsonb, current_ts),
    (broad_market_id, 'IWM', 'HOLD', 0, 0.75, 260.0, 260.0, 'bull', fear_greed_score, 15, 'none', '3.1.0', '{"role": "All-Weather", "regime_days": 6, "regime_stage": "early"}'::jsonb, current_ts);

    -- Technology signals  
    INSERT INTO signal_flow_signals (strategy_id, ticker_symbol, signal_type, signal_strength, confidence, price_at_signal, current_price, regime, fear_greed_score, hold_days, signal_track, version, processing_metadata, timestamp) VALUES
    (tech_growth_id, 'XLK', 'HOLD', 0, 1.25, 138.23, 138.23, 'bear', fear_greed_score, 5, 'none', '3.1.0', '{"role": "Momentum", "regime_days": 12, "regime_stage": "early"}'::jsonb, current_ts),
    (tech_growth_id, 'XLC', 'HOLD', 0, 1.1, 115.24, 115.24, 'bull', fear_greed_score, 5, 'none', '3.1.0', '{"role": "All-Weather", "regime_days": 2, "regime_stage": "early"}'::jsonb, current_ts);

    -- International signals
    INSERT INTO signal_flow_signals (strategy_id, ticker_symbol, signal_type, signal_strength, confidence, price_at_signal, current_price, regime, fear_greed_score, hold_days, signal_track, version, processing_metadata, timestamp) VALUES
    (international_id, 'EFA', 'HOLD', 0, 1.3, 104.41, 104.41, 'bull', fear_greed_score, 30, 'none', '3.1.0', '{"role": "All-Weather", "regime_days": 59, "regime_stage": "early", "international_priority": true}'::jsonb, current_ts),
    (international_id, 'EEM', 'HOLD', 0, 1.3, 61.67, 61.67, 'bull', fear_greed_score, 30, 'none', '3.1.0', '{"role": "Cyclical", "regime_days": 43, "regime_stage": "early", "international_priority": true}'::jsonb, current_ts),
    (international_id, 'INDA', 'HOLD', 0, 1.3, 52.6, 52.6, 'sideways', fear_greed_score, 30, 'none', '3.1.0', '{"role": "All-Weather", "regime_days": 2, "regime_stage": "early", "international_priority": true}'::jsonb, current_ts);

    -- Alternative Assets signals  
    INSERT INTO signal_flow_signals (strategy_id, ticker_symbol, signal_type, signal_strength, confidence, price_at_signal, current_price, regime, fear_greed_score, hold_days, signal_track, version, processing_metadata, timestamp) VALUES
    (alternative_id, 'GLD', 'HOLD', 0, 1.2, 480.93, 480.93, 'bull', fear_greed_score, 15, 'none', '3.1.0', '{"role": "Cyclical", "regime_days": 4, "regime_stage": "early"}'::jsonb, current_ts),
    (alternative_id, 'TLT', 'HOLD', 0, 0.7, 89.69, 89.69, 'bull', fear_greed_score, 5, 'none', '3.1.0', '{"role": "Crisis Hedge", "regime_days": 12, "regime_stage": "early"}'::jsonb, current_ts),
    (alternative_id, 'VNQ', 'HOLD', 0, 0.8, 94.9, 94.9, 'bull', fear_greed_score, 10, 'none', '3.1.0', '{"role": "All-Weather", "regime_days": 13, "regime_stage": "early"}'::jsonb, current_ts);
END $$;

-- ===============================================
-- SEED: Fear & Greed snapshot
-- ===============================================

INSERT INTO signal_flow_fear_greed_history (score, rating, is_fear, is_extreme_fear, is_greed, is_extreme_greed, breakdown, source, timestamp) VALUES 
(41.9243460764587, 'fear', false, false, false, false, 
'{
    "aggregate_score": 48.0,
    "rating": "Neutral", 
    "components": [
        {"name": "Stock Price Momentum", "score": 62.0, "signal": "GREED", "description": "S&P 500 is +2.4% vs 125-day MA", "raw_value": 2.4},
        {"name": "Stock Price Strength", "score": 50.0, "signal": "NEUTRAL", "description": "0/4 near 52w high, 0/4 near 52w low", "raw_value": 0.0},
        {"name": "Stock Price Breadth", "score": 81.8, "signal": "GREED", "description": "9/11 sectors advancing", "raw_value": 31.8},
        {"name": "Put/Call Ratio", "score": 56.2, "signal": "NEUTRAL", "description": "VIX at 19.9 (proxy for options sentiment)", "raw_value": 19.9},
        {"name": "Junk Bond Demand", "score": 37.9, "signal": "NEUTRAL", "description": "HYG vs LQD 20d spread: -0.7%", "raw_value": -0.73},
        {"name": "Market Volatility", "score": 18.7, "signal": "FEAR", "description": "VIX 19.9 is +18.8% vs 50-day MA (16.7)", "raw_value": 18.8},
        {"name": "Safe Haven Demand", "score": 29.6, "signal": "FEAR", "description": "SPY vs TLT 20d: -2.0% (positive = stocks winning)", "raw_value": -2.04}
    ],
    "methodology": "Equal-weighted average of 7 market factors"
}'::jsonb, 
'cnn', '2026-02-23T20:57:13Z');

-- ===============================================
-- SEED: Current regime snapshot  
-- ===============================================

INSERT INTO signal_flow_regime_history (ticker_symbol, regime, regime_stage, regime_days, predicted_remaining_days, confidence, momentum_20d, ema_spread_pct, price, ema_20, ema_50, ema_200, above_ema_20, above_ema_50, above_ema_200, timestamp) VALUES
('SPY', 'bull', 'early', 2, 248, 40, 0.03, 1.75, 689.43, 687.61, 685.28, 659.5, true, true, true, '2026-02-23T20:57:13Z'),
('QQQ', 'sideways', 'early', 14, 31, 40, -2.23, 0.59, 608.81, 610.92, 613.68, 592.03, false, false, true, '2026-02-23T20:57:13Z');

-- ===============================================
-- SEED: Full state snapshot for visualization
-- ===============================================

INSERT INTO signal_flow_snapshots (snapshot_type, data, fear_greed_score, global_regime, active_signals_count, version, timestamp) VALUES 
('full_state', 
'{
    "summary": {"total_buy": 0, "total_hold": 24, "total_watch": 0},
    "global_regime": "bull",
    "fear_greed": {"current": 41.9243460764587, "rating": "fear"},
    "active_strategies": 5,
    "active_tickers": 24,
    "outliers": [
        {"symbol": "QQQ", "reason": "QQQ consolidating while market trending - watch for breakout"},
        {"symbol": "XLK", "reason": "XLK in BEAR regime while market is BULL - potential weakness"},
        {"symbol": "XLF", "reason": "XLF in BEAR regime while market is BULL - potential weakness"}
    ]
}'::jsonb,
41.9243460764587, 'bull', 24, '3.1.0', '2026-02-23T20:57:13Z');

-- ===============================================
-- SEED: Sample pairs data
-- ===============================================

INSERT INTO signal_flow_pairs_data (symbol1, symbol2, current_spread, mean_spread, std_deviation, z_score, is_diverged, divergence_direction, reverter, probability, timestamp) VALUES
('GDX', 'GLD', 0.2268, 0.2221, 0.0064, 0.74, false, 'normal', 'GDX', 0.85, '2026-02-23T20:57:13Z'),
('XLU', 'TLT', 0.5182, 0.5012, 0.0096, 1.77, false, 'normal', 'XLU', 0.80, '2026-02-23T20:57:13Z'),
('HYG', 'TLT', 0.9059, 0.9177, 0.0107, -1.10, false, 'normal', 'HYG', 0.82, '2026-02-23T20:57:13Z'),
('IWM', 'SPY', 0.3838, 0.3819, 0.0031, 0.62, false, 'normal', 'SPY', 0.78, '2026-02-23T20:57:13Z');