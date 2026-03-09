import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isAuthenticated } from '@/lib/auth';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await isAuthenticated(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { agent_id, query, user_id, kinds, limit = 10 } = body;

    if (!agent_id || !query) {
      return NextResponse.json({ 
        error: 'agent_id and query are required' 
      }, { status: 400 });
    }

    // Generate embedding for the query
    let queryEmbedding;
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
      });
      queryEmbedding = embeddingResponse.data[0].embedding;
    } catch (embeddingError) {
      console.error('Error generating query embedding:', embeddingError);
      return NextResponse.json({ 
        error: 'Failed to generate query embedding' 
      }, { status: 500 });
    }

    // Call the RPC function for semantic search
    const { data, error } = await supabase.rpc('search_agent_memories', {
      p_agent_id: agent_id,
      p_embedding: queryEmbedding,
      p_user_id: user_id || null,
      p_kinds: kinds || null,
      p_limit: limit,
      p_min_importance: null, // Could be made configurable
    });

    if (error) {
      console.error('Error searching agent memories:', error);
      return NextResponse.json({ error: 'Failed to search memories' }, { status: 500 });
    }

    return NextResponse.json({ 
      query: query,
      results: data || [],
      count: data ? data.length : 0
    });
  } catch (error) {
    console.error('Error in POST /api/agent-memories/search:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}