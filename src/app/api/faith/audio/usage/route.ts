import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
    }

    const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      tier: data.tier,
      character_count: data.character_count,
      character_limit: data.character_limit,
      next_reset_unix: data.next_reset_unix,
    });
  } catch (error) {
    console.error('Error fetching ElevenLabs usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ElevenLabs usage data' },
      { status: 500 }
    );
  }
}