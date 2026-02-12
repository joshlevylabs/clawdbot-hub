import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { vaultSupabase as supabase, isVaultConfigured } from '@/lib/vault-supabase';
import { generateTOTPSecret, verifyTOTP } from '@/lib/vault-totp';
async function checkAuth(request: NextRequest): Promise<boolean> {
  try {
    return await isAuthenticated(request);
  } catch {
    return false;
  }
}

/** Create a short-lived TOTP verification cookie (10 min) */
function createTOTPCookie(response: NextResponse): NextResponse {
  // Set httpOnly cookie valid for 10 minutes
  response.cookies.set('vault-totp-verified', 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 10 * 60, // 10 minutes
    path: '/',
  });
  return response;
}

// GET /api/vault/totp — Check TOTP status
export async function GET(request: NextRequest) {
  if (!(await checkAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isVaultConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { data, error } = await supabase
      .from('vault_totp')
      .select('id, enabled, created_at')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[vault-totp] fetch error:', error);
      return NextResponse.json({ error: 'Failed to check TOTP status' }, { status: 500 });
    }

    // Check if TOTP cookie is present (already verified this session)
    const totpCookie = request.cookies.get('vault-totp-verified')?.value;

    return NextResponse.json({
      enabled: data?.enabled ?? false,
      setupRequired: !data,
      verified: totpCookie === 'true',
    });
  } catch (e) {
    console.error('[vault-totp] unexpected error:', e);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

// POST /api/vault/totp — Setup, verify, validate, or disable TOTP
export async function POST(request: NextRequest) {
  if (!(await checkAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isVaultConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { action, token } = body;

  switch (action) {
    case 'setup': {
      // Delete any existing un-enabled TOTP records
      await supabase.from('vault_totp').delete().eq('enabled', false);

      const { secret, uri } = generateTOTPSecret();

      const { error } = await supabase.from('vault_totp').insert({
        secret,
        enabled: false,
      });

      if (error) {
        console.error('[vault-totp] setup error:', error);
        return NextResponse.json({ error: 'Failed to setup TOTP' }, { status: 500 });
      }

      return NextResponse.json({ uri, secret });
    }

    case 'verify': {
      // Verify the first code after setup → enable TOTP
      if (!token || typeof token !== 'string') {
        return NextResponse.json({ error: 'Token required' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('vault_totp')
        .select('id, secret')
        .eq('enabled', false)
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        return NextResponse.json({ error: 'No pending TOTP setup found' }, { status: 400 });
      }

      const valid = verifyTOTP(data.secret, token);
      if (!valid) {
        return NextResponse.json({ success: false, error: 'Invalid code' }, { status: 400 });
      }

      // Enable TOTP
      const { error: updateError } = await supabase
        .from('vault_totp')
        .update({ enabled: true, updated_at: new Date().toISOString() })
        .eq('id', data.id);

      if (updateError) {
        console.error('[vault-totp] enable error:', updateError);
        return NextResponse.json({ error: 'Failed to enable TOTP' }, { status: 500 });
      }

      // Set verification cookie
      const response = NextResponse.json({ success: true });
      return createTOTPCookie(response);
    }

    case 'validate': {
      // Validate TOTP code for vault access
      if (!token || typeof token !== 'string') {
        return NextResponse.json({ error: 'Token required' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('vault_totp')
        .select('id, secret')
        .eq('enabled', true)
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        return NextResponse.json({ error: 'TOTP not enabled' }, { status: 400 });
      }

      const valid = verifyTOTP(data.secret, token);
      if (!valid) {
        return NextResponse.json({ valid: false, error: 'Invalid code' }, { status: 400 });
      }

      // Set verification cookie
      const response = NextResponse.json({ valid: true });
      return createTOTPCookie(response);
    }

    case 'disable': {
      // Disable TOTP — requires valid current code
      if (!token || typeof token !== 'string') {
        return NextResponse.json({ error: 'Token required' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('vault_totp')
        .select('id, secret')
        .eq('enabled', true)
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        return NextResponse.json({ error: 'TOTP not enabled' }, { status: 400 });
      }

      const valid = verifyTOTP(data.secret, token);
      if (!valid) {
        return NextResponse.json({ error: 'Invalid code — cannot disable 2FA' }, { status: 400 });
      }

      // Delete the TOTP record
      const { error: deleteError } = await supabase
        .from('vault_totp')
        .delete()
        .eq('id', data.id);

      if (deleteError) {
        console.error('[vault-totp] disable error:', deleteError);
        return NextResponse.json({ error: 'Failed to disable TOTP' }, { status: 500 });
      }

      // Clear the verification cookie
      const response = NextResponse.json({ success: true });
      response.cookies.set('vault-totp-verified', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/',
      });
      return response;
    }

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}
