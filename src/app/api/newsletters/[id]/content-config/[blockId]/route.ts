import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { newsletterSupabase as supabase, isNewsletterConfigured } from '@/lib/newsletter-supabase';

// PUT /api/newsletters/[id]/content-config/[blockId] — Update a block
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; blockId: string }> }
) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isNewsletterConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { blockId } = await params;
    const body = await request.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.label !== undefined) updates.label = body.label;
    if (body.params !== undefined) updates.params = body.params;
    if (body.enabled !== undefined) updates.enabled = body.enabled;
    if (body.display_order !== undefined) updates.display_order = body.display_order;

    const { data, error } = await supabase
      .from('newsletter_content_config')
      .update(updates)
      .eq('id', blockId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update block', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ block: data });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}

// DELETE /api/newsletters/[id]/content-config/[blockId] — Remove a block
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; blockId: string }> }
) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isNewsletterConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { blockId } = await params;

    const { error } = await supabase
      .from('newsletter_content_config')
      .delete()
      .eq('id', blockId);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete block', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}
