import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { newsletterSupabase as supabase, isNewsletterConfigured } from '@/lib/newsletter-supabase';

// GET /api/newsletters/[id]/subscribers — List subscribers for a newsletter
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

    // Get newsletter_subscribers with joined subscriber data
    const { data: junctions, error } = await supabase
      .from('newsletter_subscribers')
      .select('id, newsletter_id, subscriber_id, status, subscribed_at, unsubscribed_at')
      .eq('newsletter_id', id)
      .order('subscribed_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch subscribers', detail: error.message }, { status: 500 });
    }

    if (!junctions || junctions.length === 0) {
      return NextResponse.json({ subscribers: [] });
    }

    // Fetch subscriber details
    const subscriberIds = junctions.map((j: { subscriber_id: string }) => j.subscriber_id);
    const { data: subscribers } = await supabase
      .from('subscribers')
      .select('*')
      .in('id', subscriberIds);

    const subMap: Record<string, { id: string; email: string; name: string | null; created_at: string }> = {};
    if (subscribers) {
      for (const s of subscribers) {
        subMap[s.id] = s;
      }
    }

    const enriched = junctions.map((j: { subscriber_id: string; id: string; newsletter_id: string; status: string; subscribed_at: string; unsubscribed_at: string | null }) => ({
      ...j,
      subscriber: subMap[j.subscriber_id] || null,
    }));

    return NextResponse.json({ subscribers: enriched });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}

// POST /api/newsletters/[id]/subscribers — Add subscriber
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
    const body = await request.json();
    const { email, name } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Upsert subscriber
    const { data: existingSub } = await supabase
      .from('subscribers')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    let subscriber;
    if (existingSub) {
      subscriber = existingSub;
      // Update name if provided
      if (name && !existingSub.name) {
        await supabase.from('subscribers').update({ name }).eq('id', existingSub.id);
      }
    } else {
      const { data: newSub, error } = await supabase
        .from('subscribers')
        .insert({ email: email.toLowerCase().trim(), name: name || null })
        .select()
        .single();
      if (error) {
        return NextResponse.json({ error: 'Failed to create subscriber', detail: error.message }, { status: 500 });
      }
      subscriber = newSub;
    }

    // Check if already subscribed
    const { data: existingJunction } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .eq('newsletter_id', id)
      .eq('subscriber_id', subscriber.id)
      .single();

    if (existingJunction) {
      if (existingJunction.status === 'active') {
        return NextResponse.json({ subscriber, status: 'already_subscribed' });
      }
      // Re-activate
      await supabase
        .from('newsletter_subscribers')
        .update({ status: 'active', unsubscribed_at: null, subscribed_at: new Date().toISOString() })
        .eq('id', existingJunction.id);
    } else {
      const { error: junctionError } = await supabase
        .from('newsletter_subscribers')
        .insert({ newsletter_id: id, subscriber_id: subscriber.id });
      if (junctionError) {
        return NextResponse.json({ error: 'Failed to subscribe', detail: junctionError.message }, { status: 500 });
      }
    }

    // Log activity
    await supabase.from('newsletter_activity').insert({
      newsletter_id: id,
      type: 'subscriber_added',
      description: `Added subscriber ${email}`,
      metadata: { email },
    });

    return NextResponse.json({ subscriber, status: 'added' }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}

// DELETE /api/newsletters/[id]/subscribers — Remove/unsubscribe
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
    const { searchParams } = new URL(request.url);
    const subscriberId = searchParams.get('subscriber_id');

    if (!subscriberId) {
      return NextResponse.json({ error: 'subscriber_id is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('newsletter_subscribers')
      .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
      .eq('newsletter_id', id)
      .eq('subscriber_id', subscriberId);

    if (error) {
      return NextResponse.json({ error: 'Failed to unsubscribe', detail: error.message }, { status: 500 });
    }

    // Log activity
    await supabase.from('newsletter_activity').insert({
      newsletter_id: id,
      type: 'subscriber_removed',
      description: `Removed subscriber`,
      metadata: { subscriber_id: subscriberId },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}
