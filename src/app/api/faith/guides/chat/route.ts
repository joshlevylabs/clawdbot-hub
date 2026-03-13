import { NextRequest, NextResponse } from "next/server";
import { searchScriptures, formatScriptureContext } from "@/lib/scripture-rag";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { guideName, denomination, tradition, focus, description, message, history = [] } = body;

    if (!message || !guideName) {
      return NextResponse.json(
        { error: "Missing required fields: message and guideName" },
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

    // Search for relevant scripture passages (RAG)
    const passages = await searchScriptures(message, tradition || denomination, {
      matchCount: 5,
      matchThreshold: 0.65,
      includeCrossTradition: false,
    });
    const scriptureContext = formatScriptureContext(passages);

    // Build system prompt from guide information
    const systemPrompt = `You are ${guideName}, a ${denomination} ${tradition} guide. ${description}. Your focus: ${focus}.

You provide thoughtful, compassionate guidance rooted in your tradition while being respectful of others' beliefs. Keep responses concise but meaningful, typically 2-3 paragraphs. Draw from your tradition's wisdom while being accessible to people at all levels of understanding.

IMPORTANT: Always include specific scripture references (book, chapter:verse) when relevant. Quote brief passages directly when they support your point. For example: "As it says in Proverbs 3:5-6, 'Trust in the LORD with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight.'" Be natural and contextual with these citations.${scriptureContext}`;

    // Build message history for context
    const messages = [];
    
    // Add conversation history
    for (const msg of history) {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content
      });
    }

    // Add current message
    messages.push({
      role: "user",
      content: message
    });

    // Call Anthropic API
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
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

    return NextResponse.json({ response });

  } catch (err) {
    console.error("Guide chat error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}