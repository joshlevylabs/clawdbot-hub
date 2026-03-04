import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {

    // Get total counts
    const [
      { count: totalAgents },
      { count: totalConversations },
      { count: totalMessages },
      { count: totalMemories }
    ] = await Promise.all([
      supabase.from('agent_configs').select('*', { count: 'exact', head: true }).eq('endpoint_enabled', true),
      supabase.from('agent_conversations').select('*', { count: 'exact', head: true }),
      supabase.from('agent_messages').select('*', { count: 'exact', head: true }),
      supabase.from('agent_memories').select('*', { count: 'exact', head: true })
    ])

    // Get per-agent stats
    const { data: agents } = await supabase
      .from('agent_configs')
      .select('agent_id')
      .eq('endpoint_enabled', true)

    const perAgent: Record<string, {
      conversations: number
      messages: number
      memories: number
      lastActivity: string | null
    }> = {}

    if (agents) {
      for (const agent of agents) {
        const agentId = agent.agent_id

        // Get conversation count
        const { count: convCount } = await supabase
          .from('agent_conversations')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', agentId)

        // Get message count  
        const { count: msgCount } = await supabase
          .from('agent_messages')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', agentId)

        // Get memory count
        const { count: memCount } = await supabase
          .from('agent_memories')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', agentId)

        // Get last activity (most recent conversation updated_at)
        const { data: lastConv } = await supabase
          .from('agent_conversations')
          .select('updated_at')
          .eq('agent_id', agentId)
          .order('updated_at', { ascending: false })
          .limit(1)

        perAgent[agentId] = {
          conversations: convCount || 0,
          messages: msgCount || 0,
          memories: memCount || 0,
          lastActivity: lastConv?.[0]?.updated_at || null
        }
      }
    }

    return NextResponse.json({
      totalAgents: totalAgents || 0,
      totalConversations: totalConversations || 0,
      totalMessages: totalMessages || 0,
      totalMemories: totalMemories || 0,
      perAgent
    })

  } catch (error) {
    console.error('Error fetching agent stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agent stats' },
      { status: 500 }
    )
  }
}