import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Model mapping from agent_configs.model to Anthropic API model names
const modelMapping: { [key: string]: string } = {
  "Claude Sonnet 4": "claude-sonnet-4-20250514",
  "Claude Opus 4": "claude-opus-4-6",
  "Claude Haiku": "claude-3-haiku-20240307",
  "Claude Sonnet": "claude-3-sonnet-20240229",
  "Claude Opus": "claude-3-opus-20240229"
};

export async function POST(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const agentId = params.name;
    const body = await request.json();
    const { message, userId, conversationId } = body;

    // Validate required fields
    if (!message || !userId || !agentId) {
      return NextResponse.json(
        { error: "Missing required fields: message, userId, agentId" },
        { status: 400 }
      );
    }

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured" },
        { status: 503 }
      );
    }

    // Step 1: Load agent config from Supabase
    const { data: agentConfig, error: agentError } = await supabase
      .from('agent_configs')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agentConfig) {
      return NextResponse.json(
        { error: `Agent not found: ${agentId}` },
        { status: 404 }
      );
    }

    // Check if agent endpoint is enabled
    if (!agentConfig.endpoint_enabled) {
      return NextResponse.json(
        { error: "Agent endpoint is not enabled" },
        { status: 403 }
      );
    }

    // Step 2: Load or create conversation
    let currentConversationId = conversationId;
    let conversation = null;

    if (conversationId) {
      // Try to load existing conversation
      const { data: existingConv } = await supabase
        .from('agent_conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('agent_id', agentId)
        .eq('user_id', userId)
        .single();

      if (existingConv) {
        conversation = existingConv;
      }
    }

    if (!conversation) {
      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from('agent_conversations')
        .insert({
          agent_id: agentId,
          user_id: userId,
          title: message.substring(0, 50) + (message.length > 50 ? '...' : '')
        })
        .select()
        .single();

      if (convError || !newConv) {
        console.error("Failed to create conversation:", convError);
        return NextResponse.json(
          { error: "Failed to create conversation" },
          { status: 500 }
        );
      }

      conversation = newConv;
      currentConversationId = newConv.id;
    }

    // Step 3: Load conversation history (last 50 messages)
    const { data: messageHistory } = await supabase
      .from('agent_messages')
      .select('role, content')
      .eq('conversation_id', currentConversationId)
      .order('created_at', { ascending: true })
      .limit(50);

    // Step 4: Load agent memories for this user
    const { data: memories } = await supabase
      .from('agent_memories')
      .select('content, memory_type, created_at')
      .eq('agent_id', agentId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Build system prompt
    let systemPrompt = agentConfig.soul_prompt;
    
    // Fall back to building one from basic info if no soul_prompt
    if (!systemPrompt) {
      systemPrompt = `You are ${agentConfig.name}${agentConfig.title ? `, ${agentConfig.title}` : ''}. ${agentConfig.description || 'A helpful AI assistant.'}`;
    }

    // Add memories to system prompt if available
    if (memories && memories.length > 0) {
      systemPrompt += "\n\n## User Context & Memories:\n";
      memories.forEach((memory) => {
        systemPrompt += `- [${memory.memory_type}] ${memory.content}\n`;
      });
    }

    // Step 5: Build message history for Anthropic API
    const messages = [];
    
    // Add conversation history
    if (messageHistory) {
      for (const msg of messageHistory) {
        if (msg.role !== 'system') { // Don't include system messages in history
          messages.push({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content
          });
        }
      }
    }

    // Add current message
    messages.push({
      role: "user",
      content: message
    });

    // Get model name for Anthropic API
    const modelName = modelMapping[agentConfig.model] || agentConfig.model || "claude-sonnet-4-20250514";

    // Step 6: Call Anthropic API
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: agentConfig.max_tokens || 2000,
        temperature: agentConfig.temperature || 0.7,
        system: systemPrompt,
        messages: messages
      })
    });

    if (!anthropicResponse.ok) {
      const errorData = await anthropicResponse.json().catch(() => ({}));
      console.error("Anthropic API error:", errorData);
      return NextResponse.json(
        { error: "Failed to get AI response" },
        { status: 500 }
      );
    }

    const result = await anthropicResponse.json();
    const response = result.content?.[0]?.text || "I apologize, but I couldn't generate a response at this time.";

    // Step 7: Store user message and assistant response in agent_messages
    const messagesToStore = [
      {
        conversation_id: currentConversationId,
        role: "user",
        content: message,
        metadata: {}
      },
      {
        conversation_id: currentConversationId,
        role: "assistant",
        content: response,
        metadata: {
          model: modelName,
          temperature: agentConfig.temperature || 0.7,
          max_tokens: agentConfig.max_tokens || 2000,
          input_tokens: result.usage?.input_tokens || 0,
          output_tokens: result.usage?.output_tokens || 0
        }
      }
    ];

    const { error: messageError } = await supabase
      .from('agent_messages')
      .insert(messagesToStore);

    if (messageError) {
      console.error("Failed to store messages:", messageError);
      // Don't fail the request, just log the error
    }

    // Step 8: Update conversation updated_at
    await supabase
      .from('agent_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', currentConversationId);

    // Step 9: Return response
    return NextResponse.json({
      response,
      conversationId: currentConversationId
    });

  } catch (err) {
    console.error("Agent runtime error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}