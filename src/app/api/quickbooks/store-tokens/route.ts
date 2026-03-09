import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { access_token, refresh_token, realm_id, expires_in, x_refresh_token_expires_in } = body;

    if (!access_token || !refresh_token || !realm_id) {
      return NextResponse.json({ error: 'Missing required token fields' }, { status: 400 });
    }

    // Store tokens in Supabase (encrypted at rest)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { error } = await supabase
      .from('quickbooks_tokens')
      .upsert({
        id: 'primary',
        realm_id,
        access_token,
        refresh_token,
        expires_at: new Date(Date.now() + (expires_in || 3600) * 1000).toISOString(),
        refresh_expires_at: new Date(Date.now() + (x_refresh_token_expires_in || 8726400) * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) {
      console.error('Failed to store QB tokens:', error);
      // Don't fail - tokens were already displayed to user
      return NextResponse.json({ stored: false, error: error.message });
    }

    return NextResponse.json({ stored: true, realm_id });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Store tokens error:', errorMessage);
    return NextResponse.json({ stored: false, error: errorMessage }, { status: 500 });
  }
}
