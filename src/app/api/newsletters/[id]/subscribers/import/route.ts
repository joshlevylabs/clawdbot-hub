import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { newsletterSupabase as supabase, isNewsletterConfigured } from '@/lib/newsletter-supabase';

// POST /api/newsletters/[id]/subscribers/import — Bulk import emails
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
    const { emails: rawEmails } = body;

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
      }

      // Check existing junction
      const { data: existingJunction } = await supabase
        .from('newsletter_subscribers')
        .select('id, status')
        .eq('newsletter_id', id)
        .eq('subscriber_id', subscriberId)
        .single();

      if (existingJunction) {
        if (existingJunction.status === 'active') {
          skipped++;
        } else {
          // Re-activate
          await supabase
            .from('newsletter_subscribers')
            .update({ status: 'active', unsubscribed_at: null })
            .eq('id', existingJunction.id);
          imported++;
        }
      } else {
        const { error: jErr } = await supabase
          .from('newsletter_subscribers')
          .insert({ newsletter_id: id, subscriber_id: subscriberId });
        if (jErr) {
          skipped++;
        } else {
          imported++;
        }
      }
    }

    // Log activity
    await supabase.from('newsletter_activity').insert({
      newsletter_id: id,
      type: 'subscribers_imported',
      description: `Imported ${imported} subscribers (${skipped} skipped, ${invalid.length} invalid)`,
      metadata: { imported, skipped, invalid: invalid.length },
    });

    return NextResponse.json({ imported, skipped, invalid: invalid.length });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}
