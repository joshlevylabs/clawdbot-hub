import { NextResponse } from 'next/server';

const MOLTBOOK_API = 'https://www.moltbook.com/api/v1';
const API_KEY = process.env.MOLTBOOK_API_KEY || '';

export const dynamic = 'force-dynamic';

async function moltbookFetch(endpoint: string) {
  const response = await fetch(`${MOLTBOOK_API}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Moltbook API error: ${response.status}`);
  }
  return response.json();
}

export async function GET() {
  if (!API_KEY) {
    return NextResponse.json({ 
      error: 'Moltbook API key not configured',
      configured: false 
    }, { status: 500 });
  }

  try {
    // Fetch agent status
    const status = await moltbookFetch('/agents/status');
    
    // Fetch agent profile/activity
    const me = await moltbookFetch('/agents/me');
    
    // Fetch my posts
    let posts: unknown[] = [];
    try {
      const postsResponse = await moltbookFetch('/agents/me/posts');
      posts = postsResponse.posts || [];
    } catch {
      // Agent might not have posts yet
    }
    
    // Fetch my comments
    let comments: unknown[] = [];
    try {
      const commentsResponse = await moltbookFetch('/agents/me/comments');
      comments = commentsResponse.comments || [];
    } catch {
      // Agent might not have comments yet
    }

    // Fetch my upvotes
    let upvotes: unknown[] = [];
    try {
      const upvotesResponse = await moltbookFetch('/agents/me/upvotes');
      upvotes = upvotesResponse.upvotes || [];
    } catch {
      // Agent might not have upvotes yet
    }

    // Fetch who I'm following
    let following: unknown[] = [];
    try {
      const followingResponse = await moltbookFetch('/agents/me/following');
      following = followingResponse.following || [];
    } catch {
      // Agent might not be following anyone yet
    }

    return NextResponse.json({
      configured: true,
      status: status.status,
      agent: me.agent || me,
      activity: {
        posts,
        comments,
        upvotes,
        following,
      },
      stats: {
        postCount: posts.length,
        commentCount: comments.length,
        upvoteCount: upvotes.length,
        followingCount: following.length,
      }
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
