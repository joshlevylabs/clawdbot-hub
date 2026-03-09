import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isAuthenticated } from '@/lib/auth';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await isAuthenticated(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agent_id = searchParams.get('agent_id');
    const kind = searchParams.get('kind');
    const user_id = searchParams.get('user_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!agent_id) {
      return NextResponse.json({ error: 'agent_id is required' }, { status: 400 });
    }

    let query = supabase
      .from('agent_memories')
      .select('*')
      .eq('agent_id', agent_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (kind) {
      query = query.eq('kind', kind);
    }

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching agent memories:', error);
      return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 });
    }

    return NextResponse.json({ memories: data });
  } catch (error) {
    console.error('Error in GET /api/agent-memories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await isAuthenticated(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { agent_id, kind, content, summary, source, source_metadata, importance, tags } = body;

    if (!agent_id || !kind || !content) {
      return NextResponse.json({ 
        error: 'agent_id, kind, and content are required' 
      }, { status: 400 });
    }

    // Generate embedding for the content
    let embedding = null;
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: content,
      });
      embedding = embeddingResponse.data[0].embedding;
    } catch (embeddingError) {
      console.error('Error generating embedding:', embeddingError);
      return NextResponse.json({ 
        error: 'Failed to generate embedding' 
      }, { status: 500 });
    }

    // Insert into database
    const { data, error } = await supabase
      .from('agent_memories')
      .insert({
        agent_id,
        kind,
        content,
        summary,
        source,
        source_metadata,
        importance: importance || 0.5,
        embedding,
        tags: tags || [],
        recalled_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating agent memory:', error);
      return NextResponse.json({ error: 'Failed to create memory' }, { status: 500 });
    }

    return NextResponse.json({ memory: data });
  } catch (error) {
    console.error('Error in POST /api/agent-memories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}