import { NextRequest, NextResponse } from "next/server";

// Clawdbot Gateway configuration
const GATEWAY_URL = process.env.CLAWDBOT_GATEWAY_URL || "http://localhost:3033";
const GATEWAY_TOKEN = process.env.CLAWDBOT_GATEWAY_TOKEN || "";

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Try to connect to Clawdbot gateway
    try {
      const response = await fetch(`${GATEWAY_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(GATEWAY_TOKEN && { Authorization: `Bearer ${GATEWAY_TOKEN}` }),
        },
        body: JSON.stringify({
          message,
          channel: "web",
          sessionId: "clawdbot-hub",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({ response: data.response || data.message });
      }
    } catch (gatewayError) {
      console.log("Gateway not available, using fallback");
    }

    // Fallback: Direct Anthropic API call
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({
        response: "I'm not fully connected yet. To enable chat:\n\n1. Set ANTHROPIC_API_KEY in your environment\n2. Or connect to a running Clawdbot gateway\n\nCheck the Settings page to configure.",
      });
    }

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: `You are Theo, Joshua's AI co-pilot. You're sharp, witty, and direct. You help build things - companies, agents, products. You speak in a conversational but efficient way. You're not a generic assistant - you're a strategic partner.

Keep responses concise unless the topic needs depth. Don't start with "I" or generic greetings.`,
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!anthropicResponse.ok) {
      const error = await anthropicResponse.text();
      console.error("Anthropic API error:", error);
      return NextResponse.json({
        error: "Failed to get response from AI",
      }, { status: 500 });
    }

    const data = await anthropicResponse.json();
    const responseText = data.content?.[0]?.text || "No response generated";

    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
