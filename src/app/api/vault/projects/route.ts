import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

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

// GET /api/vault/projects — list all projects
export async function GET(request: NextRequest) {
  if (!(await checkAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('vault_projects')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch projects', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ projects: data });
}

// POST /api/vault/projects — create a project
export async function POST(request: NextRequest) {
  if (!(await checkAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { name, description, color, icon } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('vault_projects')
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      color: color || '#3b82f6',
      icon: icon || 'folder',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create project', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ project: data }, { status: 201 });
}

// PUT /api/vault/projects — update a project
export async function PUT(request: NextRequest) {
  if (!(await checkAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { id, name, description, color, icon } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing project ID' }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description?.trim() || null;
  if (color !== undefined) updates.color = color;
  if (icon !== undefined) updates.icon = icon;

  const { data, error } = await supabase
    .from('vault_projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update project', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ project: data });
}

// DELETE /api/vault/projects?id=xxx — delete a project (secrets become unassigned)
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
    return NextResponse.json({ error: 'Missing project ID' }, { status: 400 });
  }

  // ON DELETE SET NULL handles unassigning secrets automatically
  const { error } = await supabase
    .from('vault_projects')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete project', detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
