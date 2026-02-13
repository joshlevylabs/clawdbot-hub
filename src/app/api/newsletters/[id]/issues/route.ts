import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { newsletterSupabase as supabase, isNewsletterConfigured } from '@/lib/newsletter-supabase';

// GET /api/newsletters/[id]/issues — List issues for a newsletter
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

    const { data, error } = await supabase
      .from('newsletter_issues')
      .select('*')
      .eq('newsletter_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch issues', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ issues: data || [] });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}

// POST /api/newsletters/[id]/issues — Create a new draft issue
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
    const { subject, body_html, body_text } = body;

    if (!subject) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('newsletter_issues')
      .insert({
        newsletter_id: id,
        subject,
        body_html: body_html || '',
        body_text: body_text || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create issue', detail: error.message }, { status: 500 });
    }

    // Log activity
    await supabase.from('newsletter_activity').insert({
      newsletter_id: id,
      type: 'issue_created',
      description: `Created draft issue "${subject}"`,
      metadata: { issue_id: data.id },
    });

    return NextResponse.json({ issue: data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}
