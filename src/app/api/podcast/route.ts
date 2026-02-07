import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Force dynamic rendering (no caching)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Supabase config - use production Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://atldnpjaxaeqzgtqbrpy.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Local fallback for dev
const isVercel = process.env.VERCEL === '1';
const LOCAL_PODCAST_DIR = path.join(process.env.HOME || '', 'clawd/builders-frequency');
const DEPLOYED_PODCAST_DIR = path.join(process.cwd(), 'public/data/podcast');
const HISTORY_DIR = isVercel ? DEPLOYED_PODCAST_DIR : path.join(LOCAL_PODCAST_DIR, 'history');
const TODOS_FILE = isVercel 
  ? path.join(DEPLOYED_PODCAST_DIR, 'todos.json')
  : path.join(LOCAL_PODCAST_DIR, 'todos.json');

// Also save to Hub's podcast directory for local dev
const HUB_PODCAST_DIR = path.join(process.cwd(), 'public/data/podcast');

// Helper: Read script from Supabase database
async function readFromSupabase(filename: string): Promise<string | null> {
  if (!SUPABASE_KEY) return null;
  
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/podcast_scripts?filename=eq.${encodeURIComponent(filename)}&select=content`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        return data[0].content;
      }
    }
  } catch (error) {
    console.error('Supabase read error:', error);
  }
  return null;
}

// Helper: Write script to Supabase database (upsert)
async function writeToSupabase(filename: string, content: string): Promise<boolean> {
  if (!SUPABASE_KEY) {
    console.error('No Supabase key configured');
    return false;
  }
  
  try {
    // Upsert: insert or update based on filename
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/podcast_scripts`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          filename,
          content,
          updated_at: new Date().toISOString(),
        }),
      }
    );
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Supabase write failed:', res.status, errorText);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Supabase write error:', error);
    return false;
  }
}

// Helper: Write to local file
async function writeToLocalFile(filename: string, content: string): Promise<boolean> {
  try {
    // Write to Hub's public/data/podcast directory
    const hubPath = path.join(HUB_PODCAST_DIR, filename);
    await fs.writeFile(hubPath, content, 'utf-8');
    console.log('Saved to Hub:', hubPath);
    
    // Also write to builders-frequency if not on Vercel
    if (!isVercel) {
      const localPath = path.join(HISTORY_DIR, filename);
      await fs.writeFile(localPath, content, 'utf-8');
      console.log('Saved locally:', localPath);
    }
    return true;
  } catch (error) {
    console.error('Local file write error:', error);
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
      
      // Fall back to local/deployed file
      try {
        const filePath = path.join(HISTORY_DIR, filename);
        const content = await fs.readFile(filePath, 'utf-8');
        return NextResponse.json({ content }, {
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        });
      } catch {
        // Try Hub's podcast directory
        const hubPath = path.join(HUB_PODCAST_DIR, filename);
        const content = await fs.readFile(hubPath, 'utf-8');
        return NextResponse.json({ content }, {
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        });
      }
    }

    // Otherwise return index and todos
    let index = { episodes: [], lastEpisodeNumber: 0, pillarCounts: {}, lastUpdated: '' };
    
    // Try multiple locations for index.json
    const indexPaths = [
      path.join(HISTORY_DIR, 'index.json'),
      path.join(HUB_PODCAST_DIR, 'index.json'),
    ];
    
    for (const indexPath of indexPaths) {
      try {
        const indexContent = await fs.readFile(indexPath, 'utf-8');
        index = JSON.parse(indexContent);
        break;
      } catch {
        // Try next path
      }
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
      
      // Try Supabase first
      const supabaseSuccess = await writeToSupabase(filename, content);
      
      // Also save locally (for dev and as backup)
      const localSuccess = await writeToLocalFile(filename, content);
      
      if (!supabaseSuccess && !localSuccess) {
        return NextResponse.json({ error: 'Failed to save script' }, { status: 500 });
      }
      
      return NextResponse.json({ 
        success: true, 
        savedTo: {
          supabase: supabaseSuccess,
          local: localSuccess,
        }
      });
    }

    if (action === 'saveTodos') {
      const { todos } = body;
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
