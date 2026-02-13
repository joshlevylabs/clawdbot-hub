import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { newsletterSupabase as supabase, isNewsletterConfigured } from '@/lib/newsletter-supabase';

// POST /api/newsletters/[id]/issues/[issueId]/generate — Send to Theo via Gateway
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

  const gatewayUrl = process.env.CLAWDBOT_GATEWAY_URL || 'http://127.0.0.1:18789';
  const gatewayToken = process.env.CLAWDBOT_GATEWAY_TOKEN;

  if (!gatewayToken) {
    return NextResponse.json({ error: 'Gateway token not configured' }, { status: 500 });
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

    // Update generation status to 'generating'
    await supabase
      .from('newsletter_issues')
      .update({ generation_status: 'generating' })
      .eq('id', issueId);

    // Send to Theo via Gateway
    const payload = {
      newsletter_id: id,
      newsletter_name: newsletter.name,
      newsletter_slug: newsletter.slug,
      issue_id: issueId,
      subject: issue.subject,
      content_data: issue.content_data,
    };

    const response = await fetch(`${gatewayUrl}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${gatewayToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tool: 'sessions_send',
        args: {
          message: `NEWSLETTER_GENERATE: ${JSON.stringify(payload)}`,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      // Revert status
      await supabase
        .from('newsletter_issues')
        .update({ generation_status: 'pending' })
        .eq('id', issueId);

      return NextResponse.json({
        error: 'Failed to send to Theo',
        detail: errText,
      }, { status: 502 });
    }

    // Log activity
    await supabase.from('newsletter_activity').insert({
      newsletter_id: id,
      type: 'generation_requested',
      description: `Sent "${issue.subject}" to Theo for generation`,
      metadata: { issue_id: issueId },
    });

    return NextResponse.json({
      success: true,
      message: 'Sent to Theo for generation. Refresh to check status.',
      issue_id: issueId,
    });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}
