import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { newsletterSupabase as supabase, isNewsletterConfigured } from '@/lib/newsletter-supabase';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// GET /api/newsletters — List all newsletters with subscriber counts
export async function GET(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isNewsletterConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // Fetch all newsletters
    const { data: newsletters, error } = await supabase
      .from('newsletters')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch newsletters', detail: error.message }, { status: 500 });
    }

    if (!newsletters || newsletters.length === 0) {
      return NextResponse.json({ newsletters: [] });
    }

    // Fetch subscriber counts
    const { data: subCounts } = await supabase
      .from('newsletter_subscribers')
      .select('newsletter_id')
      .eq('status', 'active');

    const countMap: Record<string, number> = {};
    if (subCounts) {
      for (const row of subCounts) {
        countMap[row.newsletter_id] = (countMap[row.newsletter_id] || 0) + 1;
      }
    }

    // Fetch latest sent issue per newsletter
    const { data: latestIssues } = await supabase
      .from('newsletter_issues')
      .select('newsletter_id, sent_at')
      .eq('status', 'sent')
      .order('sent_at', { ascending: false });

    const lastSentMap: Record<string, string> = {};
    if (latestIssues) {
      for (const issue of latestIssues) {
        if (!lastSentMap[issue.newsletter_id]) {
          lastSentMap[issue.newsletter_id] = issue.sent_at;
        }
      }
    }

    // Merge
    const enriched = newsletters.map((nl: Record<string, unknown>) => ({
      ...nl,
      subscriber_count: countMap[nl.id as string] || 0,
      last_sent_at: lastSentMap[nl.id as string] || null,
    }));

    return NextResponse.json({ newsletters: enriched });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}

// POST /api/newsletters — Create a new newsletter
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isNewsletterConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { name, description, category, cadence, sender_name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Generate slug and ensure uniqueness
    let slug = slugify(name);
    const { data: existing } = await supabase
      .from('newsletters')
      .select('slug')
      .like('slug', `${slug}%`);

    if (existing && existing.length > 0) {
      const slugs = new Set(existing.map((e: { slug: string }) => e.slug));
      if (slugs.has(slug)) {
        let i = 2;
        while (slugs.has(`${slug}-${i}`)) i++;
        slug = `${slug}-${i}`;
      }
    }

    const { data, error } = await supabase
      .from('newsletters')
      .insert({
        name,
        description: description || null,
        slug,
        category: category || null,
        cadence: cadence || 'weekly',
        sender_name: sender_name || 'Joshua Levy',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create newsletter', detail: error.message }, { status: 500 });
    }

    // Log activity
    await supabase.from('newsletter_activity').insert({
      newsletter_id: data.id,
      type: 'newsletter_created',
      description: `Created newsletter "${name}"`,
      metadata: { slug },
    });

    return NextResponse.json({ newsletter: data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}
