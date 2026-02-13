import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { newsletterSupabase as supabase, isNewsletterConfigured } from '@/lib/newsletter-supabase';

// PUT /api/newsletters/[id]/content-config/reorder — Reorder blocks
export async function PUT(
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
    const { order } = body; // Array of block IDs in desired order

    if (!Array.isArray(order)) {
      return NextResponse.json({ error: 'order must be an array of block IDs' }, { status: 400 });
    }

    // Update each block's display_order
    const updates = order.map((blockId: string, index: number) =>
      supabase
        .from('newsletter_content_config')
        .update({ display_order: index, updated_at: new Date().toISOString() })
        .eq('id', blockId)
        .eq('newsletter_id', id)
    );

    await Promise.all(updates);

    // Fetch updated list
    const { data } = await supabase
      .from('newsletter_content_config')
      .select('*')
      .eq('newsletter_id', id)
      .order('display_order', { ascending: true });

    return NextResponse.json({ blocks: data || [] });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}
