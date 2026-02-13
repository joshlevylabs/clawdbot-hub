import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { newsletterSupabase as supabase, isNewsletterConfigured } from '@/lib/newsletter-supabase';

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

async function getNewsletter(idOrSlug: string) {
  if (isUUID(idOrSlug)) {
    return supabase.from('newsletters').select('*').eq('id', idOrSlug).single();
  }
  return supabase.from('newsletters').select('*').eq('slug', idOrSlug).single();
}

// GET /api/newsletters/[id] — Get single newsletter
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
    const { data, error } = await getNewsletter(id);

    if (error || !data) {
      return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
    }

    // Get subscriber count
    const { data: subs } = await supabase
      .from('newsletter_subscribers')
      .select('id')
      .eq('newsletter_id', data.id)
      .eq('status', 'active');

    // Get latest issue sent_at
    const { data: latestIssue } = await supabase
      .from('newsletter_issues')
      .select('sent_at')
      .eq('newsletter_id', data.id)
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(1);

    return NextResponse.json({
      newsletter: {
        ...data,
        subscriber_count: subs?.length || 0,
        last_sent_at: latestIssue?.[0]?.sent_at || null,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}

// PUT /api/newsletters/[id] — Update newsletter settings
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
    const { name, description, category, cadence, sender_name, status } = body;

    // Resolve the newsletter
    const { data: existing } = await getNewsletter(id);
    if (!existing) {
      return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (cadence !== undefined) updates.cadence = cadence;
    if (sender_name !== undefined) updates.sender_name = sender_name;
    if (status !== undefined) updates.status = status;

    const { data, error } = await supabase
      .from('newsletters')
      .update(updates)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update newsletter', detail: error.message }, { status: 500 });
    }

    // Log activity
    await supabase.from('newsletter_activity').insert({
      newsletter_id: existing.id,
      type: 'newsletter_updated',
      description: `Updated newsletter "${data.name}"`,
      metadata: { fields: Object.keys(updates).filter(k => k !== 'updated_at') },
    });

    return NextResponse.json({ newsletter: data });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}

// DELETE /api/newsletters/[id] — Delete newsletter
export async function DELETE(
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
    const { data: existing } = await getNewsletter(id);
    if (!existing) {
      return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('newsletters')
      .delete()
      .eq('id', existing.id);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete newsletter', detail: error.message }, { status: 500 });
    }

    // Log activity (newsletter_id will be null due to CASCADE)
    await supabase.from('newsletter_activity').insert({
      newsletter_id: null,
      type: 'newsletter_deleted',
      description: `Deleted newsletter "${existing.name}"`,
      metadata: { slug: existing.slug },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}
