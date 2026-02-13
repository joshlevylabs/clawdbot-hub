import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { newsletterSupabase as supabase, isNewsletterConfigured } from '@/lib/newsletter-supabase';
import { fetchSourceData } from '@/lib/newsletter-sources';

// GET /api/newsletters/[id]/preview — Generate preview data from configured blocks
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

    // Get all enabled content blocks for this newsletter
    const { data: blocks, error } = await supabase
      .from('newsletter_content_config')
      .select('*')
      .eq('newsletter_id', id)
      .eq('enabled', true)
      .order('display_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch content config', detail: error.message }, { status: 500 });
    }

    if (!blocks || blocks.length === 0) {
      return NextResponse.json({ preview: [], message: 'No content blocks configured' });
    }

    // Fetch data for each block
    const preview = blocks.map((block) => ({
      id: block.id,
      source_key: block.source_key,
      label: block.label,
      params: block.params,
      data: fetchSourceData(block.source_key, block.params || {}),
    }));

    return NextResponse.json({
      preview,
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}
