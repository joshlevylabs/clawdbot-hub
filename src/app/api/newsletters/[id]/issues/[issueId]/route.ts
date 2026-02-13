import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { newsletterSupabase as supabase, isNewsletterConfigured } from '@/lib/newsletter-supabase';

// GET /api/newsletters/[id]/issues/[issueId] — Get single issue
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; issueId: string }> }
) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isNewsletterConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id, issueId } = await params;

    const { data, error } = await supabase
      .from('newsletter_issues')
      .select('*')
      .eq('id', issueId)
      .eq('newsletter_id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    return NextResponse.json({ issue: data });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}

// PUT /api/newsletters/[id]/issues/[issueId] — Update issue (save draft)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; issueId: string }> }
) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isNewsletterConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id, issueId } = await params;
    const body = await request.json();
    const { subject, body_html, body_text } = body;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (subject !== undefined) updates.subject = subject;
    if (body_html !== undefined) updates.body_html = body_html;
    if (body_text !== undefined) updates.body_text = body_text;

    const { data, error } = await supabase
      .from('newsletter_issues')
      .update(updates)
      .eq('id', issueId)
      .eq('newsletter_id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update issue', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ issue: data });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}

// DELETE /api/newsletters/[id]/issues/[issueId] — Delete issue
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; issueId: string }> }
) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isNewsletterConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { id, issueId } = await params;

    const { error } = await supabase
      .from('newsletter_issues')
      .delete()
      .eq('id', issueId)
      .eq('newsletter_id', id);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete issue', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(e) }, { status: 500 });
  }
}
