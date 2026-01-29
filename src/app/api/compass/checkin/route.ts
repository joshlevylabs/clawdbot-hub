import { NextRequest, NextResponse } from 'next/server';

// Vercel has read-only filesystem, so we validate and return data
// Client stores in localStorage, syncs to Theo via message

interface CheckinData {
  power: number;
  safety: number;
  answers: Record<string, { label: string; power: number; safety: number }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckinData = await request.json();
    
    if (typeof body.power !== 'number' || typeof body.safety !== 'number') {
      return NextResponse.json({ error: 'Invalid data: power and safety must be numbers' }, { status: 400 });
    }

    // Create interaction record
    const now = new Date();
    const interaction = {
      id: `checkin-${now.getTime()}`,
      timestamp: now.toISOString(),
      date: now.toISOString().split('T')[0],
      time: now.toTimeString().split(' ')[0].slice(0, 5),
      type: 'daily_checkin',
      description: 'Daily check-in questionnaire',
      compass: {
        power: Math.round(body.power * 10) / 10,
        safety: Math.round(body.safety * 10) / 10
      },
      answers: body.answers,
      tags: ['checkin', 'questionnaire']
    };

    // Return the interaction for client-side storage
    return NextResponse.json({
      success: true,
      interaction,
      message: 'Check-in recorded. Data stored locally.',
      syncCommand: `Log daily checkin: power ${interaction.compass.power}, safety ${interaction.compass.safety}`
    });

  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json({ error: 'Failed to process check-in' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Use POST to submit check-in data',
    note: 'Data is stored client-side due to Vercel filesystem limitations'
  });
}
