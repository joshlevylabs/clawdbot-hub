import { NextRequest, NextResponse } from 'next/server';
import { faithSupabase, isFaithSupabaseConfigured } from '@/lib/faith-supabase';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// OPTIONS: CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// Authenticate via Supabase JWT (mobile app) or Hub session (admin)
async function authenticateRequest(request: NextRequest): Promise<string | null> {
  // Try Supabase JWT from Authorization header (mobile app)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_PAPER_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseKey = process.env.NEXT_PUBLIC_PAPER_SUPABASE_ANON_KEY || '';
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user?.id) return user.id;
      }
    } catch (e) {
      console.error('Supabase JWT auth failed:', e);
    }
  }

  // Fall back to Hub admin session
  const session = await getSession();
  if (session.authenticated && session.userId) return session.userId;

  return null;
}

// POST: Send message to AI guide and get response
export async function POST(request: NextRequest) {
  if (!isFaithSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500, headers: corsHeaders });
  }

  // Check authentication (Supabase JWT or Hub session)
  const userId = await authenticateRequest(request);
  if (!userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { guideId, message, conversationId } = body;

    if (!guideId || !message) {
      return NextResponse.json({ error: 'guideId and message are required' }, { status: 400, headers: corsHeaders });
    }

    // userId already authenticated above

    // 1. Load guide persona from faith_guides
    const { data: guide, error: guideError } = await faithSupabase
      .from('faith_guides')
      .select('*')
      .eq('id', guideId)
      .single();

    if (guideError || !guide) {
      return NextResponse.json({ error: 'Guide not found' }, { status: 404, headers: corsHeaders });
    }

    let currentConversationId = conversationId;

    // 2. If no conversationId, create new faith_conversation
    if (!currentConversationId) {
      const { data: newConversation, error: conversationError } = await faithSupabase
        .from('faith_conversations')
        .insert({
          user_id: userId,
          guide_id: guideId,
          title: `Conversation with ${guide.display_name}`
        })
        .select('id')
        .single();

      if (conversationError) {
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500, headers: corsHeaders });
      }

      currentConversationId = newConversation.id;
    } else {
      // Verify user owns this conversation
      const { data: conversation, error: verifyError } = await faithSupabase
        .from('faith_conversations')
        .select('user_id')
        .eq('id', currentConversationId)
        .eq('user_id', userId)
        .single();

      if (verifyError || !conversation) {
        return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404, headers: corsHeaders });
      }
    }

    // 3. Load last 20 messages from conversation
    const { data: messages, error: messagesError } = await faithSupabase
      .from('faith_messages')
      .select('role, content, created_at')
      .eq('conversation_id', currentConversationId)
      .order('created_at', { ascending: true })
      .limit(20);

    if (messagesError) {
      return NextResponse.json({ error: 'Failed to load conversation history' }, { status: 500, headers: corsHeaders });
    }

    // 4. Load user's spiritual context (recent reflections, engagement summary)
    const [reflectionsRes, engagementRes] = await Promise.all([
      faithSupabase
        .from('faith_reflections')
        .select('reflection_date, content')
        .eq('user_id', userId)
        .order('reflection_date', { ascending: false })
        .limit(5),
      faithSupabase
        .from('faith_engagement_log')
        .select('event_type, event_data, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)
    ]);

    const recentReflections = reflectionsRes.data || [];
    const recentEngagement = engagementRes.data || [];

    // 5. Build system prompt: guide persona + user memory context
    let systemPrompt = guide.system_prompt;

    // Add user context
    if (recentReflections.length > 0 || recentEngagement.length > 0) {
      systemPrompt += '\n\n=== USER CONTEXT ===\n';
      
      if (recentReflections.length > 0) {
        systemPrompt += 'Recent reflections from this seeker:\n';
        recentReflections.forEach((reflection: any) => {
          systemPrompt += `- ${reflection.reflection_date}: "${reflection.content}"\n`;
        });
        systemPrompt += '\n';
      }

      if (recentEngagement.length > 0) {
        systemPrompt += 'Recent spiritual activities:\n';
        const engagementSummary = recentEngagement.reduce((acc: Record<string, number>, log: any) => {
          acc[log.event_type] = (acc[log.event_type] || 0) + 1;
          return acc;
        }, {});
        
        Object.entries(engagementSummary).forEach(([eventType, count]) => {
          systemPrompt += `- ${eventType.replace('_', ' ')}: ${count} recent activities\n`;
        });
      }

      systemPrompt += '\nUse this context to provide more personalized guidance, but don\'t assume details not explicitly provided. Reference their reflections and journey naturally when relevant.';
    }

    // 6. Call Anthropic Claude API
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    // Build conversation history for Claude
    const chatMessages = (messages || []).map((msg: any) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));

    // Add the new user message
    chatMessages.push({ role: 'user', content: message });

    const anthropicResponse = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      system: systemPrompt,
      messages: chatMessages,
    });

    let assistantReply = '';
    for (const block of anthropicResponse.content) {
      if (block.type === 'text') {
        assistantReply += block.text;
      }
    }

    if (!assistantReply) {
      return NextResponse.json({ error: 'No response from AI guide' }, { status: 500, headers: corsHeaders });
    }

    // 7. Save user message + assistant reply to faith_messages
    const messagesToInsert = [
      {
        conversation_id: currentConversationId,
        role: 'user',
        content: message
      },
      {
        conversation_id: currentConversationId,
        role: 'assistant',
        content: assistantReply
      }
    ];

    const { error: saveError } = await faithSupabase
      .from('faith_messages')
      .insert(messagesToInsert);

    if (saveError) {
      console.error('Failed to save messages:', saveError);
      // Continue anyway - the response was generated successfully
    }

    // Update conversation updated_at timestamp
    await faithSupabase
      .from('faith_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', currentConversationId);

    // Log engagement
    await faithSupabase
      .from('faith_engagement_log')
      .insert({
        user_id: userId,
        event_type: 'guide_chat',
        event_data: {
          guide_id: guideId,
          conversation_id: currentConversationId,
          guide_name: guide.display_name
        }
      });

    // 8. Return response
    return NextResponse.json({
      reply: assistantReply,
      conversationId: currentConversationId
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Faith guide chat error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}