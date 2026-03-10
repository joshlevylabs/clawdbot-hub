import { NextRequest, NextResponse } from 'next/server';

import { isAuthenticated } from '@/lib/auth';
import { fetchProfitLossReport } from '@/lib/quickbooks';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authed = await isAuthenticated(request);
    if (!authed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: start_date, end_date' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Ensure start date is before end date
    if (new Date(startDate) >= new Date(endDate)) {
      return NextResponse.json(
        { error: 'start_date must be before end_date' },
        { status: 400 }
      );
    }

    // Fetch P&L data from QuickBooks
    const pnlData = await fetchProfitLossReport(startDate, endDate);

    if (!pnlData) {
      return NextResponse.json(
        { error: 'Failed to fetch P&L data from QuickBooks' },
        { status: 500 }
      );
    }

    // Return the data with metadata
    return NextResponse.json({
      success: true,
      data: pnlData,
      meta: {
        source: 'QuickBooks API',
        startDate,
        endDate,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('P&L API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Handle specific QuickBooks errors
    if (errorMessage.includes('No valid QuickBooks access token')) {
      return NextResponse.json(
        { 
          error: 'QuickBooks connection expired. Please reconnect.',
          code: 'TOKEN_EXPIRED' 
        },
        { status: 403 }
      );
    }

    if (errorMessage.includes('QuickBooks API error')) {
      return NextResponse.json(
        { 
          error: 'QuickBooks API error. Please try again later.',
          details: errorMessage 
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? errorMessage : undefined 
      },
      { status: 500 }
    );
  }
}