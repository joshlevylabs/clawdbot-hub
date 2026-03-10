import { NextRequest, NextResponse } from 'next/server';

import { isAuthenticated } from '@/lib/auth';
import { fetchExpenseBreakdown } from '@/lib/quickbooks';

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

    // Fetch expense breakdown from QuickBooks
    const expenseData = await fetchExpenseBreakdown(startDate, endDate);

    // Calculate totals and percentages
    const totalExpenses = expenseData.reduce((sum, expense) => sum + expense.amount, 0);
    const expensesWithPercentages = expenseData.map(expense => ({
      ...expense,
      percentage: totalExpenses > 0 ? (expense.amount / totalExpenses) * 100 : 0,
    }));

    // Return the data with metadata
    return NextResponse.json({
      success: true,
      data: {
        expenses: expensesWithPercentages,
        totalExpenses,
        period: `${startDate} to ${endDate}`,
      },
      meta: {
        source: 'QuickBooks API',
        startDate,
        endDate,
        expenseCategories: expenseData.length,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Expenses API error:', error);
    
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