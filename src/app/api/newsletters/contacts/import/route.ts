import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { newsletterSupabase as supabase, isNewsletterConfigured } from '@/lib/newsletter-supabase';

// POST /api/newsletters/contacts/import — Bulk import contacts
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isNewsletterConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { emails: rawEmails, newsletter_ids } = body;

    if (!rawEmails) {
      return NextResponse.json({ error: 'emails field is required' }, { status: 400 });
    }

    // Parse emails — handle comma, newline, semicolon separators
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const parsed = rawEmails
      .split(/[,;\n\r]+/)
      .map((e: string) => e.trim().toLowerCase())
      .filter((e: string) => e.length > 0);

    const valid: string[] = [];
    const invalid: string[] = [];
    const seen = new Set<string>();

    for (const email of parsed) {
      if (seen.has(email)) continue;
      seen.add(email);
      if (emailRegex.test(email)) {
        valid.push(email);
      } else {
        invalid.push(email);
      }
    }

    let imported = 0;
    let skipped = 0;

    for (const email of valid) {
      // Upsert subscriber
      let subscriberId: string;
      const { data: existing } = await supabase
        .from('subscribers')
        .select('id')
        .eq('email', email)
        .single();

      if (existing) {
        subscriberId = existing.id;
      } else {
        const { data: newSub, error } = await supabase
          .from('subscribers')
          .insert({ email })
          .select('id')
          .single();
        if (error || !newSub) {
          skipped++;
          continue;
        }
        subscriberId = newSub.id;
        imported++;
      }

      if (!existing) {
        // Already counted as imported above
      } else {
        imported++;
      }

      // Assign to newsletters if provided
      if (newsletter_ids && Array.isArray(newsletter_ids) && newsletter_ids.length > 0) {
        for (const nlId of newsletter_ids) {
          const { data: existingJunction } = await supabase
            .from('newsletter_subscribers')
            .select('id, status')
            .eq('newsletter_id', nlId)
            .eq('subscriber_id', subscriberId)
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
              .insert({ newsletter_id: nlId, subscriber_id: subscriberId });
          }
        }
      }
    }

    // Log activity
    await supabase.from('newsletter_activity').insert({
      newsletter_id: null,
      type: 'subscribers_imported',
      description: `Imported ${imported} contacts (${skipped} skipped, ${invalid.length} invalid)`,
      metadata: { imported, skipped, invalid: invalid.length, newsletter_ids: newsletter_ids || [] },
    });

    return NextResponse.json({ imported, skipped, invalid: invalid.length });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}
