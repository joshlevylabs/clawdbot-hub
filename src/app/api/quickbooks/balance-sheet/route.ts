import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchBalanceSheetReport } from '@/lib/quickbooks';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const asOfDate = searchParams.get('as_of_date'); // Optional parameter

    // Validate date format if provided (YYYY-MM-DD)
    if (asOfDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(asOfDate)) {
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD' },
          { status: 400 }
        );
      }
    }

    // Fetch Balance Sheet data from QuickBooks
    const balanceSheetData = await fetchBalanceSheetReport(asOfDate || undefined);

    if (!balanceSheetData) {
      return NextResponse.json(
        { error: 'Failed to fetch Balance Sheet data from QuickBooks' },
        { status: 500 }
      );
    }

    // Return the data with metadata
    return NextResponse.json({
      success: true,
      data: balanceSheetData,
      meta: {
        source: 'QuickBooks API',
        asOfDate: asOfDate || 'current',
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Balance Sheet API error:', error);
    
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