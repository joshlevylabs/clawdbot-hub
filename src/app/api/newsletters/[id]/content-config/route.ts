import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { newsletterSupabase as supabase, isNewsletterConfigured } from '@/lib/newsletter-supabase';

// GET /api/newsletters/[id]/content-config — List content blocks
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isNewsletterConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('newsletter_content_config')
      .select('*')
      .eq('newsletter_id', id)
      .order('display_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch content config', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ blocks: data || [] });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}

// POST /api/newsletters/[id]/content-config — Add a content block
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isNewsletterConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { source_key, label, params: blockParams } = body;

    if (!source_key || !label) {
      return NextResponse.json({ error: 'source_key and label are required' }, { status: 400 });
    }

    // Get next display_order
    const { data: existing } = await supabase
      .from('newsletter_content_config')
      .select('display_order')
      .eq('newsletter_id', id)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0;

    const { data, error } = await supabase
      .from('newsletter_content_config')
      .insert({
        newsletter_id: id,
        source_key,
        label,
        params: blockParams || {},
        display_order: nextOrder,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to add content block', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ block: data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}
