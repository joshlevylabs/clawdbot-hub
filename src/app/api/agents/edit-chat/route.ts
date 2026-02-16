import { NextRequest, NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

interface AgentContext {
  id: string;
  name: string;
  title: string;
  emoji: string;
  model: string;
  department: string;
  status: string;
  description: string;
  reportsTo: string | null;
  directReports: string[];
}

interface EditChange {
  field: string;
  value: string;
}

export async function POST(request: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { instruction, agent, allAgents } = body as {
      instruction: string;
      agent: AgentContext;
      allAgents: Record<string, { name: string; title: string }>;
    };

    if (!instruction || !agent) {
      return NextResponse.json(
        { error: "Missing instruction or agent context" },
        { status: 400 }
      );
    }

    const agentsList = Object.entries(allAgents || {})
      .map(([id, a]) => `${id}: ${a.name} (${a.title})`)
      .join(", ");

    const systemPrompt = `You are an agent configuration editor. Given a natural language instruction, extract structured changes to apply to an AI agent's configuration.

Current agent config:
- ID: ${agent.id}
- Name: ${agent.name}
- Title: ${agent.title}
- Emoji: ${agent.emoji}
- Model: ${agent.model} (options: Claude Opus 4, Claude Sonnet 4, Haiku 3.5, Gemini 2 Flash)
- Department: ${agent.department} (options: Executive, Engineering, Marketing, Revenue)
- Status: ${agent.status} (options: active, idle, standby)
- Description: ${agent.description}
- Reports To: ${agent.reportsTo || "None"}
- Direct Reports: ${agent.directReports?.join(", ") || "None"}

Other agents in the org: ${agentsList}

RULES:
1. Extract ALL field changes the user wants, even if implied
2. For celebrity/persona requests (e.g. "make this Elon Musk"), infer appropriate name, title, emoji, description changes
3. For "reports to" changes, use the agent ID from the org list
4. Be creative with emojis when they fit the persona
5. If the user asks a question or wants info, set "infoResponse" instead of changes
6. Always respond in valid JSON

Respond with ONLY valid JSON in this exact format:
{
  "changes": [
    { "field": "name", "value": "NewName" },
    { "field": "title", "value": "New Title" }
  ],
  "summary": "Human-readable summary of what's being changed",
  "infoResponse": null
}

Or for info/question requests:
{
  "changes": [],
  "summary": "",
  "infoResponse": "Here's what you asked about..."
}

Valid fields: name, title, emoji, model, department, status, description, reportsTo, directReports`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: instruction,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", errText);
      return NextResponse.json(
        { error: "LLM API error", detail: errText },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text || "";

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    return NextResponse.json({
      changes: parsed.changes || [],
      summary: parsed.summary || "",
      infoResponse: parsed.infoResponse || null,
    });
  } catch (error) {
    console.error("Edit chat error:", error);
    return NextResponse.json(
      { error: "Failed to process edit instruction", detail: String(error) },
      { status: 500 }
    );
  }
}
