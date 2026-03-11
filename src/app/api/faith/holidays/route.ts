import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '2026');
    const month = searchParams.get('month');
    const tradition = searchParams.get('tradition');

    let query = supabase
      .from('faith_holidays')
      .select('*')
      .gte('start_date', `${year}-01-01`)
      .lt('start_date', `${year + 1}-01-01`)
      .order('start_date', { ascending: true });

    // Filter by month if provided
    if (month) {
      const monthNum = parseInt(month);
      if (monthNum >= 1 && monthNum <= 12) {
        const monthStr = monthNum.toString().padStart(2, '0');
        query = query
          .gte('start_date', `${year}-${monthStr}-01`)
          .lt('start_date', `${year}-${monthStr}-31T23:59:59`);
      }
    }

    // Filter by tradition if provided
    if (tradition) {
      query = query.eq('tradition', tradition);
    }

    const { data: holidays, error } = await query;

    if (error) {
      console.error('Error fetching faith holidays:', error);
      return NextResponse.json(
        { error: 'Failed to fetch holidays' },
        { status: 500 }
      );
    }

    // Transform the data to match the expected response format
    const transformedHolidays = holidays?.map(holiday => ({
      name: holiday.name,
      tradition: holiday.tradition,
      startDate: holiday.start_date,
      endDate: holiday.end_date,
      description: holiday.description,
      emoji: holiday.emoji,
      calendarSystem: holiday.calendar_system,
      nativeDate: holiday.native_date,
      source: holiday.source
    })) || [];

    return NextResponse.json({
      holidays: transformedHolidays,
      year,
      count: transformedHolidays.length
    });

  } catch (error) {
    console.error('Unexpected error in faith holidays API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}