import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const STORAGE_BASE = 'https://atldnpjaxaeqzgtqbrpy.supabase.co/storage/v1/object/public/faith-audio/ambient'

// GET: List all ambient tracks
export async function GET() {
  // Read manifest from a local JSON config (stored alongside the API)
  // In the future this could come from a DB table
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // List files in the ambient directory
  const { data: files, error } = await supabase.storage
    .from('faith-audio')
    .list('ambient', { sortBy: { column: 'name', order: 'asc' } })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Filter to only MP3 files (exclude manifest, folders, etc.)
  const tracks = (files || [])
    .filter(f => f.name.endsWith('.mp3'))
    .map(f => {
      const id = f.name.replace('.mp3', '')
      const name = id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      return {
        id,
        name,
        url: `${STORAGE_BASE}/${f.name}`,
        size: f.metadata?.size || 0,
        created: f.created_at,
      }
    })

  return NextResponse.json({ tracks })
}

// POST: Upload a new ambient track
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const trackName = formData.get('name') as string || ''
  const trackId = formData.get('id') as string || ''

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Generate ID from name if not provided
  const id = trackId || trackName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (!id) {
    return NextResponse.json({ error: 'Track name or ID required' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { data, error } = await supabase.storage
    .from('faith-audio')
    .upload(`ambient/${id}.mp3`, buffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    id,
    name: trackName || id.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    url: `${STORAGE_BASE}/${id}.mp3`,
    uploaded: true,
  })
}

// DELETE: Remove an ambient track
export async function DELETE(request: NextRequest) {
  const session = await getSession()
  if (!session?.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await request.json()
  if (!id) {
    return NextResponse.json({ error: 'Track ID required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase.storage
    .from('faith-audio')
    .remove([`ambient/${id}.mp3`])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ deleted: id })
}

// PATCH: Rename a track (re-upload with new name)
export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session?.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { oldId, newId, newName } = await request.json()
  if (!oldId) {
    return NextResponse.json({ error: 'oldId required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  if (newId && newId !== oldId) {
    // Download old file, re-upload with new name, delete old
    const { data: fileData, error: dlError } = await supabase.storage
      .from('faith-audio')
      .download(`ambient/${oldId}.mp3`)

    if (dlError || !fileData) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }

    const buffer = Buffer.from(await fileData.arrayBuffer())
    
    await supabase.storage.from('faith-audio').upload(`ambient/${newId}.mp3`, buffer, {
      contentType: 'audio/mpeg',
      upsert: true,
    })

    await supabase.storage.from('faith-audio').remove([`ambient/${oldId}.mp3`])
  }

  return NextResponse.json({
    id: newId || oldId,
    name: newName || (newId || oldId).split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    url: `${STORAGE_BASE}/${newId || oldId}.mp3`,
    updated: true,
  })
}
