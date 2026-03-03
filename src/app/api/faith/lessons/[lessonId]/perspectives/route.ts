import { NextRequest, NextResponse } from 'next/server'
import { faithSupabase, isFaithSupabaseConfigured } from '@/lib/faith-supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { lessonId: string } }
) {
  if (!isFaithSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { data: perspectives, error } = await faithSupabase
      .from('faith_perspectives')
      .select('*, tradition:faith_traditions(name, icon, color)')
      .eq('lesson_id', params.lessonId)

    if (error) {
      console.error('Perspectives fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ perspectives: perspectives || [] })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch lesson perspectives' 
    }, { status: 500 })
  }
}