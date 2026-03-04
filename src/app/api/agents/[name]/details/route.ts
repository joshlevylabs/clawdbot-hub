import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const agentName = params.name;
    
    // First, find the agent config to get the agent ID
    const { data: config, error: configError } = await supabase
      .from('agent_configs')
      .select('*')
      .eq('name', agentName)
      .single();

    if (configError || !config) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Fetch agent memories with count
    const { data: memories, count: memoryCount, error: memoriesError } = await supabase
      .from('agent_memories')
      .select('*', { count: 'exact' })
      .eq('agent_id', config.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (memoriesError) {
      console.error('Error fetching memories:', memoriesError);
    }

    // Fetch agent conversations with message counts
    const { data: conversations, count: conversationCount, error: conversationsError } = await supabase
      .from('agent_conversations')
      .select('*, agent_messages(count)', { count: 'exact' })
      .eq('agent_id', config.id)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError);
    }

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