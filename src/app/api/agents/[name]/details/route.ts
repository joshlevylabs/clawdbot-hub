import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: agentId } = await params;
    
    // Look up by ID (the URL param is the agent ID like "chris-vermeulen")
    const { data: config, error: configError } = await supabase
      .from('agent_configs')
      .select('*')
      .eq('id', agentId)
      .single();

    if (configError || !config) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Fetch agent memories with count
    const { data: memories, count: memoryCount } = await supabase
      .from('agent_memories')
      .select('*', { count: 'exact' })
      .eq('agent_id', config.id)
      .order('created_at', { ascending: false })
      .limit(50);

    // Fetch agent conversations with message counts
    const { data: conversations, count: conversationCount } = await supabase
      .from('agent_conversations')
      .select('*, agent_messages(count)', { count: 'exact' })
      .eq('agent_id', config.id)
      .order('updated_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      config,
      memories: memories || [],
      memoryCount: memoryCount || 0,
      conversations: conversations || [],
      conversationCount: conversationCount || 0,
    });

  } catch (error) {
    console.error('Error fetching agent details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
