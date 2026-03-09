import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isAuthenticated } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await isAuthenticated(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agent_id = searchParams.get('agent_id');

    let query = supabase.from('agent_memories').select('*');
    
    if (agent_id) {
      query = query.eq('agent_id', agent_id);
    }

    const { data: memories, error } = await query;

    if (error) {
      console.error('Error fetching agent memories for stats:', error);
      return NextResponse.json({ error: 'Failed to fetch memory stats' }, { status: 500 });
    }

    // Calculate statistics
    const stats = {
      total_memories: memories.length,
      total_embeddings: memories.filter(m => m.embedding).length,
      avg_importance: memories.length > 0 
        ? memories.reduce((sum, m) => sum + (m.importance || 0), 0) / memories.length
        : 0,
      by_kind: {} as Record<string, number>,
      by_agent: {} as Record<string, number>,
    };

    // Count by kind
    memories.forEach(memory => {
      if (memory.kind) {
        stats.by_kind[memory.kind] = (stats.by_kind[memory.kind] || 0) + 1;
      }
    });

    // Count by agent (only if not filtering by specific agent)
    if (!agent_id) {
      memories.forEach(memory => {
        if (memory.agent_id) {
          stats.by_agent[memory.agent_id] = (stats.by_agent[memory.agent_id] || 0) + 1;
        }
      });
    }

    // Add additional stats
    const additionalStats = {
      with_summaries: memories.filter(m => m.summary && m.summary.trim()).length,
      with_tags: memories.filter(m => m.tags && m.tags.length > 0).length,
      recalled_memories: memories.filter(m => m.recalled_count > 0).length,
      recent_memories: memories.filter(m => {
        const createdDate = new Date(m.created_at);
        const dayAgo = new Date();
        dayAgo.setDate(dayAgo.getDate() - 1);
        return createdDate > dayAgo;
      }).length,
    };

    return NextResponse.json({ 
      ...stats,
      ...additionalStats,
      agent_id: agent_id || 'all'
    });
  } catch (error) {
    console.error('Error in GET /api/agent-memories/stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}