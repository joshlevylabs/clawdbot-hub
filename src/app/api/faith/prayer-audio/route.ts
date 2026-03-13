import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 120 // ElevenLabs multilingual_v2 can take 50-90s for full lessons

const VOICE_NAMES: Record<string, string> = {
  'VTn3ZhBirl7Eonh6soN9': 'Josh',
  'W1EJxHy9vl73xgPIKgpn': 'Rabbi Shafier',
  '87tjwokZlpNU7QL3HaLP': 'Reverend',
  'ZxleDRZQVNyTR38t1M06': 'Rehan Imam',
  'sUwtOYEjCoROzbhBKwqi': 'Moses Sam Paul',
  '6EphsklDopDQ6eRkwNHT': 'Shardul K',
  'RGb96Dcl0k5eVje8EBch': 'Serena',
  'JBFqnCBsd6RM': 'George',
  'nPczCjzI2dev': 'Brian',
  'pqHfZKP75CvO': 'Bill',
  'onwK4e9ZLuTA': 'Daniel',
  'EXAVITQu4vr4': 'Sarah',
  'XrExE9yKIg1W': 'Matilda',
  'pFZP5JQG7iQj': 'Lily',
};

// Map tradition families to default voice IDs
const TRADITION_FAMILY_VOICE_MAP: Record<string, string> = {
  'judaism': 'W1EJxHy9vl73xgPIKgpn',     // Rabbi Shafier
  'christianity': '87tjwokZlpNU7QL3HaLP',  // Reverend
  'islam': 'ZxleDRZQVNyTR38t1M06',         // Rehan Imam
  'hinduism': 'ZxleDRZQVNyTR38t1M06',      // Rehan Imam (English)
  'buddhism': 'sUwtOYEjCoROzbhBKwqi',      // Moses Sam Paul
  'interfaith': 'RGb96Dcl0k5eVje8EBch',    // Serena
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
        } else {
          console.error('Bearer token auth failed:', {
            hasUser: !!user,
            error: error?.message,
            userEmail: user?.email,
            emailVerified: user?.email_confirmed_at
          })
        }
      } else {
        console.error('No Bearer token found in Authorization header')
      }
    }
    
    if (!authenticated) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: 'Authentication failed. Please sign in again or verify your email.'
      }, { status: 401 })
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

    // Fix truncated voice IDs from older app builds
    const VOICE_ID_FIXES: Record<string, string> = {
      'VTn3ZhBirl7E': 'VTn3ZhBirl7Eonh6soN9', // Truncated Josh voice ID
    }
    const explicitVoice = voiceId ? (VOICE_ID_FIXES[voiceId] || voiceId) : null

    // Fetch prayer — try faith_daily_prayers first (mobile app), then faith_prayers (legacy)
    let prayer: { id: string; tradition_id?: string; tradition_key?: string; date: string; text?: string } | null = null

    // Try faith_daily_prayers (mobile app sends IDs from this table)
    const { data: dailyPrayer } = await supabase
      .from('faith_daily_prayers')
      .select('id, tradition_key, tradition_name, date, full_text')
      .eq('id', prayerId)
      .single()

    if (dailyPrayer) {
      prayer = {
        id: dailyPrayer.id,
        tradition_key: dailyPrayer.tradition_key,
        date: dailyPrayer.date,
        text: dailyPrayer.full_text,
      }
    } else {
      // Fall back to faith_prayers table
      const { data: legacyPrayer } = await supabase
        .from('faith_prayers')
        .select('id, tradition_id, date, text')
        .eq('id', prayerId)
        .single()
      if (legacyPrayer) {
        prayer = legacyPrayer
      }
    }

    // Resolve voice: explicit > DB override > hardcoded default > fallback Serena
    // tradition_key is a slug like "orthodox-judaism" — extract the family (e.g., "judaism")
    let traditionFamily = 'interfaith'
    if (prayer?.tradition_id) {
      traditionFamily = UUID_TO_SLUG[prayer.tradition_id] || 'interfaith'
    } else if (prayer?.tradition_key) {
      // Extract family from tradition key slug: "orthodox-judaism" → "judaism", "sunni-islam" → "islam"
      const key = prayer.tradition_key.toLowerCase()
      if (key.includes('judaism') || key.includes('jewish')) traditionFamily = 'judaism'
      else if (key.includes('islam') || key.includes('muslim')) traditionFamily = 'islam'
      else if (key.includes('christian') || key.includes('catholic') || key.includes('orthodox') || key.includes('protestant') || key.includes('evangelical') || key.includes('non-denominational')) traditionFamily = 'christianity'
      else if (key.includes('hindu') || key.includes('vedanta') || key.includes('shaiv') || key.includes('vaishnav') || key.includes('shakti')) traditionFamily = 'hinduism'
      else if (key.includes('buddhi') || key.includes('zen') || key.includes('theravada') || key.includes('mahayana') || key.includes('vajrayana')) traditionFamily = 'buddhism'
    }
    let voice = explicitVoice
    if (!voice) {
      // Check DB for any voice config overrides (match on tradition family prefix)
      const { data: voiceConfigs } = await supabase
        .from('faith_voice_config')
        .select('voice_id, tradition_family')
        .ilike('tradition_family', traditionFamily)
        .limit(1)
      voice = voiceConfigs?.[0]?.voice_id || TRADITION_FAMILY_VOICE_MAP[traditionFamily] || 'RGb96Dcl0k5eVje8EBch'
    }
    const voiceName = VOICE_NAMES[voice] || 'Unknown'

    // Check if audio already cached
    const { data: cachedAudio, error: cacheError } = await supabase
      .from('faith_lesson_audio')
      .select('storage_path')
      .eq('lesson_id', prayerId)
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

    // Fetch prayer data for TTS generation — try daily_prayers first, then legacy
    let prayerTitle = ''
    let prayerText = ''

    if (dailyPrayer) {
      // Use daily prayer data (already fetched above)
      prayerTitle = `${dailyPrayer.tradition_name || ''} Daily Prayer`.trim()
      prayerText = dailyPrayer.full_text || ''
    } else {
      // Fetch from legacy faith_prayers table
      const { data: prayerFull, error: prayerError } = await supabase
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

      if (prayerError || !prayerFull) {
        return NextResponse.json({ error: 'Prayer not found' }, { status: 404 })
      }

      prayerTitle = prayerFull.title || ''
      prayerText = prayerFull.prayer_text || ''
    }

    if (!prayerText) {
      return NextResponse.json({ error: 'No text content for this prayer' }, { status: 400 })
    }

    // Clean text for TTS - remove markdown formatting, headers, etc.
    let cleanText = prayerText
      .replace(/^#+\s+.*$/gm, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/\[(.*?)\]/g, '') // Remove citation brackets
      .replace(/^[-*]\s+/gm, '') // Remove bullet points
      .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
      .trim()

    // Add prayer title as introduction if it's not already in the text
    if (prayerTitle && !cleanText.toLowerCase().includes(prayerTitle.toLowerCase())) {
      cleanText = `${prayerTitle}.\n\n${cleanText}`;
    }

    if (cleanText.length === 0) {
      return NextResponse.json({ error: 'No valid text content after cleaning' }, { status: 400 })
    }

    const charCount = cleanText.length

    // Generate audio with ElevenLabs
    // flash_v2_5 for all voices: English-focused (no accent drift), 12x faster, 0.5x cost
    const JOSH_VOICE_ID = 'VTn3ZhBirl7Eonh6soN9'
    const isJoshVoice = voice === JOSH_VOICE_ID
    const modelId = 'eleven_flash_v2_5'

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
            stability: isJoshVoice ? 0.3 : 0.3, // Low stability = expressive, natural
            similarity_boost: isJoshVoice ? 0.6 : 0.65, // Lower = softer, airier tone
            speed: isJoshVoice ? 0.92 : 0.95,
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
        return NextResponse.json({ error: `Audio generation failed: ${errorText.slice(0, 200)}` }, { status: 500 })
      }
    }

    const audioBuffer = await elevenLabsResponse.arrayBuffer()
    const fileSize = audioBuffer.byteLength

    // Upload to Supabase Storage at prayers/{date}/{tradition}_{voice}.mp3
    const traditionSlug = UUID_TO_SLUG[prayer?.tradition_id || ''] || 'interfaith';
    const storageFileName = `prayers/${prayer?.date || 'unknown'}/${traditionSlug}_${voiceName.toLowerCase()}.mp3`
    
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
        tradition_id: prayer?.tradition_id,
        date: prayer?.date,
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