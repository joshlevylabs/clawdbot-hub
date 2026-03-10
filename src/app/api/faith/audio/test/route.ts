import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Diagnostic endpoint — no auth required, tests the full pipeline
export async function GET(request: NextRequest) {
  const results: Record<string, any> = {}

  // 1. Check env vars
  results.envCheck = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.slice(0, 20)}... (${process.env.NEXT_PUBLIC_SUPABASE_URL.length} chars)` : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? `...${process.env.SUPABASE_SERVICE_ROLE_KEY.slice(-10)} (${process.env.SUPABASE_SERVICE_ROLE_KEY.length} chars)` : 'MISSING',
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY ? `...${process.env.ELEVENLABS_API_KEY.slice(-10)} (${process.env.ELEVENLABS_API_KEY.length} chars)` : 'MISSING',
    ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID || 'MISSING',
    hasTrailingNewline: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL?.endsWith('\n') || false,
      key: process.env.SUPABASE_SERVICE_ROLE_KEY?.endsWith('\n') || false,
      elevenKey: process.env.ELEVENLABS_API_KEY?.endsWith('\n') || false,
      elevenVoice: process.env.ELEVENLABS_VOICE_ID?.endsWith('\n') || false,
    }
  }

  // 2. Test Supabase connection
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data, error } = await supabase
      .from('faith_lessons')
      .select('id, date')
      .order('date', { ascending: false })
      .limit(1)

    if (error) {
      results.supabase = { status: 'ERROR', error: error.message }
    } else {
      results.supabase = { status: 'OK', latestLesson: data?.[0] }
    }
  } catch (e: any) {
    results.supabase = { status: 'EXCEPTION', error: e.message }
  }

  // 3. Test ElevenLabs API with tiny text
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        },
        body: JSON.stringify({
          text: 'Test audio generation.',
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            speed: 1.0,
          },
        }),
      }
    )

    if (response.ok) {
      const buffer = await response.arrayBuffer()
      results.elevenlabs = { status: 'OK', audioBytes: buffer.byteLength }
    } else {
      const errorText = await response.text()
      results.elevenlabs = { status: 'ERROR', httpStatus: response.status, error: errorText.slice(0, 500) }
    }
  } catch (e: any) {
    results.elevenlabs = { status: 'EXCEPTION', error: e.message }
  }

  return NextResponse.json(results)
}
