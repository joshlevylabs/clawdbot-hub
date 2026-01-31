import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured, DbMoltbookActivity } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ 
      error: 'Supabase not configured',
      configured: false 
    }, { status: 500 });
  }

  try {
    const { data, error } = await supabase
      .from('moltbook_activity')
      .select('*')
      .eq('agent_name', 'TheoLevy')
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch Moltbook data',
        details: error.message,
        configured: true
      }, { status: 500 });
    }

    const activity = data as DbMoltbookActivity;

    // Return in the format the page component expects
    return NextResponse.json({
      configured: true,
      status: 'claimed',
      agent: {
        id: activity.id,
        name: activity.agent_name,
        karma: activity.karma,
        created_at: activity.claimed_at,
      },
      activity: {
        posts: activity.posts || [],
        comments: activity.comments || [],
        upvotes: activity.upvotes || [],
        following: activity.following || [],
      },
      stats: {
        postCount: activity.post_count,
        commentCount: activity.comment_count,
        upvoteCount: activity.subscription_count, // using subscription as proxy for upvotes given
        followingCount: activity.following_count,
      },
      updated_at: activity.updated_at,
    });
  } catch (error) {
    console.error('Moltbook API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch Moltbook data',
      details: error instanceof Error ? error.message : 'Unknown error',
      configured: true
    }, { status: 500 });
  }
}

// POST endpoint for Theo to update stats during heartbeat
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    
    const { error } = await supabase
      .from('moltbook_activity')
      .update({
        karma: body.karma,
        post_count: body.post_count,
        comment_count: body.comment_count,
        subscription_count: body.subscription_count,
        following_count: body.following_count,
        posts: body.posts,
        comments: body.comments,
        upvotes: body.upvotes,
        following: body.following,
        updated_at: new Date().toISOString(),
      })
      .eq('agent_name', 'TheoLevy');

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated_at: new Date().toISOString() });
  } catch (error) {
    console.error('Moltbook POST error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
