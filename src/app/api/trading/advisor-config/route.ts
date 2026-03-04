import { NextRequest, NextResponse } from "next/server";
import { getSessionAny } from '@/lib/auth';
import { paperSupabase, isPaperSupabaseConfigured } from '@/lib/paper-supabase';

// Available models for the dropdown
const AVAILABLE_MODELS = [
  { id: "claude-sonnet-4-5-20250414", label: "Claude Sonnet 4.5" },
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { id: "claude-haiku-4-5-20250414", label: "Claude Haiku 4.5" },
  { id: "claude-opus-4-6", label: "Claude Opus 4" },
];

// GET — fetch all trading desk advisor configs
export async function GET(request: NextRequest) {
  const authenticated = await getSessionAny();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isPaperSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { data, error } = await paperSupabase
    .from('agent_configs')
    .select('id, name, model, emoji, title, department')
    .eq('department', 'trading-desk')
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    advisors: data || [],
    available_models: AVAILABLE_MODELS,
  });
}

// PATCH — update model for a specific advisor
export async function PATCH(request: NextRequest) {
  const authenticated = await getSessionAny();
  if (!authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isPaperSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { advisor_id, model } = body;

  if (!advisor_id || !model) {
    return NextResponse.json({ error: 'advisor_id and model required' }, { status: 400 });
  }

  // Validate model ID
  if (!AVAILABLE_MODELS.some(m => m.id === model)) {
    return NextResponse.json({ error: `Invalid model: ${model}` }, { status: 400 });
  }

  const { error } = await paperSupabase
    .from('agent_configs')
    .update({ model, updated_at: new Date().toISOString() })
    .eq('id', advisor_id)
    .eq('department', 'trading-desk');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, advisor_id, model });
}
