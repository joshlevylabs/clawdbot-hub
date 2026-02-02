import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured, DbMoltbookActivity } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// Fallback to local JSON file
function getLocalMoltbookData() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'moltbook-activity.json');
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return {
        configured: true,
        status: data.status || 'claimed',
        agent: {
          id: 'local',
          name: data.agent_name || 'TheoLevy',
          karma: data.karma || 0,
          created_at: data.created_at || data.updated_at,
        },
        activity: {
          posts: data.posts || [],
          comments: data.comments || [],
          upvotes: data.upvotes || [],
          following: data.following || [],
        },
        stats: {
          postCount: data.post_count || 0,
          commentCount: data.comment_count || 0,
          upvoteCount: data.subscriptions || 0,
          followingCount: data.following_count || 0,
        },
        updated_at: data.updated_at,
        last_active: data.last_active,
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to read local moltbook data:', error);
    return null;
  }
}

export async function GET() {
  // Try Supabase first if configured
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('moltbook_activity')
        .select('*')
        .eq('agent_name', 'TheoLevy')
        .single();

      if (!error && data) {
        const activity = data as DbMoltbookActivity;
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
            upvoteCount: activity.subscription_count,
            followingCount: activity.following_count,
          },
          updated_at: activity.updated_at,
        });
      }
      
      // Supabase failed, fall through to local
      console.log('Supabase query failed, falling back to local:', error?.message);
    } catch (error) {
      console.error('Supabase error, falling back to local:', error);
    }
  }

  // Fallback to local JSON
  const localData = getLocalMoltbookData();
  if (localData) {
    return NextResponse.json(localData);
  }

  return NextResponse.json({ 
    error: 'Moltbook data not available',
    configured: false 
  }, { status: 500 });
}

// POST endpoint for Theo to update stats
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Always update local file
    const filePath = path.join(process.cwd(), 'public', 'data', 'moltbook-activity.json');
    const localData = {
      agent_name: 'TheoLevy',
      updated_at: new Date().toISOString(),
      karma: body.karma,
      post_count: body.post_count,
      comment_count: body.comment_count,
      subscriptions: body.subscription_count,
      following_count: body.following_count,
      posts: body.posts,
      comments: body.comments,
      upvotes: body.upvotes,
      following: body.following,
      status: 'claimed',
      last_active: new Date().toISOString(),
    };
    
    fs.writeFileSync(filePath, JSON.stringify(localData, null, 2));

    // Also try Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        await supabase
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
      } catch (error) {
        console.error('Supabase update failed (local succeeded):', error);
      }
    }

    return NextResponse.json({ success: true, updated_at: new Date().toISOString() });
  } catch (error) {
    console.error('Moltbook POST error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
