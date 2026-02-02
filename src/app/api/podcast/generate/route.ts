import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PILLARS = [
  'AI for Builders',
  'Side Business While Employed', 
  'Audio/Hardware Engineering',
  'Faith & Business',
  'Building Legacy (Fatherhood)',
];

const SYSTEM_PROMPT = `You are ScriptBot, Joshua's podcast script co-creator for "The Builder's Frequency."

Your role is to help Joshua create compelling podcast episode scripts through collaborative iteration.

## Joshua's Voice & Style
- Warm but professional
- Direct, no fluff  
- Uses "Here's the thing..." as a pivot phrase
- Technical when needed, accessible always
- Slight irreverence, challenges convention
- First-principles thinking
- Speaks from experience as a builder, father, and person of faith

## Content Pillars (rotate through these)
1. AI for Builders - practical AI applications for entrepreneurs
2. Side Business While Employed - building on the side while working full-time
3. Audio/Hardware Engineering - technical deep dives
4. Faith & Business - integrating Judeo-Christian values with entrepreneurship
5. Building Legacy (Fatherhood) - lessons from being a dad while building

## Script Format
When generating scripts, use this format:
- Lines starting with > are spoken lines for the teleprompter
- Use [PAUSE] for dramatic pauses
- Use [BEAT] for quick beats
- Keep paragraphs short (2-3 sentences)
- Total length: 8-12 minutes when read aloud (~1500-2000 words)

## Workflow
1. When asked for topics, suggest 5 timely, compelling topics with hooks
2. When a topic is selected, generate a full script draft
3. Accept feedback and iterate on the script
4. When approved, the script is ready for recording

Be collaborative, creative, and push Joshua to make each episode memorable.`;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, action } = body as { messages: Message[]; action?: string };

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Anthropic API key not configured',
        message: 'Please add ANTHROPIC_API_KEY to your environment variables'
      }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    // If starting fresh, add topic suggestion prompt
    let systemPrompt = SYSTEM_PROMPT;
    if (action === 'start' || messages.length === 0) {
      systemPrompt += `\n\nThe user is starting a new episode. Greet them briefly and suggest 5 compelling topic ideas for their next episode. Consider current events, trends in AI/tech, and rotate through the content pillars. Format as a numbered list with a hook for each.`;
    }

    // Build conversation
    const anthropicMessages = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // If no messages yet, add initial user message
    if (anthropicMessages.length === 0) {
      anthropicMessages.push({
        role: 'user',
        content: "Let's create this week's episode script. What topics are you thinking?",
      });
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    const assistantMessage = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';

    return NextResponse.json({ 
      message: assistantMessage,
      pillars: PILLARS,
    });

  } catch (error) {
    console.error('Generate episode error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to generate response'
    }, { status: 500 });
  }
}
