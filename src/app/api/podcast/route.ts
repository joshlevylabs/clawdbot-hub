import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Force dynamic rendering (no caching)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Use public/data/podcast for deployed version, local path for dev
const isVercel = process.env.VERCEL === '1';
const LOCAL_PODCAST_DIR = path.join(process.env.HOME || '', 'clawd/builders-frequency');
const DEPLOYED_PODCAST_DIR = path.join(process.cwd(), 'public/data/podcast');

const HISTORY_DIR = isVercel ? DEPLOYED_PODCAST_DIR : path.join(LOCAL_PODCAST_DIR, 'history');
const TODOS_FILE = isVercel 
  ? path.join(DEPLOYED_PODCAST_DIR, 'todos.json')
  : path.join(LOCAL_PODCAST_DIR, 'todos.json');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  try {
    // If filename provided, return script content
    if (filename) {
      const filePath = path.join(HISTORY_DIR, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      return NextResponse.json({ content });
    }

    // Otherwise return index and todos
    const indexPath = path.join(HISTORY_DIR, 'index.json');
    let index = { episodes: [], lastEpisodeNumber: 0, pillarCounts: {}, lastUpdated: '' };
    
    try {
      const indexContent = await fs.readFile(indexPath, 'utf-8');
      index = JSON.parse(indexContent);
    } catch {
      // Index doesn't exist yet
    }

    let todos: { id: string; text: string; completed: boolean; createdAt: string }[] = [];
    try {
      const todosContent = await fs.readFile(TODOS_FILE, 'utf-8');
      todos = JSON.parse(todosContent);
    } catch {
      // Todos file doesn't exist yet
    }

    return NextResponse.json({ index, todos }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Podcast API error:', error);
    return NextResponse.json({ error: 'Failed to read podcast data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'saveScript') {
      const { filename, content } = body;
      if (!filename || !content) {
        return NextResponse.json({ error: 'Missing filename or content' }, { status: 400 });
      }
      
      const filePath = path.join(HISTORY_DIR, filename);
      await fs.writeFile(filePath, content, 'utf-8');
      return NextResponse.json({ success: true });
    }

    if (action === 'saveTodos') {
      const { todos } = body;
      await fs.writeFile(TODOS_FILE, JSON.stringify(todos, null, 2), 'utf-8');
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Podcast API POST error:', error);
    return NextResponse.json({ error: 'Failed to save podcast data' }, { status: 500 });
  }
}
