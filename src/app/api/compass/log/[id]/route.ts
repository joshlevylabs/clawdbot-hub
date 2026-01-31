import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface ProcessedLog {
  type: 'positive' | 'negative';
  description: string;
  power: number;
  safety: number;
  tags: string[];
  advice: string;
}

// Same AI processing as in the main log route
async function processLogWithAI(text: string): Promise<ProcessedLog> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    return fallbackProcessing(text);
  }

  const prompt = `Analyze this marriage/relationship interaction log and return a JSON object.

User input: "${text}"

Return ONLY valid JSON with these fields:
{
  "type": "positive" or "negative" (based on if this was a good or bad interaction),
  "description": "A concise 1-2 sentence summary of what happened",
  "power": number from -5 to 5 (negative = too passive/self-sacrificing, 0-2 = healthy leadership, >2 = too controlling),
  "safety": number from -5 to 5 (negative = created fear/tension, positive = created emotional safety/trust),
  "tags": ["array", "of", "relevant", "tags"],
  "advice": "Brief, practical advice for handling this situation better or reinforcement if it was positive"
}

Guidelines for scoring:
- Power: Did the person show healthy leadership (+1-2), or were they passive (-1 to -3), or controlling (+3 to +5)?
- Safety: Did this interaction create emotional safety and trust (+1 to +5), or fear/tension (-1 to -5)?
- For negative interactions: Power might still be positive (being assertive but in a harmful way)
- Advice should be specific, actionable, and compassionate`;

  try {
    if (process.env.OPENAI_API_KEY) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          return JSON.parse(content) as ProcessedLog;
        }
      }
    } else if (process.env.ANTHROPIC_API_KEY) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.content?.[0]?.text;
        if (content) {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]) as ProcessedLog;
          }
        }
      }
    }
  } catch (error) {
    console.error('AI processing error:', error);
  }

  return fallbackProcessing(text);
}

function fallbackProcessing(text: string): ProcessedLog {
  const lowerText = text.toLowerCase();
  
  const negativeKeywords = ['defensive', 'argument', 'fight', 'angry', 'frustrated', 'ignored', 'forgot', 'snapped', 'yelled'];
  const positiveKeywords = ['apologized', 'helped', 'listened', 'surprised', 'appreciated', 'thanked', 'hugged', 'complimented'];
  
  const isNegative = negativeKeywords.some(k => lowerText.includes(k));
  const isPositive = positiveKeywords.some(k => lowerText.includes(k));
  
  const type = isNegative && !isPositive ? 'negative' : 'positive';
  
  return {
    type,
    description: text.slice(0, 200),
    power: type === 'positive' ? 1 : 0,
    safety: type === 'positive' ? 2 : -1,
    tags: [],
    advice: type === 'positive' 
      ? 'Great job! Keep building on these positive interactions.'
      : 'Consider how you might handle this differently next time. Focus on emotional safety first.'
  };
}

// PUT - Update an existing interaction
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json({ error: 'Invalid data: text is required' }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Re-process with AI
    const processed = await processLogWithAI(body.text);

    // Update in Supabase
    const { data, error } = await supabase
      .from('compass_interactions')
      .update({
        type: processed.type,
        description: processed.description,
        power: processed.power,
        safety: processed.safety,
        answers: {
          advice: processed.advice,
          tags: processed.tags,
          original_text: body.text
        }
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to update log', details: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Interaction not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      interaction: data,
      advice: processed.advice
    });
  } catch (error) {
    console.error('Log update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete an interaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { error } = await supabase
      .from('compass_interactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to delete log', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Log delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
