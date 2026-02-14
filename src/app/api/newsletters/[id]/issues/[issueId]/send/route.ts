import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { newsletterSupabase as supabase, isNewsletterConfigured } from '@/lib/newsletter-supabase';
import { sendNewsletter, closeMailer } from '@/lib/mailer';

const SEND_DELAY_MS = 200;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// POST /api/newsletters/[id]/issues/[issueId]/send — Send issue via email
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

    // Load the newsletter for sender_name
    const { data: newsletter, error: nlError } = await supabase
      .from('newsletters')
      .select('name, sender_name, slug')
      .eq('id', id)
      .single();

    if (nlError || !newsletter) {
      return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
    }

    // Load ALL active subscribers for this newsletter (join with subscribers table)
    const { data: junctions, error: junctionError } = await supabase
      .from('newsletter_subscribers')
      .select('subscriber_id, status')
      .eq('newsletter_id', id)
      .eq('status', 'active');

    if (junctionError) {
      return NextResponse.json({ error: 'Failed to load subscribers', detail: junctionError.message }, { status: 500 });
    }

    if (!junctions || junctions.length === 0) {
      return NextResponse.json({ error: 'No active subscribers to send to' }, { status: 400 });
    }

    // Fetch subscriber details (email + name)
    const subscriberIds = junctions.map((j: { subscriber_id: string }) => j.subscriber_id);
    const { data: subscribers, error: subError } = await supabase
      .from('subscribers')
      .select('id, email, name')
      .in('id', subscriberIds);

    if (subError || !subscribers || subscribers.length === 0) {
      return NextResponse.json({ error: 'Failed to load subscriber details', detail: subError?.message }, { status: 500 });
    }

    // Send emails one at a time
    let successCount = 0;
    let failureCount = 0;
    const failures: Array<{ email: string; error: string }> = [];

    const senderName = newsletter.sender_name || newsletter.name;

    for (let i = 0; i < subscribers.length; i++) {
      const sub = subscribers[i];
      try {
        await sendNewsletter({
          to: sub.email,
          toName: sub.name || undefined,
          subject: issue.subject,
          html: issue.body_html,
          senderName,
          replyTo: process.env.SMTP_USER || 'josh@joshlevylabs.com',
        });
        successCount++;
      } catch (err) {
        failureCount++;
        failures.push({
          email: sub.email,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      // Delay between sends to avoid Gmail rate limits
      if (i < subscribers.length - 1) {
        await delay(SEND_DELAY_MS);
      }
    }

    // Close the pooled connection
    closeMailer();

    // Update issue status
    const { data: updated, error: updateError } = await supabase
      .from('newsletter_issues')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        recipient_count: successCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', issueId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Emails sent but failed to update issue status', detail: updateError.message }, { status: 500 });
    }

    // Log activity with success/failure details
    const description = failureCount > 0
      ? `Sent "${issue.subject}" to ${successCount}/${subscribers.length} subscribers (${failureCount} failed)`
      : `Sent "${issue.subject}" to ${successCount} subscribers`;

    await supabase.from('newsletter_activity').insert({
      newsletter_id: id,
      type: 'issue_sent',
      description,
      metadata: {
        issue_id: issueId,
        total_subscribers: subscribers.length,
        success_count: successCount,
        failure_count: failureCount,
        failures: failures.length > 0 ? failures : undefined,
      },
    });

    return NextResponse.json({
      issue: updated,
      send_results: {
        total: subscribers.length,
        success: successCount,
        failed: failureCount,
        failures: failures.length > 0 ? failures : undefined,
      },
    });
  } catch (e) {
    closeMailer();
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}
