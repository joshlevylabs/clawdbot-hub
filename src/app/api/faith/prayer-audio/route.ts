import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const VOICE_NAMES: Record<string, string> = {
  'VTn3ZhBirl7E': 'Josh',
  'JBFqnCBsd6RM': 'George',
  'nPczCjzI2dev': 'Brian',
  'pqHfZKP75CvO': 'Bill',
  'onwK4e9ZLuTA': 'Daniel',
  'EXAVITQu4vr4': 'Sarah',
  'XrExE9yKIg1W': 'Matilda',
  'pFZP5JQG7iQj': 'Lily',
};

// Tradition UUID to slug mapping (for storage path)
const UUID_TO_SLUG: Record<string, string> = {
  'e62dc3f7-88f7-43da-a5d9-be6b3e04a2c7': 'christianity',
  'e0a41a2c-12dd-42f2-9bb1-ccb1e75ffaa7': 'judaism',
  'b01d3a6e-0bf1-440c-825b-0a7fae5c9f03': 'islam',
  '17a79ce2-2fb3-4f18-b94f-6d3a18e0e8e0': 'hinduism',
  '6c4e3a2f-91d0-4b3e-a8c7-5f2d1e6b9a0d': 'buddhism',
  'a7fdd3c8-2a5b-4f1e-9c6d-8b3e2f1a0c5e': 'interfaith',
};

export async function POST(request: NextRequest) {
  try {
    // Check authentication — support both cookie auth (web) and Bearer token (mobile)
    let authenticated = false
    
    // 1. Try cookie-based session (Hub web)
    const session = await getSession()
    if (session?.authenticated) {
      authenticated = true
    }
    
    // 2. Try Bearer token (mobile app sends Supabase access token)
    if (!authenticated) {
      const authHeader = request.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7)
        const supabaseAuth = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        const { data: { user }, error } = await supabaseAuth.auth.getUser(token)
        if (user && !error) {
          authenticated = true
        }
      }
    }
    
    if (!authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create Supabase client with service role for database operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { prayerId, voiceId } = await request.json()
    if (!prayerId) {
      return NextResponse.json({ error: 'prayerId is required' }, { status: 400 })
    }

    const voice = voiceId || process.env.ELEVENLABS_VOICE_ID
    const voiceName = VOICE_NAMES[voice] || 'Josh'

    // Check if audio already cached (reuse faith_lesson_audio table - prayers and lessons have different IDs)
    const { data: cachedAudio, error: cacheError } = await supabase
      .from('faith_lesson_audio')
      .select('storage_path')
      .eq('lesson_id', prayerId) // Store prayer ID in lesson_id field
      .eq('voice', voiceName)
      .single()

    if (cacheError && cacheError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error checking audio cache:', cacheError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (cachedAudio) {
      // Return cached audio URL
      const { data } = supabase.storage
        .from('faith-audio')
        .getPublicUrl(cachedAudio.storage_path)
      
      return NextResponse.json({ 
        audioUrl: data.publicUrl, 
        cached: true 
      })
    }

    // Fetch prayer data with tradition info
    const { data: prayer, error: prayerError } = await supabase
      .from('faith_prayers')
      .select(`
        id,
        date,
        title,
        prayer_text,
        tradition_id,
        faith_traditions!tradition_id (
          id,
          name
        )
      `)
      .eq('id', prayerId)
      .single()

    if (prayerError || !prayer) {
      return NextResponse.json({ error: 'Prayer not found' }, { status: 404 })
    }

    if (!prayer.prayer_text) {
      return NextResponse.json({ error: 'No text content for this prayer' }, { status: 400 })
    }

    // Clean text for TTS - remove markdown formatting, headers, etc.
    let cleanText = prayer.prayer_text
      .replace(/^#+\s+.*$/gm, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/\[(.*?)\]/g, '') // Remove citation brackets
      .replace(/^[-*]\s+/gm, '') // Remove bullet points
      .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
      .trim()

    // Add prayer title as introduction if it's not already in the text
    if (!cleanText.toLowerCase().includes(prayer.title.toLowerCase())) {
      cleanText = `${prayer.title}.\n\n${cleanText}`;
    }

    if (cleanText.length === 0) {
      return NextResponse.json({ error: 'No valid text content after cleaning' }, { status: 400 })
    }

    const charCount = cleanText.length

    // Generate audio with ElevenLabs
    // Use v3 for Joshua's cloned voice (highest quality), turbo for premade voices (cost-efficient)
    const JOSH_VOICE_ID = 'VTn3ZhBirl7E'
    const isJoshVoice = voice === JOSH_VOICE_ID
    const modelId = isJoshVoice ? 'eleven_multilingual_v2' : 'eleven_turbo_v2_5'

    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: modelId,
          voice_settings: {
            stability: isJoshVoice ? 0.7 : 0.65, // Higher stability = calmer, more measured
            similarity_boost: isJoshVoice ? 0.8 : 0.75,
            speed: isJoshVoice ? 0.78 : 0.82, // Peaceful, prayerful pacing for all voices
          },
        }),
      }
    )

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text()
      console.error('ElevenLabs API error:', errorText)
      
      if (elevenLabsResponse.status === 401) {
        return NextResponse.json({ error: 'Audio service authentication failed' }, { status: 500 })
      } else if (elevenLabsResponse.status === 429) {
        return NextResponse.json({ error: 'Audio generation quota exceeded. Please try again later.' }, { status: 429 })
      } else {
        return NextResponse.json({ error: 'Audio generation failed' }, { status: 500 })
      }
    }

    const audioBuffer = await elevenLabsResponse.arrayBuffer()
    const fileSize = audioBuffer.byteLength

    // Upload to Supabase Storage at prayers/{date}/{tradition}_{voice}.mp3
    const traditionSlug = UUID_TO_SLUG[prayer.tradition_id] || 'interfaith';
    const storageFileName = `prayers/${prayer.date}/${traditionSlug}_${voiceName.toLowerCase()}.mp3`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('faith-audio')
      .upload(storageFileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true, // Allow overwrite if exists
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to save audio file' }, { status: 500 })
    }

    // Record in database (reuse faith_lesson_audio table)
    const { error: dbError } = await supabase
      .from('faith_lesson_audio')
      .insert({
        lesson_id: prayerId, // Store prayer ID in lesson_id field
        tradition_id: prayer.tradition_id,
        date: prayer.date,
        voice: voiceName,
        model: modelId,
        storage_path: uploadData.path,
        file_size_bytes: fileSize,
        char_count: charCount,
      })

    if (dbError) {
      console.error('Database insert error:', dbError)
      // Continue anyway - audio file is uploaded
    }

    // Get public URL
    const { data } = supabase.storage
      .from('faith-audio')
      .getPublicUrl(uploadData.path)

    return NextResponse.json({
      audioUrl: data.publicUrl,
      cached: false,
      charCount: charCount,
    })

  } catch (error) {
    console.error('Prayer audio generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}