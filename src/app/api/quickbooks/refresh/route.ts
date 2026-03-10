import { NextRequest, NextResponse } from 'next/server';

import { isAuthenticated } from '@/lib/auth';
import { getValidAccessToken } from '@/lib/quickbooks';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authed = await isAuthenticated(request);
    if (!authed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Attempt to get a valid access token (this will refresh if needed)
    const tokenData = await getValidAccessToken();

    if (!tokenData) {
      return NextResponse.json(
        { 
          error: 'Failed to refresh QuickBooks access token. Please reconnect.',
          code: 'REFRESH_FAILED' 
        },
        { status: 403 }
      );
    }

    // Return success with token status
    return NextResponse.json({
      success: true,
      message: 'Access token refreshed successfully',
      data: {
        realmId: tokenData.realm_id,
        tokenStatus: 'valid',
        refreshedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Token refresh API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Failed to refresh access token',
        message: process.env.NODE_ENV === 'development' ? errorMessage : 'Token refresh failed',
        code: 'REFRESH_ERROR'
      },
      { status: 500 }
    );
  }
}