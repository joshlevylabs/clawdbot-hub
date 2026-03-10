import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { 
  logMarketObservation, 
  logSignalGenerated, 
  logReflection, 
  logError, 
  logTradeExecution,
  storeMemory 
} from '@/lib/agent-memory';

/**
 * POST /api/agent-memories/observe
 * 
 * Unified endpoint for agents to self-report observations, decisions, and reflections.
 * This is Layer 3 of the memory system — episodic memory that builds over time.
 * 
 * Body: {
 *   agent_id: string (required)
 *   type: 'observation' | 'signal' | 'reflection' | 'error' | 'execution' | 'raw'
 *   ... type-specific fields
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await isAuthenticated(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { agent_id, type } = body;

    if (!agent_id || !type) {
      return NextResponse.json({ 
        error: 'agent_id and type are required',
        valid_types: ['observation', 'signal', 'reflection', 'error', 'execution', 'raw'],
      }, { status: 400 });
    }

    let result;

    switch (type) {
      case 'observation':
        if (!body.observation) {
          return NextResponse.json({ error: 'observation text is required' }, { status: 400 });
        }
        result = await logMarketObservation({
          agentId: agent_id,
          observation: body.observation,
          symbols: body.symbols,
          regime: body.regime,
          significance: body.significance || 'medium',
        });
        break;

      case 'signal':
        if (!body.symbol || !body.direction || !body.analysis) {
          return NextResponse.json({ error: 'symbol, direction, and analysis are required' }, { status: 400 });
        }
        result = await logSignalGenerated({
          agentId: agent_id,
          symbol: body.symbol,
          direction: body.direction,
          conviction: body.conviction || 0.5,
          analysis: body.analysis,
          strategies: body.strategies || [],
        });
        break;

      case 'reflection':
        if (!body.reflection || !body.topic) {
          return NextResponse.json({ error: 'reflection and topic are required' }, { status: 400 });
        }
        result = await logReflection({
          agentId: agent_id,
          reflection: body.reflection,
          topic: body.topic,
          trigger: body.trigger,
        });
        break;

      case 'error':
        if (!body.error || !body.context) {
          return NextResponse.json({ error: 'error and context are required' }, { status: 400 });
        }
        result = await logError({
          agentId: agent_id,
          error: body.error,
          context: body.context,
          lesson: body.lesson,
        });
        break;

      case 'execution':
        if (!body.symbol || !body.action || !body.quantity || !body.price) {
          return NextResponse.json({ error: 'symbol, action, quantity, and price are required' }, { status: 400 });
        }
        result = await logTradeExecution({
          agentId: agent_id,
          symbol: body.symbol,
          action: body.action,
          quantity: body.quantity,
          price: body.price,
          orderId: body.orderId,
          pnl: body.pnl,
        });
        break;

      case 'raw':
        if (!body.content || !body.kind) {
          return NextResponse.json({ error: 'content and kind are required' }, { status: 400 });
        }
        result = await storeMemory({
          agent_id,
          kind: body.kind,
          content: body.content,
          summary: body.summary,
          source: body.source,
          source_metadata: body.metadata,
          importance: body.importance,
          tags: body.tags,
        });
        break;

      default:
        return NextResponse.json({ 
          error: `Unknown type: ${type}`,
          valid_types: ['observation', 'signal', 'reflection', 'error', 'execution', 'raw'],
        }, { status: 400 });
    }

    return NextResponse.json({
      success: result.success,
      memory_id: result.id,
      type,
      agent_id,
      message: result.success ? `${type} recorded for ${agent_id}` : result.error,
    });

  } catch (error: any) {
    console.error('Error in POST /api/agent-memories/observe:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
