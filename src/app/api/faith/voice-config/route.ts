import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Default voice mapping (hardcoded fallback if no DB overrides)
const DEFAULT_VOICE_MAP: Record<string, { voiceId: string; voiceName: string; traditionFamily: string }> = {
  'orthodox-judaism': { voiceId: 'W1EJxHy9vl73xgPIKgpn', voiceName: 'Rabbi Shafier', traditionFamily: 'Judaism' },
  'conservative-judaism': { voiceId: 'W1EJxHy9vl73xgPIKgpn', voiceName: 'Rabbi Shafier', traditionFamily: 'Judaism' },
  'reform-judaism': { voiceId: 'W1EJxHy9vl73xgPIKgpn', voiceName: 'Rabbi Shafier', traditionFamily: 'Judaism' },
  'messianic-judaism': { voiceId: 'W1EJxHy9vl73xgPIKgpn', voiceName: 'Rabbi Shafier', traditionFamily: 'Judaism' },
  'reconstructionist-judaism': { voiceId: 'W1EJxHy9vl73xgPIKgpn', voiceName: 'Rabbi Shafier', traditionFamily: 'Judaism' },
  'catholicism': { voiceId: '87tjwokZlpNU7QL3HaLP', voiceName: 'Reverend', traditionFamily: 'Christianity' },
  'evangelical-protestant': { voiceId: '87tjwokZlpNU7QL3HaLP', voiceName: 'Reverend', traditionFamily: 'Christianity' },
  'mainline-protestant': { voiceId: '87tjwokZlpNU7QL3HaLP', voiceName: 'Reverend', traditionFamily: 'Christianity' },
  'eastern-orthodox': { voiceId: '87tjwokZlpNU7QL3HaLP', voiceName: 'Reverend', traditionFamily: 'Christianity' },
  'sunni-islam': { voiceId: 'ZxleDRZQVNyTR38t1M06', voiceName: 'Rehan Imam', traditionFamily: 'Islam' },
  'shia-islam': { voiceId: 'ZxleDRZQVNyTR38t1M06', voiceName: 'Rehan Imam', traditionFamily: 'Islam' },
  'sufi-islam': { voiceId: 'ZxleDRZQVNyTR38t1M06', voiceName: 'Rehan Imam', traditionFamily: 'Islam' },
  'theravada-buddhism': { voiceId: 'sUwtOYEjCoROzbhBKwqi', voiceName: 'Moses Sam Paul', traditionFamily: 'Buddhism' },
  'mahayana-buddhism': { voiceId: 'sUwtOYEjCoROzbhBKwqi', voiceName: 'Moses Sam Paul', traditionFamily: 'Buddhism' },
  'vajrayana-buddhism': { voiceId: 'sUwtOYEjCoROzbhBKwqi', voiceName: 'Moses Sam Paul', traditionFamily: 'Buddhism' },
  'vaishnavism': { voiceId: 'ZxleDRZQVNyTR38t1M06', voiceName: 'Rehan Imam', traditionFamily: 'Hinduism' },
  'shaivism': { voiceId: 'ZxleDRZQVNyTR38t1M06', voiceName: 'Rehan Imam', traditionFamily: 'Hinduism' },
  'shaktism': { voiceId: 'ZxleDRZQVNyTR38t1M06', voiceName: 'Rehan Imam', traditionFamily: 'Hinduism' },
  'advaita-vedanta': { voiceId: 'ZxleDRZQVNyTR38t1M06', voiceName: 'Rehan Imam', traditionFamily: 'Hinduism' },
  'secular-humanism': { voiceId: 'RGb96Dcl0k5eVje8EBch', voiceName: 'Serena', traditionFamily: 'Secular' },
  'bahai-faith': { voiceId: 'ZxleDRZQVNyTR38t1M06', voiceName: 'Rehan Imam', traditionFamily: "Bahá'í" },
  'jainism': { voiceId: 'ZxleDRZQVNyTR38t1M06', voiceName: 'Rehan Imam', traditionFamily: 'Jainism' },
  'sikhism': { voiceId: 'ZxleDRZQVNyTR38t1M06', voiceName: 'Rehan Imam', traditionFamily: 'Sikhism' },
  'zoroastrianism': { voiceId: 'ZxleDRZQVNyTR38t1M06', voiceName: 'Rehan Imam', traditionFamily: 'Zoroastrianism' },
  'interfaith-mysticism': { voiceId: 'RGb96Dcl0k5eVje8EBch', voiceName: 'Serena', traditionFamily: 'Interfaith' },
}

// All known ElevenLabs voices for the dropdown
const AVAILABLE_VOICES = [
  { id: 'W1EJxHy9vl73xgPIKgpn', name: 'Rabbi Shafier', category: 'tradition' },
  { id: '87tjwokZlpNU7QL3HaLP', name: 'Reverend', category: 'tradition' },
  { id: 'ZxleDRZQVNyTR38t1M06', name: 'Rehan Imam', category: 'tradition' },
  { id: 'sUwtOYEjCoROzbhBKwqi', name: 'Moses Sam Paul', category: 'tradition' },
  { id: '6EphsklDopDQ6eRkwNHT', name: 'Shardul K (Hindi)', category: 'tradition' },
  { id: 'RGb96Dcl0k5eVje8EBch', name: 'Serena', category: 'tradition' },
  { id: 'VTn3ZhBirl7Eonh6soN9', name: 'Joshua (Clone)', category: 'clone' },
  { id: 'JBFqnCBsd6RM', name: 'George', category: 'premade' },
  { id: 'nPczCjzI2dev', name: 'Brian', category: 'premade' },
  { id: 'pqHfZKP75CvO', name: 'Bill', category: 'premade' },
  { id: 'onwK4e9ZLuTA', name: 'Daniel', category: 'premade' },
  { id: 'EXAVITQu4vr4', name: 'Sarah', category: 'premade' },
  { id: 'XrExE9yKIg1W', name: 'Matilda', category: 'premade' },
  { id: 'pFZP5JQG7iQj', name: 'Lily', category: 'premade' },
]

// GET: Return current voice config (DB overrides merged with defaults)
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Try to read overrides from DB
  const { data: overrides } = await supabase
    .from('faith_voice_config')
    .select('*')
    .order('tradition_slug')

  // Merge: DB overrides take precedence over defaults
  const merged = { ...DEFAULT_VOICE_MAP }
  if (overrides) {
    for (const row of overrides) {
      merged[row.tradition_slug] = {
        voiceId: row.voice_id,
        voiceName: row.voice_name || AVAILABLE_VOICES.find(v => v.id === row.voice_id)?.name || row.voice_id,
        traditionFamily: row.tradition_family || DEFAULT_VOICE_MAP[row.tradition_slug]?.traditionFamily || 'Other',
      }
    }
  }

  // Group by tradition family for UI
  const grouped: Record<string, Array<{ slug: string; voiceId: string; voiceName: string }>> = {}
  for (const [slug, config] of Object.entries(merged)) {
    const family = config.traditionFamily
    if (!grouped[family]) grouped[family] = []
    grouped[family].push({ slug, voiceId: config.voiceId, voiceName: config.voiceName })
  }

  return NextResponse.json({
    voiceMap: merged,
    grouped,
    availableVoices: AVAILABLE_VOICES,
  })
}

// PATCH: Update one or more tradition voice mappings
export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session?.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { updates } = await request.json()
  // updates: Array<{ slug: string; voiceId: string; voiceName?: string; traditionFamily?: string }>

  if (!updates || !Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const results = []
  for (const update of updates) {
    const voiceName = update.voiceName || AVAILABLE_VOICES.find(v => v.id === update.voiceId)?.name || update.voiceId
    const traditionFamily = update.traditionFamily || DEFAULT_VOICE_MAP[update.slug]?.traditionFamily || 'Other'

    const { data, error } = await supabase
      .from('faith_voice_config')
      .upsert({
        tradition_slug: update.slug,
        voice_id: update.voiceId,
        voice_name: voiceName,
        tradition_family: traditionFamily,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'tradition_slug' })

    results.push({ slug: update.slug, success: !error, error: error?.message })
  }

  return NextResponse.json({ results })
}

// POST: Add a custom voice to the available voices list
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { voiceId, voiceName, category } = await request.json()
  if (!voiceId || !voiceName) {
    return NextResponse.json({ error: 'voiceId and voiceName required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('faith_custom_voices')
    .upsert({
      voice_id: voiceId,
      voice_name: voiceName,
      category: category || 'custom',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'voice_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ voiceId, voiceName, category: category || 'custom', added: true })
}

// DELETE: Remove a custom voice
export async function DELETE(request: NextRequest) {
  const session = await getSession()
  if (!session?.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { voiceId } = await request.json()
  if (!voiceId) {
    return NextResponse.json({ error: 'voiceId required' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase
    .from('faith_custom_voices')
    .delete()
    .eq('voice_id', voiceId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ deleted: voiceId })
}
