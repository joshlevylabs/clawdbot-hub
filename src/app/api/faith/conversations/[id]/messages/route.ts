import { NextRequest, NextResponse } from 'next/server';
import { faithSupabase, isFaithSupabaseConfigured } from '@/lib/faith-supabase';
import { getSession } from '@/lib/auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface RouteParams {
  params: Promise<{ id: string }>;
}

// OPTIONS: CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// GET: Fetch messages for a specific conversation
export async function GET(request: NextRequest, { params }: RouteParams) {
  if (!isFaithSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500, headers: corsHeaders });
  }

  // Check authentication
  const session = await getSession();
  if (!session.authenticated || !session.userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
  }

  try {
    const { id: conversationId } = await params;
    const userId = session.userId;

    // Verify user owns this conversation
    const { data: conversation, error: conversationError } = await faithSupabase
      .from('faith_conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404, headers: corsHeaders });
    }

    // Fetch messages for this conversation
    const { data: messages, error: messagesError } = await faithSupabase
      .from('faith_messages')
      .select(`
        id,
        role,
        content,
        created_at
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Failed to fetch messages:', messagesError);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({
      messages: messages || []
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Faith conversation messages API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
}