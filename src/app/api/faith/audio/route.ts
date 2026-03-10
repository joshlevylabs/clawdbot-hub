import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Check authentication using the existing auth system
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create Supabase client with service role for database operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { lessonId } = await request.json()
    if (!lessonId) {
      return NextResponse.json({ error: 'lessonId is required' }, { status: 400 })
    }

    // Check if audio already cached
    const { data: cachedAudio, error: cacheError } = await supabase
      .from('faith_lesson_audio')
      .select('storage_path')
      .eq('lesson_id', lessonId)
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

    // Fetch lesson data with tradition info
    const { data: lesson, error: lessonError } = await supabase
      .from('faith_lessons')
      .select(`
        id,
        date,
        baseline_text,
        baseline_tradition_id,
        faith_traditions!baseline_tradition_id (
          id,
          slug,
          name
        )
      `)
      .eq('id', lessonId)
      .single()

    if (lessonError || !lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    if (!lesson.baseline_text) {
      return NextResponse.json({ error: 'No text content for this lesson' }, { status: 400 })
    }

    // Clean text for TTS - remove markdown formatting, citations, headers
    let cleanText = lesson.baseline_text
      .replace(/^#+\s+.*$/gm, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/\[(.*?)\]/g, '') // Remove citation brackets
      .replace(/^[-*]\s+/gm, '') // Remove bullet points
      .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
      .trim()

    if (cleanText.length === 0) {
      return NextResponse.json({ error: 'No valid text content after cleaning' }, { status: 400 })
    }

    const charCount = cleanText.length

    // Generate audio with ElevenLabs
    const elevenLabsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
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

    // Upload to Supabase Storage
    const tradition = lesson.faith_traditions as any
    const storageFileName = `${lesson.date}/${tradition.slug}.mp3`
    
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

    // Record in database
    const { error: dbError } = await supabase
      .from('faith_lesson_audio')
      .insert({
        lesson_id: lessonId,
        tradition_id: lesson.baseline_tradition_id,
        date: lesson.date,
        voice: 'Josh',
        model: 'eleven_turbo_v2_5',
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
    console.error('Audio generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}