import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { newsletterSupabase as supabase, isNewsletterConfigured } from '@/lib/newsletter-supabase';

// DELETE /api/newsletters/contacts/[id] — Delete a contact
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

    // Get the subscriber first for logging
    const { data: subscriber } = await supabase
      .from('subscribers')
      .select('email')
      .eq('id', id)
      .single();

    if (!subscriber) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Delete from newsletter_subscribers (CASCADE should handle this, but be explicit)
    await supabase
      .from('newsletter_subscribers')
      .delete()
      .eq('subscriber_id', id);

    // Delete from subscribers
    const { error } = await supabase
      .from('subscribers')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete contact', detail: error.message }, { status: 500 });
    }

    // Log activity
    await supabase.from('newsletter_activity').insert({
      newsletter_id: null,
      type: 'subscriber_removed',
      description: `Deleted contact ${subscriber.email}`,
      metadata: { email: subscriber.email },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}

// PUT /api/newsletters/contacts/[id] — Update contact (name, newsletter subscriptions)
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
    const { name, newsletter_ids } = body;

    // Check the subscriber exists
    const { data: existing } = await supabase
      .from('subscribers')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Update name if provided
    if (name !== undefined) {
      await supabase
        .from('subscribers')
        .update({ name: name || null })
        .eq('id', id);
    }

    // Update newsletter subscriptions if provided
    if (newsletter_ids !== undefined && Array.isArray(newsletter_ids)) {
      // Get current subscriptions
      const { data: currentSubs } = await supabase
        .from('newsletter_subscribers')
        .select('newsletter_id, id, status')
        .eq('subscriber_id', id);

      const currentActiveIds = new Set(
        (currentSubs || [])
          .filter((s: { status: string }) => s.status === 'active')
          .map((s: { newsletter_id: string }) => s.newsletter_id)
      );
      const desiredIds = new Set(newsletter_ids);

      // Add new subscriptions
      for (const nlId of newsletter_ids) {
        if (!currentActiveIds.has(nlId)) {
          const existingJunction = (currentSubs || []).find(
            (s: { newsletter_id: string }) => s.newsletter_id === nlId
          );
          if (existingJunction) {
            // Re-activate
            await supabase
              .from('newsletter_subscribers')
              .update({ status: 'active', unsubscribed_at: null })
              .eq('id', (existingJunction as { id: string }).id);
          } else {
            await supabase
              .from('newsletter_subscribers')
              .insert({ newsletter_id: nlId, subscriber_id: id });
          }
        }
      }

      // Unsubscribe from removed newsletters
      for (const current of currentSubs || []) {
        const c = current as { newsletter_id: string; id: string; status: string };
        if (c.status === 'active' && !desiredIds.has(c.newsletter_id)) {
          await supabase
            .from('newsletter_subscribers')
            .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
            .eq('id', c.id);
        }
      }
    }

    // Fetch updated contact
    const { data: updated } = await supabase
      .from('subscribers')
      .select('*')
      .eq('id', id)
      .single();

    return NextResponse.json({ contact: updated });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}
