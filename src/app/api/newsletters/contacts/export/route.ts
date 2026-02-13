import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { newsletterSupabase as supabase, isNewsletterConfigured } from '@/lib/newsletter-supabase';

// GET /api/newsletters/contacts/export — Export all contacts as CSV
export async function GET(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isNewsletterConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // Fetch all subscribers
    const { data: subscribers, error } = await supabase
      .from('subscribers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch contacts', detail: error.message }, { status: 500 });
    }

    if (!subscribers || subscribers.length === 0) {
      const csvContent = 'Email,Name,Newsletters,Created\n';
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="contacts.csv"',
        },
      });
    }

    // Fetch all junctions
    const subscriberIds = subscribers.map((s: { id: string }) => s.id);
    const { data: junctions } = await supabase
      .from('newsletter_subscribers')
      .select('subscriber_id, newsletter_id, status')
      .in('subscriber_id', subscriberIds)
      .eq('status', 'active');

    // Fetch newsletters for names
    const { data: newsletters } = await supabase
      .from('newsletters')
      .select('id, name');

    const newsletterMap: Record<string, string> = {};
    if (newsletters) {
      for (const nl of newsletters) {
        newsletterMap[nl.id] = nl.name;
      }
    }

    // Build CSV
    const rows: string[] = ['Email,Name,Newsletters,Created'];

    for (const sub of subscribers) {
      const s = sub as { id: string; email: string; name: string | null; created_at: string };
      const nlNames = (junctions || [])
        .filter((j: { subscriber_id: string }) => j.subscriber_id === s.id)
        .map((j: { newsletter_id: string }) => newsletterMap[j.newsletter_id] || 'Unknown')
        .join('; ');

      const escapeCsv = (val: string) => {
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      };

      rows.push([
        escapeCsv(s.email),
        escapeCsv(s.name || ''),
        escapeCsv(nlNames),
        escapeCsv(new Date(s.created_at).toISOString().split('T')[0]),
      ].join(','));
    }

    const csvContent = rows.join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="contacts-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}
