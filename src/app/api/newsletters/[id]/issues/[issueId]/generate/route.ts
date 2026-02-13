import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { newsletterSupabase as supabase, isNewsletterConfigured } from '@/lib/newsletter-supabase';

// POST /api/newsletters/[id]/issues/[issueId]/generate — Mark issue as pending generation
// After clicking this, tell Theo "generate newsletter" on Telegram to trigger generation.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; issueId: string }> }
) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isNewsletterConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id, issueId } = await params;

    // Get newsletter
    const { data: newsletter, error: nlErr } = await supabase
      .from('newsletters')
      .select('*')
      .eq('id', id)
      .single();

    if (nlErr || !newsletter) {
      return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
    }

    // Get issue with content_data
    const { data: issue, error: issueErr } = await supabase
      .from('newsletter_issues')
      .select('*')
      .eq('id', issueId)
      .eq('newsletter_id', id)
      .single();

    if (issueErr || !issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    if (!issue.content_data) {
      return NextResponse.json({ error: 'Issue has no content data. Finalize first.' }, { status: 400 });
    }

    if (issue.generation_status === 'generating') {
      return NextResponse.json({ error: 'Generation already in progress' }, { status: 409 });
    }

    // Set generation status to pending
    const { error: updateErr } = await supabase
      .from('newsletter_issues')
      .update({
        generation_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', issueId);

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to update status', detail: updateErr.message }, { status: 500 });
    }

    // Log activity
    await supabase.from('newsletter_activity').insert({
      newsletter_id: id,
      type: 'generation_requested',
      description: `Queued "${issue.subject}" for Theo to generate`,
      metadata: { issue_id: issueId },
    });

    return NextResponse.json({
      success: true,
      message: 'Queued for generation. Tell Theo "generate newsletter" on Telegram.',
      issue_id: issueId,
      generation_status: 'pending',
    });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}
