import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { newsletterSupabase as supabase, isNewsletterConfigured } from '@/lib/newsletter-supabase';
import { fetchSourceData } from '@/lib/newsletter-sources';

// POST /api/newsletters/[id]/finalize — Snapshot current data into a new draft issue
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

    // Get newsletter details
    const { data: newsletter, error: nlErr } = await supabase
      .from('newsletters')
      .select('*')
      .eq('id', id)
      .single();

    if (nlErr || !newsletter) {
      return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
    }

    // Get all enabled content blocks
    const { data: blocks, error: blockErr } = await supabase
      .from('newsletter_content_config')
      .select('*')
      .eq('newsletter_id', id)
      .eq('enabled', true)
      .order('display_order', { ascending: true });

    if (blockErr) {
      return NextResponse.json({ error: 'Failed to fetch content config', detail: blockErr.message }, { status: 500 });
    }

    if (!blocks || blocks.length === 0) {
      return NextResponse.json({ error: 'No content blocks configured for this newsletter' }, { status: 400 });
    }

    // Snapshot current data (async fetchers)
    const contentBlocks = await Promise.all(
      blocks.map(async (block) => ({
        source_key: block.source_key,
        label: block.label,
        params: block.params,
        data: await fetchSourceData(block.source_key, block.params || {}),
      }))
    );
    const contentData = {
      blocks: contentBlocks,
      snapshot_at: new Date().toISOString(),
      newsletter_name: newsletter.name,
    };

    // Create a new draft issue with the snapshotted data
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const subject = `${newsletter.name} — ${today}`;

    const { data: issue, error: issueErr } = await supabase
      .from('newsletter_issues')
      .insert({
        newsletter_id: id,
        subject,
        body_html: '',
        content_data: contentData,
        generation_status: 'pending',
      })
      .select()
      .single();

    if (issueErr) {
      return NextResponse.json({ error: 'Failed to create issue', detail: issueErr.message }, { status: 500 });
    }

    // Log activity
    await supabase.from('newsletter_activity').insert({
      newsletter_id: id,
      type: 'issue_finalized',
      description: `Finalized content for "${subject}" with ${blocks.length} content blocks`,
      metadata: { issue_id: issue.id, block_count: blocks.length },
    });

    return NextResponse.json({ issue }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}
