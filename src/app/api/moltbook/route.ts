import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

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
    // Fetch agent status from API
    const status = await moltbookFetch('/agents/status');
    const me = await moltbookFetch('/agents/me');

    // Try to read local activity file for posts/comments
    let localActivity = null;
    try {
      const filePath = path.join(process.cwd(), 'public', 'data', 'moltbook-activity.json');
      const fileContent = await fs.readFile(filePath, 'utf-8');
      localActivity = JSON.parse(fileContent);
    } catch {
      // File doesn't exist yet, that's ok
    }

    const posts = localActivity?.posts || [];
    const comments = localActivity?.comments || [];
    const upvotes = localActivity?.upvotes || [];
    const following = localActivity?.following || [];

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
      },
      lastUpdated: localActivity?.last_updated || null
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
