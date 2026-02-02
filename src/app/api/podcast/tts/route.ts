import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // TTS can take a while for long scripts

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || 'sk_31f34fe5c70baa0f2c588448b9c73fbb5c8a06ba7282e21c';
const JOSHUA_VOICE_ID = 'VTn3ZhBirl7Eonh6soN9';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, script } = body as { text?: string; script?: string };
    
    const content = text || script;
    if (!content) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Clean the script - extract spoken parts and remove markdown
    const cleanedText = content
      .split('\n')
      .filter((line: string) => line.startsWith('>') || (!line.startsWith('#') && !line.startsWith('*') && line.trim()))
      .map((line: string) => line.replace(/^>\s*/, '').replace(/\[PAUSE\]/g, '...').replace(/\[BEAT\]/g, '. '))
      .join('\n')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .trim();

    if (!cleanedText) {
      return NextResponse.json({ error: 'No speakable content found' }, { status: 400 });
    }

    // Check text length (ElevenLabs has limits)
    if (cleanedText.length > 10000) {
      return NextResponse.json({ 
        error: 'Script too long for single TTS request. Maximum ~10,000 characters.',
        length: cleanedText.length,
      }, { status: 400 });
    }

    // Call ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${JOSHUA_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: cleanedText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs error:', errorText);
      return NextResponse.json({ 
        error: 'ElevenLabs API error',
        details: errorText,
      }, { status: response.status });
    }

    // Get audio buffer
    const audioBuffer = await response.arrayBuffer();
    
    // Return as base64 for easy handling
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    
    return NextResponse.json({ 
      audio: base64Audio,
      mimeType: 'audio/mpeg',
      textLength: cleanedText.length,
      estimatedDuration: Math.ceil(cleanedText.split(/\s+/).length / 150 * 60), // ~150 wpm
    });

  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'TTS failed'
    }, { status: 500 });
  }
}
