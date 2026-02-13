import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { newsletterSupabase as supabase, isNewsletterConfigured } from '@/lib/newsletter-supabase';

// GET /api/newsletters/contacts — List all subscribers with their newsletter memberships
export async function GET(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isNewsletterConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';

    // Fetch all subscribers
    let query = supabase
      .from('subscribers')
      .select('*')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }

    const { data: subscribers, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch contacts', detail: error.message }, { status: 500 });
    }

    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json({ contacts: [] });
    }

    // Fetch all newsletter_subscribers junctions
    const subscriberIds = subscribers.map((s: { id: string }) => s.id);
    const { data: junctions } = await supabase
      .from('newsletter_subscribers')
      .select('subscriber_id, newsletter_id, status')
      .in('subscriber_id', subscriberIds);

    // Fetch all newsletters for name mapping
    const { data: newsletters } = await supabase
      .from('newsletters')
      .select('id, name, slug');

    const newsletterMap: Record<string, { id: string; name: string; slug: string }> = {};
    if (newsletters) {
      for (const nl of newsletters) {
        newsletterMap[nl.id] = nl;
      }
    }

    // Build contact objects with newsletter memberships
    const contacts = subscribers.map((sub: { id: string; email: string; name: string | null; created_at: string }) => {
      const memberships = (junctions || [])
        .filter((j: { subscriber_id: string }) => j.subscriber_id === sub.id)
        .map((j: { newsletter_id: string; status: string }) => ({
          newsletter_id: j.newsletter_id,
          newsletter_name: newsletterMap[j.newsletter_id]?.name || 'Unknown',
          newsletter_slug: newsletterMap[j.newsletter_id]?.slug || '',
          status: j.status,
        }));

      return {
        ...sub,
        newsletters: memberships,
      };
    });

    return NextResponse.json({ contacts });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}

// POST /api/newsletters/contacts — Add a single contact
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isNewsletterConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { email, name, newsletter_ids } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Upsert subscriber
    const { data: existing } = await supabase
      .from('subscribers')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    let subscriber;
    if (existing) {
      // Update name if provided and not set
      if (name && !existing.name) {
        await supabase.from('subscribers').update({ name }).eq('id', existing.id);
        subscriber = { ...existing, name };
      } else {
        subscriber = existing;
      }
    } else {
      const { data: newSub, error } = await supabase
        .from('subscribers')
        .insert({ email: normalizedEmail, name: name || null })
        .select()
        .single();
      if (error || !newSub) {
        return NextResponse.json({ error: 'Failed to create contact', detail: error?.message }, { status: 500 });
      }
      subscriber = newSub;
    }

    // Assign to newsletters if provided
    if (newsletter_ids && Array.isArray(newsletter_ids) && newsletter_ids.length > 0) {
      for (const nlId of newsletter_ids) {
        const { data: existingJunction } = await supabase
          .from('newsletter_subscribers')
          .select('id, status')
          .eq('newsletter_id', nlId)
          .eq('subscriber_id', subscriber.id)
          .single();

        if (existingJunction) {
          if (existingJunction.status !== 'active') {
            await supabase
              .from('newsletter_subscribers')
              .update({ status: 'active', unsubscribed_at: null })
              .eq('id', existingJunction.id);
          }
        } else {
          await supabase
            .from('newsletter_subscribers')
            .insert({ newsletter_id: nlId, subscriber_id: subscriber.id });
        }
      }
    }

    // Log activity
    await supabase.from('newsletter_activity').insert({
      newsletter_id: null,
      type: 'subscriber_added',
      description: `Added contact ${normalizedEmail}`,
      metadata: { email: normalizedEmail, newsletter_ids: newsletter_ids || [] },
    });

    return NextResponse.json({ contact: subscriber, status: existing ? 'already_existed' : 'created' }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}
