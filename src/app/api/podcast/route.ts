import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Force dynamic rendering (no caching)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Supabase Storage config
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ofooisrilordzronwaak.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET_NAME = 'podcast-scripts';

// Local fallback for dev
const isVercel = process.env.VERCEL === '1';
const LOCAL_PODCAST_DIR = path.join(process.env.HOME || '', 'clawd/builders-frequency');
const DEPLOYED_PODCAST_DIR = path.join(process.cwd(), 'public/data/podcast');
const HISTORY_DIR = isVercel ? DEPLOYED_PODCAST_DIR : path.join(LOCAL_PODCAST_DIR, 'history');
const TODOS_FILE = isVercel 
  ? path.join(DEPLOYED_PODCAST_DIR, 'todos.json')
  : path.join(LOCAL_PODCAST_DIR, 'todos.json');

// Helper: Read script from Supabase Storage
async function readFromSupabase(filename: string): Promise<string | null> {
  if (!SUPABASE_SERVICE_KEY) return null;
  
  try {
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/authenticated/${BUCKET_NAME}/${filename}`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );
    if (res.ok) {
      return await res.text();
    }
  } catch (error) {
    console.error('Supabase read error:', error);
  }
  return null;
}

// Helper: Write script to Supabase Storage
async function writeToSupabase(filename: string, content: string): Promise<boolean> {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('No Supabase service key configured');
    return false;
  }
  
  try {
    // Use upsert (PUT) to update or create
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${filename}`,
      {
        method: 'PUT',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'text/markdown',
          'x-upsert': 'true',
        },
        body: content,
      }
    );
    return res.ok;
  } catch (error) {
    console.error('Supabase write error:', error);
    return false;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  try {
    // If filename provided, return script content
    if (filename) {
      // Try Supabase first (for latest edits)
      const supabaseContent = await readFromSupabase(filename);
      if (supabaseContent) {
        return NextResponse.json({ content: supabaseContent }, {
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        });
      }
      
      // Fall back to local file
      const filePath = path.join(HISTORY_DIR, filename);
      const content = await fs.readFile(filePath, 'utf-8');
      return NextResponse.json({ content }, {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      });
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
      
      // Save to Supabase Storage
      const success = await writeToSupabase(filename, content);
      if (!success) {
        return NextResponse.json({ error: 'Failed to save to storage' }, { status: 500 });
      }
      
      return NextResponse.json({ success: true });
    }

    if (action === 'saveTodos') {
      const { todos } = body;
      // Todos still use local file (they're less critical)
      // In production, these won't persist but that's okay for now
      try {
        await fs.writeFile(TODOS_FILE, JSON.stringify(todos, null, 2), 'utf-8');
      } catch {
        // Ignore write errors on Vercel
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Podcast API POST error:', error);
    return NextResponse.json({ error: 'Failed to save podcast data' }, { status: 500 });
  }
}
