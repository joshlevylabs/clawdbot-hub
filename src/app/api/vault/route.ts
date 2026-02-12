import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

// Use service role key for vault operations (server-side only)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

async function checkAuth(request: NextRequest): Promise<boolean> {
  try {
    return await isAuthenticated(request);
  } catch {
    return false;
  }
}

// GET /api/vault — list all secrets (encrypted blobs only, never plaintext)
export async function GET(request: NextRequest) {
  try {
    const authed = await checkAuth(request);
    if (!authed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } catch (e) {
    console.error('[vault] auth error:', e);
    return NextResponse.json({ error: 'Auth check failed', detail: String(e) }, { status: 500 });
  }

  if (!supabase) {
    console.error('[vault] supabase not configured', { url: !!supabaseUrl, key: !!supabaseServiceKey });
    return NextResponse.json({ error: 'Database not configured', detail: `url=${!!supabaseUrl} key=${!!supabaseServiceKey}` }, { status: 500 });
  }

  try {
    const { data, error } = await supabase
      .from('secrets')
      .select('id, name, category, encrypted_value, iv, salt, notes, project_id, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[vault] supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch secrets', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ secrets: data });
  } catch (e) {
    console.error('[vault] unexpected error:', e);
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}

// POST /api/vault — create a new secret (receives already-encrypted data)
export async function POST(request: NextRequest) {
  if (!(await checkAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { name, category, encrypted_value, iv, salt, notes, project_id } = body;

  if (!name || !encrypted_value || !iv || !salt) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('secrets')
    .insert({
      name,
      category: category || 'api_key',
      encrypted_value,
      iv,
      salt,
      notes: notes || null,
      project_id: project_id || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create secret', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ secret: data }, { status: 201 });
}

// PUT /api/vault — update a secret
export async function PUT(request: NextRequest) {
  if (!(await checkAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { id, name, category, encrypted_value, iv, salt, notes, project_id } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing secret ID' }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (category !== undefined) updates.category = category;
  if (encrypted_value !== undefined) updates.encrypted_value = encrypted_value;
  if (iv !== undefined) updates.iv = iv;
  if (salt !== undefined) updates.salt = salt;
  if (notes !== undefined) updates.notes = notes;
  if (project_id !== undefined) updates.project_id = project_id || null;

  const { data, error } = await supabase
    .from('secrets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update secret', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ secret: data });
}

// DELETE /api/vault?id=xxx — delete a secret
export async function DELETE(request: NextRequest) {
  if (!(await checkAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing secret ID' }, { status: 400 });
  }

  const { error } = await supabase
    .from('secrets')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete secret', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
