import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anthropicKey = process.env.ANTHROPIC_API_KEY!

// Holiday-tradition observance map
// Maps which traditions actually observe/have meaningful connection to each holiday
// Key: holiday name, Value: array of tradition slug prefixes that observe it
const HOLIDAY_OBSERVANCES: Record<string, string[]> = {
  // Jewish holidays — observed by all Jewish traditions + Messianic Judaism
  'Purim': ['orthodox-judaism', 'conservative-judaism', 'reform-judaism', 'reconstructionist-judaism', 'messianic-judaism'],
  'Passover (Pesach)': ['orthodox-judaism', 'conservative-judaism', 'reform-judaism', 'reconstructionist-judaism', 'messianic-judaism', 'catholicism', 'eastern-orthodox', 'evangelical-protestant', 'mainline-protestant'],
  'Shavuot': ['orthodox-judaism', 'conservative-judaism', 'reform-judaism', 'reconstructionist-judaism', 'messianic-judaism', 'catholicism', 'eastern-orthodox', 'evangelical-protestant', 'mainline-protestant'],
  'Rosh Hashanah': ['orthodox-judaism', 'conservative-judaism', 'reform-judaism', 'reconstructionist-judaism', 'messianic-judaism'],
  'Yom Kippur': ['orthodox-judaism', 'conservative-judaism', 'reform-judaism', 'reconstructionist-judaism', 'messianic-judaism'],
  'Sukkot': ['orthodox-judaism', 'conservative-judaism', 'reform-judaism', 'reconstructionist-judaism', 'messianic-judaism'],
  'Hanukkah': ['orthodox-judaism', 'conservative-judaism', 'reform-judaism', 'reconstructionist-judaism', 'messianic-judaism'],
  
  // Christian holidays — observed by Christian traditions; Passover/Shavuot have Jewish roots
  'Ash Wednesday': ['catholicism', 'eastern-orthodox', 'mainline-protestant', 'evangelical-protestant'],
  'Palm Sunday': ['catholicism', 'eastern-orthodox', 'mainline-protestant', 'evangelical-protestant'],
  'Good Friday': ['catholicism', 'eastern-orthodox', 'mainline-protestant', 'evangelical-protestant'],
  'Easter': ['catholicism', 'eastern-orthodox', 'mainline-protestant', 'evangelical-protestant', 'messianic-judaism'],
  'Pentecost': ['catholicism', 'eastern-orthodox', 'mainline-protestant', 'evangelical-protestant', 'messianic-judaism'],
  'Christmas': ['catholicism', 'eastern-orthodox', 'mainline-protestant', 'evangelical-protestant', 'messianic-judaism'],

  // Islamic holidays
  'Ramadan': ['sunni-islam', 'shia-islam', 'sufi-islam'],
  'Eid al-Fitr': ['sunni-islam', 'shia-islam', 'sufi-islam'],
  'Eid al-Adha': ['sunni-islam', 'shia-islam', 'sufi-islam'],
  'Mawlid al-Nabi': ['sunni-islam', 'shia-islam', 'sufi-islam'],

  // Hindu holidays
  'Diwali': ['vaishnavism', 'shaivism', 'shaktism', 'advaita-vedanta', 'jainism', 'sikhism'],
  'Holi': ['vaishnavism', 'shaivism', 'shaktism', 'advaita-vedanta'],
  'Navaratri': ['vaishnavism', 'shaivism', 'shaktism', 'advaita-vedanta'],
  'Maha Shivaratri': ['shaivism', 'vaishnavism', 'shaktism', 'advaita-vedanta'],

  // Buddhist holidays
  'Vesak': ['theravada-buddhism', 'mahayana-buddhism', 'vajrayana-buddhism'],
  'Magha Puja': ['theravada-buddhism', 'mahayana-buddhism'],
  'Asalha Puja': ['theravada-buddhism'],

  // Sikh holidays
  'Vaisakhi': ['sikhism', 'vaishnavism', 'shaivism'],
  'Guru Nanak Jayanti': ['sikhism'],

  // Bahai holidays
  'Naw-Ruz': ['bahai-faith', 'zoroastrianism'],
  'Ridvan': ['bahai-faith'],

  // Cross-tradition
  'Nowruz': ['zoroastrianism', 'bahai-faith', 'sufi-islam'],
}

interface HolidayDetailRequest {
  holidayName: string
  holidayEmoji?: string
  holidayDescription?: string
  userTraditionSlug: string
  exploringTraditionSlugs: string[]
  year?: number
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const userSupabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } }
    })
    
    const { data: { user }, error: authError } = await userSupabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    const body: HolidayDetailRequest = await request.json()
    const { holidayName, holidayEmoji, holidayDescription, userTraditionSlug, exploringTraditionSlugs, year = 2026 } = body

    if (!holidayName || !userTraditionSlug) {
      return NextResponse.json({ error: 'holidayName and userTraditionSlug required' }, { status: 400 })
    }

    // 1. Check cache for history + user's tradition observance
    const { data: cached } = await supabase
      .from('faith_holiday_content')
      .select('*')
      .eq('holiday_name', holidayName)
      .eq('tradition_slug', userTraditionSlug)
      .eq('year', year)
      .single()

    let history = cached?.history
    let userObservance = cached?.observance

    // 2. Check cache for cross-tradition perspectives
    const observingTraditions = HOLIDAY_OBSERVANCES[holidayName] || []
    const relevantExploring = exploringTraditionSlugs.filter(
      slug => slug !== userTraditionSlug && observingTraditions.includes(slug)
    )

    const { data: cachedPerspectives } = await supabase
      .from('faith_holiday_perspectives')
      .select('*')
      .eq('holiday_name', holidayName)
      .eq('source_tradition_slug', userTraditionSlug)
      .in('comparing_tradition_slug', relevantExploring.length > 0 ? relevantExploring : ['__none__'])
      .eq('year', year)

    const cachedPerspectiveMap = new Map(
      (cachedPerspectives || []).map(p => [p.comparing_tradition_slug, p])
    )
    const missingPerspectives = relevantExploring.filter(slug => !cachedPerspectiveMap.has(slug))

    // 3. If everything cached, return immediately
    if (history && userObservance && missingPerspectives.length === 0) {
      return NextResponse.json({
        holidayName,
        holidayEmoji,
        history,
        userTradition: {
          slug: userTraditionSlug,
          observance: userObservance,
        },
        perspectives: relevantExploring.map(slug => ({
          traditionSlug: slug,
          perspectiveText: cachedPerspectiveMap.get(slug)?.perspective_text || '',
          connectionType: cachedPerspectiveMap.get(slug)?.connection_type || 'cultural_connection',
        })),
        cached: true,
      })
    }

    // 4. Generate missing content via Claude
    const anthropic = new Anthropic({ apiKey: anthropicKey })

    // Get tradition names for better prompts
    const allSlugs = [userTraditionSlug, ...missingPerspectives]
    const { data: traditions } = await supabase
      .from('faith_traditions')
      .select('slug, name, icon')
      .in('slug', allSlugs)

    const traditionNameMap = new Map(
      (traditions || []).map(t => [t.slug, { name: t.name, icon: t.icon }])
    )

    const userTraditionName = traditionNameMap.get(userTraditionSlug)?.name || userTraditionSlug

    // Build prompt for all missing content at once
    const needsHistory = !history
    const needsObservance = !userObservance
    const needsPerspectives = missingPerspectives.length > 0

    let prompt = `You are a scholar of comparative religion. Generate content about the holiday "${holidayName}" (${holidayEmoji || ''}).`
    if (holidayDescription) prompt += `\n\nBrief description: ${holidayDescription}`
    
    prompt += `\n\nThe user's primary tradition is: ${userTraditionName} (${userTraditionSlug})\n\nGenerate the following as JSON:\n\n{`

    if (needsHistory) {
      prompt += `\n  "history": "A 2-3 paragraph overview of the holiday's origins, historical significance, and why it's celebrated. Write for a thoughtful adult who wants depth, not a Wikipedia summary. Include key scriptural/historical references.",`
    }
    if (needsObservance) {
      prompt += `\n  "observance": "A 2-3 paragraph description of how ${userTraditionName} specifically celebrates/observes this holiday. Include specific rituals, prayers, foods, customs, and the spiritual meaning behind them. Be specific to this tradition — not generic.",`
    }
    if (needsPerspectives) {
      const perspectiveEntries = missingPerspectives.map(slug => {
        const name = traditionNameMap.get(slug)?.name || slug
        return `    "${slug}": { "text": "1-2 paragraphs on how ${name} views, celebrates, or connects to ${holidayName} — and how it differs from ${userTraditionName}'s observance. Be specific about rituals, theology, and meaning. If the connection is historical/theological rather than direct observance, explain that.", "connectionType": "one of: shared_origin, parallel_observance, cultural_connection, theological_link" }`
      })
      prompt += `\n  "perspectives": {\n${perspectiveEntries.join(',\n')}\n  }`
    }

    prompt += `\n}\n\nRespond with ONLY valid JSON. No markdown, no explanation.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected response format' }, { status: 500 })
    }

    let generated: any
    try {
      generated = JSON.parse(content.text)
    } catch {
      // Try to extract JSON from potential markdown wrapping
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        generated = JSON.parse(jsonMatch[0])
      } else {
        return NextResponse.json({ error: 'Failed to parse generated content' }, { status: 500 })
      }
    }

    // 5. Cache generated content
    if (needsHistory || needsObservance) {
      const finalHistory = generated.history || history
      const finalObservance = generated.observance || userObservance

      await supabase.from('faith_holiday_content').upsert({
        holiday_name: holidayName,
        holiday_emoji: holidayEmoji,
        tradition_slug: userTraditionSlug,
        tradition_id: traditions?.find(t => t.slug === userTraditionSlug)?.id || null,
        history: finalHistory,
        observance: finalObservance,
        year,
        model: 'claude-sonnet-4-20250514',
      }, { onConflict: 'holiday_name,tradition_slug,year' })

      history = finalHistory
      userObservance = finalObservance
    }

    if (needsPerspectives && generated.perspectives) {
      const perspectiveRows = missingPerspectives
        .filter(slug => generated.perspectives[slug])
        .map(slug => ({
          holiday_name: holidayName,
          source_tradition_slug: userTraditionSlug,
          comparing_tradition_slug: slug,
          comparing_tradition_id: traditions?.find(t => t.slug === slug)?.id || null,
          perspective_text: generated.perspectives[slug].text,
          connection_type: generated.perspectives[slug].connectionType || 'cultural_connection',
          year,
        }))

      if (perspectiveRows.length > 0) {
        await supabase.from('faith_holiday_perspectives').upsert(
          perspectiveRows,
          { onConflict: 'holiday_name,source_tradition_slug,comparing_tradition_slug,year' }
        )
      }
    }

    // 6. Build final response
    const allPerspectives = relevantExploring.map(slug => {
      const cached = cachedPerspectiveMap.get(slug)
      const fresh = generated.perspectives?.[slug]
      return {
        traditionSlug: slug,
        traditionName: traditionNameMap.get(slug)?.name || slug,
        traditionIcon: traditionNameMap.get(slug)?.icon || '',
        perspectiveText: cached?.perspective_text || fresh?.text || '',
        connectionType: cached?.connection_type || fresh?.connectionType || 'cultural_connection',
      }
    })

    return NextResponse.json({
      holidayName,
      holidayEmoji,
      history,
      userTradition: {
        slug: userTraditionSlug,
        name: userTraditionName,
        icon: traditionNameMap.get(userTraditionSlug)?.icon || '',
        observance: userObservance,
      },
      perspectives: allPerspectives,
      cached: false,
    })

  } catch (error: any) {
    console.error('Holiday detail error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
