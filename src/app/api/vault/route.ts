import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// GET /api/vault — list all secrets (encrypted blobs only, never plaintext)
export async function GET(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('secrets')
    .select('id, name, category, encrypted_value, iv, salt, notes, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch secrets' }, { status: 500 });
  }

  return NextResponse.json({ secrets: data });
}

// POST /api/vault — create a new secret (receives already-encrypted data)
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name, category, encrypted_value, iv, salt, notes } = body;

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
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create secret' }, { status: 500 });
  }

  return NextResponse.json({ secret: data }, { status: 201 });
}

// PUT /api/vault — update a secret
export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { id, name, category, encrypted_value, iv, salt, notes } = body;

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

  const { data, error } = await supabase
    .from('secrets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update secret' }, { status: 500 });
  }

  return NextResponse.json({ secret: data });
}

// DELETE /api/vault?id=xxx — delete a secret
export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    return NextResponse.json({ error: 'Failed to delete secret' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
