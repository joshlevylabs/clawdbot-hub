import { NextRequest, NextResponse } from 'next/server';
import { faithSupabase, isFaithSupabaseConfigured } from '@/lib/faith-supabase';

const JOSHUA_USER_ID = '2255450f-a3c8-4006-9aef-4bfc4afcda61';

function getGuideTitle(primaryAlignment: string | null): string {
  if (!primaryAlignment) return 'Your Guide';
  const name = primaryAlignment.toLowerCase();
  if (['orthodox judaism', 'conservative judaism', 'reform judaism', 'reconstructionist judaism'].some(t => name.includes(t.replace(' judaism', '')))) return 'Your Rabbi';
  if (name.includes('messianic')) return 'Your Teacher';
  if (name.includes('catholic') && !name.includes('orthodox')) return 'Your Spiritual Director';
  if (name.includes('eastern orthodox')) return 'Your Elder';
  if (name.includes('evangelical') || name.includes('protestant')) return 'Your Pastor';
  if (name.includes('sunni') || name.includes('islam')) return 'Your Sheikh';
  return 'Your Guide';
}

const TILE_SYMBOLS = ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι'];

function buildSystemPrompt(
  compass: Record<string, unknown> | null,
  responseHistory: Array<Record<string, unknown>>,
  lesson: Record<string, unknown>,
  selectedPerspectives: Array<{ tradition_name: string; text: string; symbol: string }>,
  guideTitle: string
): string {
  const compassContext = compass
    ? `The user's faith compass: ${compass.total_responses || 0} responses so far, ${compass.streak_days || 0} day streak. Their beliefs have been gradually forming but they're still exploring.`
    : 'This user is new — no compass data yet.';

  const historyContext = responseHistory.length > 0
    ? `They've made ${responseHistory.length} recent selections across various topics.`
    : 'No prior response history.';

  const lessonContext = `Today's lesson: "${lesson.topic || 'unknown topic'}"${lesson.scripture_ref ? ` (${lesson.scripture_ref})` : ''}${lesson.parsha ? `. Torah portion: ${lesson.parsha}` : ''}.`;

  const perspectiveTexts = selectedPerspectives
    .map((p) => `--- Perspective ${p.symbol} ---\n"${p.text}"`)
    .join('\n\n');

  return `You are ${guideTitle}, a spiritual conversation partner in a faith exploration app. The user reads anonymous perspectives from different traditions on a daily topic. They don't know which religion or denomination each perspective comes from — they're labeled only with Greek letters (${selectedPerspectives.map(p => p.symbol).join(', ')}). Your job is to help them explore WHY these perspectives resonate and ultimately help them choose ONE to commit to.

CRITICAL ANONYMITY RULES:
- NEVER reveal which religion, denomination, or sect a perspective belongs to
- Always refer to perspectives by their Greek letter symbol (${selectedPerspectives.map(p => p.symbol).join(', ')})
- Do NOT use any religious names, tradition names, or identifying language
- The user should choose based on IDEAS, not on which religion it belongs to
- You know internally which traditions they are (for commit detection), but NEVER reveal this

PERSONALITY:
- Warm but intellectually rigorous
- Socratic — ask probing questions, don't lecture
- Not preachy, more like a study partner who's further along
- Keep responses concise (2-4 sentences typical, occasionally longer for deep moments)

CONTEXT:
${compassContext}
${historyContext}
${lessonContext}

THE PERSPECTIVES THAT RESONATED (anonymous):
${perspectiveTexts}

YOUR OPENING MESSAGE SHOULD:
1. Briefly summarize the KEY IDEA of each resonating perspective (1 sentence each, using the symbol)
2. Highlight what they have in COMMON and where they DIVERGE
3. Ask the user what specifically drew them to these perspectives

CONVERSATION GOALS:
1. Help the user articulate WHY each perspective resonated
2. Explore the tensions and commonalities between the perspectives' ideas
3. Ask probing questions about which specific claims or values in each perspective the user finds compelling
4. Gently guide toward choosing ONE that most deeply aligns with their convictions today
5. When the user clearly commits, acknowledge their choice warmly

COMMITMENT DETECTION:
When you believe the user has clearly committed to one specific perspective (they say something like "I think ${selectedPerspectives[0]?.symbol || 'α'} resonates most" or express a clear preference), respond with your acknowledgment AND include this exact marker at the very end of your message on its own line:
[COMMIT:tradition_name_here]
where tradition_name_here is the exact tradition name you know internally (e.g., "Reform Judaism", "Catholicism", etc.).
Only include this marker when you are confident they have made a clear choice. Do NOT include it if they're still exploring.

INTERNAL TRADITION MAPPING (NEVER reveal to user):
${selectedPerspectives.map(p => `${p.symbol} = ${p.tradition_name}`).join('\n')}`;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// OPTIONS: CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// GET: Fetch existing conversation for a lesson
export async function GET(request: NextRequest) {
  if (!isFaithSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500, headers: corsHeaders });
  }

  const { searchParams } = new URL(request.url);
  const lessonId = searchParams.get('lesson_id');

  if (!lessonId) {
    return NextResponse.json({ error: 'lesson_id required' }, { status: 400, headers: corsHeaders });
  }

  const { data, error } = await faithSupabase
    .from('faith_guide_conversations')
    .select('*')
    .eq('user_id', JOSHUA_USER_ID)
    .eq('lesson_id', lessonId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }

  return NextResponse.json({ conversation: data || null }, { headers: corsHeaders });
}

// POST: Send message and get streaming response
export async function POST(request: NextRequest) {
  if (!isFaithSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { lesson_id, message, selected_tradition_ids, stream: streamMode = true } = body;

  if (!lesson_id || !message) {
    return NextResponse.json({ error: 'lesson_id and message required' }, { status: 400 });
  }

  // Fetch all context in parallel
  const [compassRes, historyRes, lessonRes, traditionsRes, existingConvoRes] = await Promise.all([
    faithSupabase.from('faith_compass_state').select('*').eq('user_id', JOSHUA_USER_ID).single(),
    faithSupabase.from('faith_responses')
      .select('selected_tradition_id, date, lesson:faith_lessons(topic), tradition:faith_traditions(name)')
      .eq('user_id', JOSHUA_USER_ID)
      .order('date', { ascending: false })
      .limit(10),
    faithSupabase.from('faith_lessons').select('*').eq('id', lesson_id).single(),
    faithSupabase.from('faith_traditions').select('*'),
    faithSupabase.from('faith_guide_conversations')
      .select('*')
      .eq('user_id', JOSHUA_USER_ID)
      .eq('lesson_id', lesson_id)
      .single(),
  ]);

  const compass = compassRes.data;
  const lesson = lessonRes.data;
  if (!lesson) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  }

  const traditions = traditionsRes.data || [];
  const responseHistory = (historyRes.data || []).map((r: Record<string, unknown>) => ({
    tradition_name: (r.tradition as Record<string, unknown>)?.name || 'unknown',
    topic: (r.lesson as Record<string, unknown>)?.topic || 'unknown',
    date: r.date,
  }));

  // Build selected perspectives context
  const selectedTraditionIds: string[] = selected_tradition_ids || [];
  const { data: perspectivesData } = await faithSupabase
    .from('faith_perspectives')
    .select('tradition_id, perspective_text')
    .eq('lesson_id', lesson_id)
    .in('tradition_id', selectedTraditionIds);

  // Get ALL perspectives for this lesson to determine correct symbol indices
  const { data: allPerspectives } = await faithSupabase
    .from('faith_perspectives')
    .select('id, tradition_id, perspective_text')
    .eq('lesson_id', lesson_id);

  const selectedPerspectives = (perspectivesData || []).map((p: Record<string, unknown>) => {
    const trad = traditions.find((t: Record<string, unknown>) => t.id === p.tradition_id);
    // Find the index of this perspective in the full list to get the correct symbol
    const allIdx = (allPerspectives || []).findIndex((ap: Record<string, unknown>) => ap.tradition_id === p.tradition_id);
    const symbol = TILE_SYMBOLS[allIdx >= 0 ? allIdx : 0] || '?';
    return {
      tradition_name: (trad?.name as string) || 'Unknown',
      text: p.perspective_text as string,
      symbol,
    };
  });

  const guideTitle = getGuideTitle(compass?.primary_alignment || null);
  const systemPrompt = buildSystemPrompt(compass, responseHistory, lesson, selectedPerspectives, guideTitle);

  // Build messages for Anthropic
  const existingMessages: Array<{ role: string; content: string }> = existingConvoRes.data?.messages || [];
  // Filter out system messages for the Anthropic API (system is separate)
  const chatMessages = existingMessages
    .filter((m: { role: string }) => m.role !== 'system')
    .map((m: { role: string; content: string }) => ({ role: m.role, content: m.content }));

  // Add the new user message
  chatMessages.push({ role: 'user', content: message });

  // ── NON-STREAMING MODE (for React Native / mobile) ──────────────────
  if (streamMode === false) {
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: chatMessages,
      }),
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      console.error('Anthropic API error:', errText);
      return NextResponse.json({ error: 'Guide AI error' }, { status: 502 });
    }

    const result = await anthropicResponse.json();
    let fullText = '';
    for (const block of result.content || []) {
      if (block.type === 'text') fullText += block.text;
    }

    // Check for commit marker
    let commitAction: { tradition_id: string; tradition_name: string } | null = null;
    const commitMatch = fullText.match(/\[COMMIT:(.+?)\]/);
    if (commitMatch) {
      const commitTraditionName = commitMatch[1].trim();
      const committedTradition = traditions.find(
        (t: Record<string, unknown>) => (t.name as string).toLowerCase() === commitTraditionName.toLowerCase()
      );
      if (committedTradition) {
        commitAction = { tradition_id: committedTradition.id as string, tradition_name: committedTradition.name as string };
      }
    }

    const cleanText = fullText.replace(/\[COMMIT:.+?\]/g, '').trim();

    // Save conversation to DB
    const now = new Date().toISOString();
    const updatedMessages = [
      ...existingMessages.filter((m: { role: string }) => m.role !== 'system'),
      { role: 'user', content: message, timestamp: now },
      { role: 'assistant', content: cleanText, timestamp: now },
    ];

    await faithSupabase
      .from('faith_guide_conversations')
      .upsert({
        user_id: JOSHUA_USER_ID,
        lesson_id,
        messages: updatedMessages,
        selected_perspectives: selectedTraditionIds,
        committed_tradition_id: commitAction?.tradition_id || null,
        status: commitAction ? 'committed' : 'active',
        updated_at: now,
      }, {
        onConflict: 'user_id,lesson_id',
      });

    return NextResponse.json({
      text: cleanText,
      commit: commitAction,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // ── STREAMING MODE (for web) ───────────────────────────────────────
  const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: chatMessages,
      stream: true,
    }),
  });

  if (!anthropicResponse.ok) {
    const errText = await anthropicResponse.text();
    console.error('Anthropic API error:', errText);
    return NextResponse.json({ error: 'Guide AI error' }, { status: 502 });
  }

  // Stream the response via SSE
  const encoder = new TextEncoder();
  let fullAssistantResponse = '';

  const stream = new ReadableStream({
    async start(controller) {
      const reader = anthropicResponse.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') continue;

              try {
                const event = JSON.parse(jsonStr);

                if (event.type === 'content_block_delta' && event.delta?.text) {
                  const text = event.delta.text;
                  fullAssistantResponse += text;

                  // Send text chunk to client
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text })}\n\n`));
                }

                if (event.type === 'message_stop') {
                  // Check for commit marker in the full response
                  const commitMatch = fullAssistantResponse.match(/\[COMMIT:(.+?)\]/);
                  if (commitMatch) {
                    const commitTraditionName = commitMatch[1].trim();
                    // Find the tradition ID
                    const committedTradition = traditions.find(
                      (t: Record<string, unknown>) => (t.name as string).toLowerCase() === commitTraditionName.toLowerCase()
                    );

                    if (committedTradition) {
                      // Clean the marker from the displayed text
                      fullAssistantResponse = fullAssistantResponse.replace(/\[COMMIT:.+?\]/, '').trim();

                      // Send commit action
                      controller.enqueue(
                        encoder.encode(
                          `data: ${JSON.stringify({ type: 'action', action: 'commit', tradition_id: committedTradition.id, tradition_name: committedTradition.name })}\n\n`
                        )
                      );
                    }
                  }

                  // Save conversation to DB
                  const now = new Date().toISOString();
                  const cleanResponse = fullAssistantResponse.replace(/\[COMMIT:.+?\]/, '').trim();
                  const updatedMessages = [
                    ...existingMessages.filter((m: { role: string }) => m.role !== 'system'),
                    { role: 'user', content: message, timestamp: now },
                    { role: 'assistant', content: cleanResponse, timestamp: now },
                  ];

                  const commitMatch2 = fullAssistantResponse.match(/\[COMMIT:(.+?)\]/);
                  const committedId = commitMatch2
                    ? (traditions.find((t: Record<string, unknown>) => (t.name as string).toLowerCase() === commitMatch2[1].trim().toLowerCase()) as Record<string, unknown>)?.id || null
                    : null;

                  await faithSupabase
                    .from('faith_guide_conversations')
                    .upsert({
                      user_id: JOSHUA_USER_ID,
                      lesson_id,
                      messages: updatedMessages,
                      selected_perspectives: selectedTraditionIds,
                      committed_tradition_id: committedId as string | null,
                      status: committedId ? 'committed' : 'active',
                      updated_at: now,
                    }, {
                      onConflict: 'user_id,lesson_id',
                    });

                  // Send done event
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
                }
              } catch {
                // Skip unparseable lines
              }
            }
          }
        }
      } catch (err) {
        console.error('Stream error:', err);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'Stream interrupted' })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
