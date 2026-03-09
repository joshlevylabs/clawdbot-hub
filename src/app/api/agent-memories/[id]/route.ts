import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isAuthenticated } from '@/lib/auth';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const authResult = await isAuthenticated(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const { data, error } = await supabase
      .from('agent_memories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching agent memory:', error);
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    return NextResponse.json({ memory: data });
  } catch (error) {
    console.error('Error in GET /api/agent-memories/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const authResult = await isAuthenticated(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    
    // Extract fields that can be updated
    const { content, summary, source, source_metadata, importance, tags, kind } = body;
    
    let updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Add fields to update if provided
    if (summary !== undefined) updateData.summary = summary;
    if (source !== undefined) updateData.source = source;
    if (source_metadata !== undefined) updateData.source_metadata = source_metadata;
    if (importance !== undefined) updateData.importance = importance;
    if (tags !== undefined) updateData.tags = tags;
    if (kind !== undefined) updateData.kind = kind;

    // If content is being updated, re-generate embedding
    if (content !== undefined) {
      updateData.content = content;
      
      try {
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: content,
        });
        updateData.embedding = embeddingResponse.data[0].embedding;
      } catch (embeddingError) {
        console.error('Error generating embedding:', embeddingError);
        return NextResponse.json({ 
          error: 'Failed to generate embedding' 
        }, { status: 500 });
      }
    }

    const { data, error } = await supabase
      .from('agent_memories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating agent memory:', error);
      return NextResponse.json({ error: 'Failed to update memory' }, { status: 500 });
    }

    return NextResponse.json({ memory: data });
  } catch (error) {
    console.error('Error in PATCH /api/agent-memories/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const authResult = await isAuthenticated(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const { error } = await supabase
      .from('agent_memories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting agent memory:', error);
      return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Memory deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/agent-memories/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}