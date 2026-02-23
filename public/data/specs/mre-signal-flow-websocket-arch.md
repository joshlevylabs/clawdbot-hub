# MRE Signal Flow WebSocket Architecture Specification

**Document:** A-179 WebSocket Infrastructure Design  
**Author:** Elon Musk (CTO)  
**Date:** 2026-02-23  
**Status:** Draft  

## Overview

The MRE Signal Flow system requires a multi-tiered WebSocket infrastructure capable of handling real-time updates for 676 tickers across 5 strategies without overwhelming client browsers. The architecture implements differential refresh rates, intelligent message buffering, and robust fallback mechanisms.

## Architecture Principles

1. **Tiered Refresh Rates**: Different data types update at appropriate frequencies
2. **Client Subscription Management**: Clients only receive data they're actively viewing
3. **Burst Protection**: Message buffering prevents client overload during high-volume periods
4. **Graceful Degradation**: Fallback to polling if WebSocket connections fail
5. **Horizontal Scaling**: Redis pub/sub enables multiple server instances

## System Components

### 1. Data Publishers

#### Market Data Publisher
```typescript
interface TickDataPublisher {
  frequency: 100ms;
  topics: ['tick:SYMBOL'];
  payload: {
    symbol: string;
    price: number;
    volume: number;
    timestamp: number;
  };
}
```

#### Signal Publisher  
```typescript
interface SignalPublisher {
  frequency: 1000ms;
  topics: ['signals:STRATEGY_ID', 'signals:STRATEGY_ID:SYMBOL'];
  payload: {
    strategyId: string;
    symbol: string;
    signal: 'BUY' | 'SELL' | 'HOLD';
    strength: number; // 0.0-1.0
    confidence: number; // 0.0-1.0
    timestamp: number;
  };
}
```

#### Attribution Publisher
```typescript
interface AttributionPublisher {
  frequency: 5000ms;
  topics: ['attribution:STRATEGY_ID', 'attribution:global'];
  payload: {
    strategyId: string;
    timeframe: '1H' | '1D' | '1W' | '1M';
    metrics: {
      winRate: number;
      avgReturn: number;
      sharpe: number;
      maxDrawdown: number;
      signalsCount: number;
    };
    timestamp: number;
  };
}
```

### 2. Redis Pub/Sub Layer

#### Topic Hierarchy
```
mre:tick:{symbol}           # 100ms price ticks
mre:signals:{strategy}      # 1s strategy signals  
mre:signals:{strategy}:{symbol} # 1s ticker-specific signals
mre:attribution:{strategy}  # 5s attribution metrics
mre:attribution:global      # 5s portfolio-wide metrics
mre:heartbeat              # 30s system health
```

#### Message Format
```json
{
  "topic": "mre:signals:momentum_v2:AAPL",
  "timestamp": 1677123456789,
  "sequence": 12345,
  "data": {
    "symbol": "AAPL",
    "signal": "BUY",
    "strength": 0.85,
    "confidence": 0.72,
    "price": 152.34
  },
  "metadata": {
    "version": "1.0",
    "source": "signal-engine-v2"
  }
}
```

### 3. WebSocket Server Architecture

#### Connection Manager
```typescript
class ConnectionManager {
  private connections: Map<string, ClientConnection>;
  private subscriptions: Map<string, Set<string>>; // topic -> clientIds
  private rateLimiters: Map<string, RateLimiter>;

  // Client connection lifecycle
  async handleConnection(ws: WebSocket, clientId: string): Promise<void>;
  async handleDisconnection(clientId: string): Promise<void>;
  
  // Subscription management
  async subscribe(clientId: string, topics: string[]): Promise<void>;
  async unsubscribe(clientId: string, topics: string[]): Promise<void>;
  
  // Message broadcasting with rate limiting
  async broadcast(topic: string, message: object): Promise<void>;
  async broadcastToClient(clientId: string, message: object): Promise<void>;
}
```

#### Rate Limiter Implementation
```typescript
class TieredRateLimiter {
  private tiers = {
    tick: { interval: 100, maxMessages: 10 },      // 100ms, burst of 10
    signal: { interval: 1000, maxMessages: 5 },    // 1s, burst of 5  
    attribution: { interval: 5000, maxMessages: 3 } // 5s, burst of 3
  };
  
  canSend(clientId: string, messageType: string): boolean {
    // Token bucket algorithm implementation
    const bucket = this.getBucket(clientId, messageType);
    return bucket.consume(1);
  }
  
  private getBucket(clientId: string, messageType: string): TokenBucket {
    const tier = this.tiers[messageType];
    return new TokenBucket(tier.maxMessages, tier.interval);
  }
}
```

### 4. Client Subscription Model

#### Subscription Categories
```typescript
enum SubscriptionType {
  PORTFOLIO_OVERVIEW = 'portfolio',    // All strategies, low frequency
  STRATEGY_DETAIL = 'strategy:{id}',   // Single strategy, medium frequency  
  TICKER_DETAIL = 'ticker:{symbol}',   // Single ticker, high frequency
  SIGNAL_FEED = 'signals:live'         // Live signal stream, medium frequency
}
```

#### Dynamic Subscription Management
```typescript
interface ClientSubscriptionState {
  clientId: string;
  activeView: 'portfolio' | 'strategy' | 'ticker' | 'signals';
  subscriptions: {
    ticks: string[];      // Ticker symbols for price updates
    signals: string[];    // Strategy IDs for signal updates
    attribution: string[]; // Strategy IDs for attribution updates
  };
  preferences: {
    maxUpdateFrequency: number; // Client-specified rate limit
    dataCompression: boolean;   // Enable gzip for large payloads
  };
}
```

### 5. Message Buffering & Queuing

#### Buffer Strategy
```typescript
class MessageBuffer {
  private buffers: Map<string, TimedBuffer>; // clientId -> buffer
  
  // Add message to client-specific buffer
  enqueue(clientId: string, message: WebSocketMessage): void {
    const buffer = this.getBuffer(clientId);
    
    // Implement message deduplication
    if (buffer.isDuplicate(message)) return;
    
    // Apply message compression for similar updates
    const compressed = buffer.compress(message);
    buffer.add(compressed);
    
    // Trigger flush if buffer is full or time threshold reached
    if (buffer.shouldFlush()) {
      this.flush(clientId);
    }
  }
  
  // Flush buffered messages to client
  private flush(clientId: string): void {
    const buffer = this.getBuffer(clientId);
    const messages = buffer.drain();
    
    // Send as batch if multiple messages
    const payload = messages.length > 1 
      ? this.createBatchMessage(messages)
      : messages[0];
      
    this.sendToClient(clientId, payload);
  }
}
```

#### Message Deduplication
```typescript
class MessageDeduplicator {
  // Remove redundant price updates (keep only latest)
  dedupePriceTicks(messages: TickMessage[]): TickMessage[] {
    const latest = new Map<string, TickMessage>();
    messages.forEach(msg => {
      latest.set(msg.symbol, msg);
    });
    return Array.from(latest.values());
  }
  
  // Merge signal updates for same strategy-ticker pair
  dedupeSignals(messages: SignalMessage[]): SignalMessage[] {
    const byKey = new Map<string, SignalMessage>();
    messages.forEach(msg => {
      const key = `${msg.strategyId}:${msg.symbol}`;
      const existing = byKey.get(key);
      
      // Keep signal with highest confidence
      if (!existing || msg.confidence > existing.confidence) {
        byKey.set(key, msg);
      }
    });
    return Array.from(byKey.values());
  }
}
```

### 6. Fallback Polling System

#### Polling Fallback Logic
```typescript
class PollingFallback {
  private pollingClients: Set<string>;
  private pollingIntervals: Map<string, NodeJS.Timeout>;
  
  // Activate polling for client when WebSocket fails
  activateFallback(clientId: string): void {
    if (this.pollingClients.has(clientId)) return;
    
    this.pollingClients.add(clientId);
    
    // Start polling at reduced frequency (2s instead of real-time)
    const interval = setInterval(() => {
      this.pollForClient(clientId);
    }, 2000);
    
    this.pollingIntervals.set(clientId, interval);
  }
  
  private async pollForClient(clientId: string): Promise<void> {
    const subscriptions = this.getClientSubscriptions(clientId);
    
    // Fetch latest data for subscribed topics
    const updates = await Promise.all([
      this.fetchPriceUpdates(subscriptions.ticks),
      this.fetchSignalUpdates(subscriptions.signals),
      this.fetchAttributionUpdates(subscriptions.attribution)
    ]);
    
    // Send combined update via HTTP/SSE
    const payload = this.combineUpdates(updates);
    await this.sendPollingUpdate(clientId, payload);
  }
}
```

### 7. System Health & Monitoring

#### Health Check Endpoints
```typescript
class HealthMonitor {
  // WebSocket server health
  @Get('/health/websocket')
  getWebSocketHealth(): HealthStatus {
    return {
      status: 'healthy',
      connections: this.connectionManager.getConnectionCount(),
      subscriptions: this.connectionManager.getSubscriptionCount(),
      messageRate: this.getMessageRate(),
      memoryUsage: process.memoryUsage(),
      redisStatus: this.checkRedisConnection()
    };
  }
  
  // Message queue health  
  @Get('/health/messaging')
  getMessagingHealth(): MessageHealth {
    return {
      redisConnections: this.redis.status,
      publishRate: this.getPublishRate(),
      consumerLag: this.getConsumerLag(),
      deadLetterQueue: this.getDLQSize()
    };
  }
}
```

#### Performance Metrics
```typescript
interface SystemMetrics {
  connections: {
    active: number;
    total: number;
    byType: Record<SubscriptionType, number>;
  };
  messages: {
    publishedPerSecond: number;
    deliveredPerSecond: number;
    bufferedCount: number;
    droppedCount: number;
  };
  latency: {
    publishToDelivery: number; // End-to-end latency
    redisRoundTrip: number;    // Redis pub/sub latency
    webSocketSend: number;     // WebSocket send latency
  };
  resources: {
    memoryUsage: number;
    cpuUsage: number;
    networkIO: number;
  };
}
```

### 8. Scaling Architecture

#### Horizontal Scaling with Redis
```typescript
// Multi-instance deployment configuration
class ClusterManager {
  private readonly instances = [
    'ws-server-1', 'ws-server-2', 'ws-server-3'
  ];
  
  // Distribute clients across instances using consistent hashing
  getInstanceForClient(clientId: string): string {
    const hash = this.hashClientId(clientId);
    const index = hash % this.instances.length;
    return this.instances[index];
  }
  
  // Handle instance failover
  async handleInstanceFailure(failedInstance: string): Promise<void> {
    const affectedClients = await this.getClientsForInstance(failedInstance);
    
    // Redistribute clients to healthy instances
    for (const clientId of affectedClients) {
      const newInstance = this.getNextHealthyInstance();
      await this.migrateClient(clientId, newInstance);
    }
  }
}
```

#### Load Balancing Strategy
- **Sticky Sessions**: Route clients to same instance for subscription continuity
- **Health-Based Routing**: Avoid overloaded instances
- **Geographic Distribution**: Route clients to nearest server instance

### 9. Error Handling & Recovery

#### Connection Recovery
```typescript
class ConnectionRecovery {
  // Client-side reconnection logic
  async handleDisconnection(ws: WebSocket): Promise<void> {
    let retryCount = 0;
    const maxRetries = 5;
    const backoffMultiplier = 1.5;
    
    while (retryCount < maxRetries) {
      const delay = Math.min(1000 * Math.pow(backoffMultiplier, retryCount), 30000);
      await this.sleep(delay);
      
      try {
        await this.reconnect();
        await this.resubscribe(); // Restore previous subscriptions
        break;
      } catch (error) {
        retryCount++;
        console.warn(`Reconnection attempt ${retryCount} failed:`, error);
      }
    }
    
    // Fall back to polling if WebSocket reconnection fails
    if (retryCount >= maxRetries) {
      this.activatePollingFallback();
    }
  }
}
```

### 10. Implementation Phases

#### Phase 1: Core Infrastructure (Week 1-2)
- Redis pub/sub setup with topic hierarchy
- Basic WebSocket server with connection management
- Simple message broadcasting without rate limiting

#### Phase 2: Rate Limiting & Buffering (Week 3-4)  
- Implement tiered rate limiting system
- Add message buffering and deduplication
- Client subscription management

#### Phase 3: Fallback & Monitoring (Week 5-6)
- Polling fallback system
- Health monitoring and metrics
- Load testing and performance optimization  

#### Phase 4: Production Scaling (Week 7-8)
- Multi-instance deployment
- Advanced error handling and recovery
- Performance tuning for 676 ticker load

This architecture ensures reliable, real-time data delivery while protecting clients from overwhelming update frequencies and providing robust fallback mechanisms.