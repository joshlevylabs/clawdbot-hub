/**
 * Agent Memory Layer 3 — Observations, Decisions, and Reflections
 * 
 * Auto-captures agent reasoning at key decision points:
 * - Trade proposals (why an agent wants to buy/sell)
 * - Trade executions (what happened, at what price)
 * - Signal generation (what the agent saw in the data)
 * - Market observations (regime changes, pattern recognition)
 * - Errors and lessons (what went wrong and why)
 */

import { supabase } from './supabase';

interface MemoryEntry {
  agent_id: string;
  kind: 'observation' | 'decision' | 'reflection' | 'error' | 'episode';
  content: string;
  summary?: string;
  source?: string;
  source_metadata?: Record<string, unknown>;
  importance?: number;
  tags?: string[];
}

/**
 * Store a memory with optional embedding generation.
 * Embedding is generated async to not block the caller.
 */
export async function storeMemory(entry: MemoryEntry): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const summary = entry.summary || (entry.content.length > 150 ? entry.content.slice(0, 150) + '...' : entry.content);
    
    const { data, error } = await supabase
      .from('agent_memories')
      .insert({
        agent_id: entry.agent_id,
        user_id: 'system',
        kind: entry.kind,
        content: entry.content,
        summary,
        source: entry.source || 'auto-capture',
        source_metadata: entry.source_metadata || {},
        importance: entry.importance || 0.5,
        tags: entry.tags || [entry.kind, 'auto'],
        recalled_count: 0,
      })
      .select('id')
      .single();

    if (error) {
      console.error(`[agent-memory] Store failed for ${entry.agent_id}:`, error.message);
      return { success: false, error: error.message };
    }

    // Fire-and-forget embedding generation
    generateEmbeddingAsync(data.id, entry.content).catch(err => 
      console.error(`[agent-memory] Embedding failed for ${data.id}:`, err)
    );

    return { success: true, id: data.id };
  } catch (err: any) {
    console.error('[agent-memory] Unexpected error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Generate and store embedding for a memory entry (async, non-blocking)
 */
async function generateEmbeddingAsync(memoryId: string, content: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('[agent-memory] No OPENAI_API_KEY — skipping embedding');
    return;
  }

  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: content.slice(0, 8000),
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI API error: ${res.status}`);
    }

    const data = await res.json();
    const embedding = data.data[0].embedding;

    await supabase
      .from('agent_memories')
      .update({ embedding: JSON.stringify(embedding) })
      .eq('id', memoryId);

  } catch (err) {
    console.error(`[agent-memory] Embedding generation failed for ${memoryId}:`, err);
  }
}

// ── Convenience helpers for common memory types ──────────────

/**
 * Log a trade proposal — why an agent wants to enter/exit a position
 */
export function logTradeProposal(params: {
  agentId: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  reasoning: string;
  confidence: number;
  price?: number;
  strategies?: string[];
}) {
  const content = [
    `TRADE PROPOSAL: ${params.action} ${params.symbol}`,
    `Reasoning: ${params.reasoning}`,
    params.price ? `Price at proposal: $${params.price}` : '',
    `Confidence: ${(params.confidence * 100).toFixed(0)}%`,
    params.strategies?.length ? `Strategies agreeing: ${params.strategies.join(', ')}` : '',
  ].filter(Boolean).join('\n');

  return storeMemory({
    agent_id: params.agentId,
    kind: 'decision',
    content,
    summary: `${params.action} ${params.symbol} — ${params.reasoning.slice(0, 80)}`,
    source: 'auto-trade',
    source_metadata: {
      symbol: params.symbol,
      action: params.action,
      confidence: params.confidence,
      price: params.price,
      timestamp: new Date().toISOString(),
    },
    importance: params.confidence > 0.8 ? 0.8 : 0.6,
    tags: ['decision', 'trade', params.action.toLowerCase(), params.symbol],
  });
}

/**
 * Log a trade execution — what actually happened
 */
export function logTradeExecution(params: {
  agentId: string;
  symbol: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  orderId?: string;
  pnl?: number;
}) {
  const content = [
    `TRADE EXECUTED: ${params.action} ${params.quantity} shares of ${params.symbol} at $${params.price}`,
    params.orderId ? `Order ID: ${params.orderId}` : '',
    params.pnl !== undefined ? `Realized P&L: $${params.pnl.toFixed(2)}` : '',
  ].filter(Boolean).join('\n');

  return storeMemory({
    agent_id: params.agentId,
    kind: 'episode',
    content,
    summary: `${params.action} ${params.quantity}x ${params.symbol} @ $${params.price}`,
    source: 'trade-execution',
    source_metadata: {
      symbol: params.symbol,
      action: params.action,
      quantity: params.quantity,
      price: params.price,
      orderId: params.orderId,
      pnl: params.pnl,
      timestamp: new Date().toISOString(),
    },
    importance: params.pnl !== undefined ? (Math.abs(params.pnl) > 1000 ? 0.9 : 0.7) : 0.6,
    tags: ['episode', 'execution', params.action.toLowerCase(), params.symbol],
  });
}

/**
 * Log a market observation — pattern recognition, regime detection
 */
export function logMarketObservation(params: {
  agentId: string;
  observation: string;
  symbols?: string[];
  regime?: string;
  significance: 'low' | 'medium' | 'high' | 'critical';
}) {
  const importanceMap = { low: 0.3, medium: 0.5, high: 0.7, critical: 0.9 };

  return storeMemory({
    agent_id: params.agentId,
    kind: 'observation',
    content: params.observation,
    summary: params.observation.slice(0, 150),
    source: 'market-analysis',
    source_metadata: {
      symbols: params.symbols,
      regime: params.regime,
      significance: params.significance,
      timestamp: new Date().toISOString(),
    },
    importance: importanceMap[params.significance],
    tags: ['observation', 'market', params.significance, ...(params.symbols || [])],
  });
}

/**
 * Log a signal generation event
 */
export function logSignalGenerated(params: {
  agentId: string;
  symbol: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  conviction: number;
  analysis: string;
  strategies: string[];
}) {
  const content = [
    `SIGNAL: ${params.direction.toUpperCase()} on ${params.symbol}`,
    `Conviction: ${(params.conviction * 100).toFixed(0)}%`,
    `Analysis: ${params.analysis}`,
    `Strategies: ${params.strategies.join(', ')}`,
  ].join('\n');

  return storeMemory({
    agent_id: params.agentId,
    kind: 'observation',
    content,
    summary: `${params.direction} ${params.symbol} (${(params.conviction * 100).toFixed(0)}%)`,
    source: 'signal-generation',
    source_metadata: {
      symbol: params.symbol,
      direction: params.direction,
      conviction: params.conviction,
      strategies: params.strategies,
      timestamp: new Date().toISOString(),
    },
    importance: params.conviction > 0.7 ? 0.7 : 0.5,
    tags: ['signal', params.direction, params.symbol],
  });
}

/**
 * Log an error or lesson learned
 */
export function logError(params: {
  agentId: string;
  error: string;
  context: string;
  lesson?: string;
}) {
  const content = [
    `ERROR: ${params.error}`,
    `Context: ${params.context}`,
    params.lesson ? `Lesson: ${params.lesson}` : '',
  ].filter(Boolean).join('\n');

  return storeMemory({
    agent_id: params.agentId,
    kind: 'error',
    content,
    summary: params.error.slice(0, 150),
    source: 'error-capture',
    source_metadata: {
      context: params.context,
      lesson: params.lesson,
      timestamp: new Date().toISOString(),
    },
    importance: 0.8, // Errors are always important to remember
    tags: ['error', 'lesson'],
  });
}

/**
 * Log a reflection — agent's self-assessment or strategic thinking
 */
export function logReflection(params: {
  agentId: string;
  reflection: string;
  topic: string;
  trigger?: string;
}) {
  return storeMemory({
    agent_id: params.agentId,
    kind: 'reflection',
    content: params.reflection,
    summary: `[${params.topic}] ${params.reflection.slice(0, 120)}`,
    source: params.trigger || 'self-reflection',
    source_metadata: {
      topic: params.topic,
      trigger: params.trigger,
      timestamp: new Date().toISOString(),
    },
    importance: 0.6,
    tags: ['reflection', params.topic],
  });
}
