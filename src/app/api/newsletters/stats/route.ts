import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { newsletterSupabase as supabase, isNewsletterConfigured } from '@/lib/newsletter-supabase';

// GET /api/newsletters/stats — Dashboard stats
export async function GET(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isNewsletterConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // Total unique active subscribers
    const { data: allSubs } = await supabase
      .from('newsletter_subscribers')
      .select('subscriber_id')
      .eq('status', 'active');
    const uniqueSubscribers = new Set(allSubs?.map((s: { subscriber_id: string }) => s.subscriber_id) || []);

    // Total newsletters
    const { data: newsletters } = await supabase
      .from('newsletters')
      .select('id, name, status');

    // Total issues sent
    const { data: sentIssues } = await supabase
      .from('newsletter_issues')
      .select('id, newsletter_id, sent_at')
      .eq('status', 'sent');

    // Subscriber counts per newsletter
    const subCountMap: Record<string, number> = {};
    if (allSubs) {
      for (const s of allSubs as Array<{ newsletter_id?: string; subscriber_id: string }>) {
        // We need newsletter_id too - re-query with it
      }
    }
    const { data: subsByNl } = await supabase
      .from('newsletter_subscribers')
      .select('newsletter_id, subscriber_id')
      .eq('status', 'active');
    if (subsByNl) {
      for (const s of subsByNl) {
        subCountMap[s.newsletter_id] = (subCountMap[s.newsletter_id] || 0) + 1;
      }
    }

    // Issues sent per newsletter
    const issueCountMap: Record<string, number> = {};
    const lastSentMap: Record<string, string> = {};
    if (sentIssues) {
      for (const issue of sentIssues) {
        issueCountMap[issue.newsletter_id] = (issueCountMap[issue.newsletter_id] || 0) + 1;
        if (!lastSentMap[issue.newsletter_id] || issue.sent_at > lastSentMap[issue.newsletter_id]) {
          lastSentMap[issue.newsletter_id] = issue.sent_at;
        }
      }
    }

    const newsletterStats = (newsletters || []).map((nl: { id: string; name: string; status: string }) => ({
      id: nl.id,
      name: nl.name,
      subscriber_count: subCountMap[nl.id] || 0,
      last_sent_at: lastSentMap[nl.id] || null,
      issues_sent: issueCountMap[nl.id] || 0,
      status: nl.status,
    }));

    return NextResponse.json({
      total_subscribers: uniqueSubscribers.size,
      total_newsletters: newsletters?.length || 0,
      total_issues_sent: sentIssues?.length || 0,
      newsletters: newsletterStats,
    });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}
