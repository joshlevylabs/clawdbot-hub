import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { newsletterSupabase as supabase, isNewsletterConfigured } from '@/lib/newsletter-supabase';

// POST /api/newsletters/[id]/issues/[issueId]/send — Mark issue as sent
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

    // Load the issue
    const { data: issue, error: issueError } = await supabase
      .from('newsletter_issues')
      .select('*')
      .eq('id', issueId)
      .eq('newsletter_id', id)
      .single();

    if (issueError || !issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    if (issue.status === 'sent') {
      return NextResponse.json({ error: 'Issue has already been sent' }, { status: 400 });
    }

    // Count active subscribers
    const { data: subs } = await supabase
      .from('newsletter_subscribers')
      .select('id')
      .eq('newsletter_id', id)
      .eq('status', 'active');

    const recipientCount = subs?.length || 0;

    // Update issue
    const { data: updated, error: updateError } = await supabase
      .from('newsletter_issues')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        recipient_count: recipientCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', issueId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to send issue', detail: updateError.message }, { status: 500 });
    }

    // Log activity
    await supabase.from('newsletter_activity').insert({
      newsletter_id: id,
      type: 'issue_sent',
      description: `Sent "${issue.subject}" to ${recipientCount} subscribers`,
      metadata: { issue_id: issueId, recipient_count: recipientCount },
    });

    return NextResponse.json({ issue: updated });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}
