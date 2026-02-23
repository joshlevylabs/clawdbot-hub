# MRE Signal Flow Database Schema Specification

**Document:** A-178 Database Schema Design  
**Author:** James Truchard (CTIO)  
**Date:** 2026-02-23  
**Status:** Draft  

## Overview

The MRE Signal Flow system requires a hybrid database architecture combining graph relationships with high-frequency time-series data to support 676 tickers across 5 strategies with real-time visualization and attribution analysis.

## Architecture Decision

**Dual Database Approach:**
- **Neo4j**: Graph database for strategy-ticker relationships and signal flow paths
- **InfluxDB**: Time-series database for high-frequency price and signal data

## Neo4j Graph Schema

### Node Types

#### Strategy Node
```cypher
CREATE CONSTRAINT strategy_id FOR (s:Strategy) REQUIRE s.id IS UNIQUE;
```

**Properties:**
- `id`: String (unique identifier)
- `name`: String (human-readable name)
- `description`: String
- `active`: Boolean
- `created_at`: DateTime
- `last_signal`: DateTime

#### Ticker Node
```cypher
CREATE CONSTRAINT ticker_symbol FOR (t:Ticker) REQUIRE t.symbol IS UNIQUE;
```

**Properties:**
- `symbol`: String (unique ticker symbol)
- `name`: String (company name)
- `sector`: String
- `market_cap`: Float
- `active`: Boolean
- `last_price`: Float
- `last_updated`: DateTime

#### Signal Node
```cypher
CREATE CONSTRAINT signal_id FOR (s:Signal) REQUIRE s.id IS UNIQUE;
```

**Properties:**
- `id`: String (UUID)
- `type`: String (BUY, SELL, HOLD)
- `strength`: Float (0.0-1.0)
- `confidence`: Float (0.0-1.0)
- `timestamp`: DateTime
- `price_at_signal`: Float
- `volume`: Integer

### Relationship Types

#### MONITORS
```cypher
(:Strategy)-[r:MONITORS]->(:Ticker)
```

**Properties:**
- `since`: DateTime (when monitoring started)
- `weight`: Float (portfolio weight)
- `signals_count`: Integer
- `last_signal_type`: String

#### GENERATES
```cypher
(:Strategy)-[r:GENERATES]->(:Signal)
```

**Properties:**
- `processing_time_ms`: Integer
- `algorithm_version`: String

#### TARGETS
```cypher
(:Signal)-[r:TARGETS]->(:Ticker)
```

**Properties:**
- `entry_price`: Float
- `target_price`: Float (for BUY/SELL signals)
- `stop_loss`: Float
- `position_size`: Float

#### CORRELATES_WITH
```cypher
(:Ticker)-[r:CORRELATES_WITH]->(:Ticker)
```

**Properties:**
- `correlation`: Float (-1.0 to 1.0)
- `timeframe`: String (1D, 1W, 1M, 3M, 1Y)
- `last_calculated`: DateTime
- `sample_size`: Integer

### Sample Queries

#### Get all active signals for a strategy
```cypher
MATCH (s:Strategy {id: 'momentum_v2'})-[:GENERATES]->(sig:Signal)
WHERE sig.timestamp > datetime() - duration('PT1H')
RETURN sig
ORDER BY sig.timestamp DESC;
```

#### Find correlated tickers above threshold
```cypher
MATCH (t1:Ticker)-[r:CORRELATES_WITH]-(t2:Ticker)
WHERE r.correlation > 0.7 AND r.timeframe = '1M'
RETURN t1.symbol, t2.symbol, r.correlation
ORDER BY r.correlation DESC;
```

#### Strategy performance overview
```cypher
MATCH (s:Strategy)-[:MONITORS]->(t:Ticker)
MATCH (s)-[:GENERATES]->(sig:Signal)-[:TARGETS]->(t)
WHERE sig.timestamp > datetime() - duration('P7D')
RETURN s.name, 
       count(sig) as signals_count,
       avg(sig.strength) as avg_strength,
       collect(DISTINCT t.symbol) as tickers
ORDER BY signals_count DESC;
```

## InfluxDB Time-Series Schema

### Measurements

#### price_data
```
measurement: price_data
tags:
  - symbol: string (ticker symbol)
  - exchange: string
  - market_type: string (equity, crypto, forex)
fields:
  - open: float
  - high: float
  - low: float
  - close: float
  - volume: integer
  - vwap: float (volume-weighted average price)
timestamp: nanosecond precision
```

#### signal_events
```
measurement: signal_events
tags:
  - strategy_id: string
  - symbol: string
  - signal_type: string (BUY, SELL, HOLD)
fields:
  - strength: float (0.0-1.0)
  - confidence: float (0.0-1.0)
  - price_at_signal: float
  - processing_time_ms: integer
  - algorithm_version: string
timestamp: nanosecond precision
```

#### attribution_metrics
```
measurement: attribution_metrics
tags:
  - strategy_id: string
  - symbol: string
  - timeframe: string (1H, 1D, 1W, 1M)
fields:
  - win_rate: float (0.0-1.0)
  - avg_return: float
  - max_gain: float
  - max_loss: float
  - sharpe_ratio: float
  - max_drawdown: float
  - signals_count: integer
  - correlation_to_portfolio: float
timestamp: nanosecond precision (aggregated hourly)
```

#### portfolio_performance
```
measurement: portfolio_performance
tags:
  - portfolio_id: string
fields:
  - total_value: float
  - daily_pnl: float
  - unrealized_pnl: float
  - realized_pnl: float
  - cash_balance: float
  - positions_count: integer
timestamp: nanosecond precision
```

### Retention Policies

```sql
-- High-frequency tick data (1-minute resolution)
CREATE RETENTION POLICY tick_data ON mre_signals 
  DURATION 7d REPLICATION 1 DEFAULT;

-- Daily aggregated data (permanent retention)
CREATE RETENTION POLICY daily_data ON mre_signals 
  DURATION 0s REPLICATION 1;

-- Attribution metrics (1-year retention)
CREATE RETENTION POLICY attribution_data ON mre_signals 
  DURATION 365d REPLICATION 1;
```

### Sample Queries

#### Recent price action for ticker
```sql
SELECT time, close, volume 
FROM price_data 
WHERE symbol = 'AAPL' 
  AND time >= now() - 1h
ORDER BY time DESC;
```

#### Strategy performance over timeframe
```sql
SELECT 
  mean(win_rate) as avg_win_rate,
  mean(avg_return) as avg_return,
  mean(sharpe_ratio) as avg_sharpe,
  max(max_drawdown) as worst_drawdown
FROM attribution_metrics 
WHERE strategy_id = 'momentum_v2' 
  AND timeframe = '1D'
  AND time >= now() - 30d
GROUP BY time(1d);
```

#### Signal frequency analysis
```sql
SELECT 
  count(*) as signal_count,
  mean(strength) as avg_strength
FROM signal_events 
WHERE strategy_id = 'momentum_v2'
  AND time >= now() - 24h
GROUP BY time(1h), signal_type;
```

## Cross-Database Query Patterns

### Graph + Time-Series Joins

The application layer will need to coordinate queries across both databases:

1. **Strategy Performance Dashboard**
   - Neo4j: Get strategy metadata and ticker relationships
   - InfluxDB: Get recent attribution metrics
   - Join: Combine relationship data with performance metrics

2. **Ticker Detail View**
   - Neo4j: Get correlations and strategy relationships
   - InfluxDB: Get price history and signal events
   - Join: Present comprehensive ticker analysis

3. **Signal Attribution Analysis**
   - Neo4j: Get signal relationships and target prices
   - InfluxDB: Get actual price movements post-signal
   - Join: Calculate signal effectiveness

### Example Application Query Flow

```python
# Get strategy overview (hybrid query)
def get_strategy_overview(strategy_id, timeframe='1D'):
    # Neo4j: Get strategy metadata and relationships
    neo4j_query = """
    MATCH (s:Strategy {id: $strategy_id})-[:MONITORS]->(t:Ticker)
    RETURN s, collect(t.symbol) as tickers
    """
    strategy_data = neo4j_session.run(neo4j_query, strategy_id=strategy_id)
    
    # InfluxDB: Get performance metrics
    influx_query = """
    SELECT 
      mean(win_rate) as avg_win_rate,
      mean(avg_return) as avg_return,
      count(signals_count) as total_signals
    FROM attribution_metrics 
    WHERE strategy_id = $strategy_id 
      AND timeframe = $timeframe
      AND time >= now() - 30d
    """
    performance_data = influx_client.query(influx_query)
    
    # Combine results
    return {
        'strategy': strategy_data,
        'performance': performance_data,
        'tickers': strategy_data['tickers']
    }
```

## Performance Considerations

### Neo4j Optimizations
- Index on timestamp fields for recent data queries
- Composite indexes on (strategy_id, timestamp) for signal queries
- Regular CALL db.stats.collect() to maintain statistics

### InfluxDB Optimizations
- Shard by symbol tag for parallel query execution
- Pre-aggregate attribution metrics hourly to reduce query load
- Use continuous queries for rolling calculations

### Data Consistency
- Application-level transaction coordination
- Eventual consistency acceptable for visualization (< 5s lag)
- Strong consistency required for trading decisions

## Scaling Strategy

### Horizontal Scaling
- Neo4j: Read replicas for query workload distribution
- InfluxDB: Clustering for write throughput (3-node minimum)

### Data Lifecycle
- Archive old signal events to cold storage after 1 year
- Maintain graph relationships indefinitely
- Compress attribution metrics after 90 days

## Migration Path

1. **Phase 1**: Implement InfluxDB schema with basic measurements
2. **Phase 2**: Deploy Neo4j with core node/relationship types
3. **Phase 3**: Build application-layer query coordination
4. **Phase 4**: Add advanced analytics and correlation calculations

This schema design supports the real-time requirements while providing the analytical depth needed for attribution analysis and portfolio optimization.