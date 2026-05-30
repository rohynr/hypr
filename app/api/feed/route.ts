import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

type MatchLevel = 'microlocality' | 'locality' | 'ward' | 'city'
const LEVEL_RANK: Record<MatchLevel, number> = { microlocality: 0, locality: 1, ward: 2, city: 3 }

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const localityId = searchParams.get('locality_id')
  const cityId = searchParams.get('city_id')
  const page = parseInt(searchParams.get('page') || '1')
  const context = searchParams.get('context') as 'around' | 'civic' | null
  const limit = 20
  const offset = (page - 1) * limit

  if (!cityId) {
    return NextResponse.json({ error: 'city_id is required' }, { status: 400 })
  }

  // No locality selected: plain city feed, no match_level enrichment
  if (!localityId) {
    const { data, error } = await supabase
      .from('feed')
      .select('*')
      .eq('city_id', cityId)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ articles: data || [] })
  }

  // Fetch the selected locality's details
  const { data: locality, error: locErr } = await supabase
    .from('localities')
    .select('id, level, parent_id, admin_zone_id')
    .eq('id', localityId)
    .eq('city_id', cityId)
    .single()

  if (!locality) {
    return NextResponse.json({ error: 'locality not found' }, { status: 404 })
  }

  // Fetch sibling/child localities and ward localities in parallel
  const [neighborRes, wardRes] = await Promise.all([
    locality.level === 'microlocality' && locality.parent_id
      ? supabase.from('localities').select('id').eq('parent_id', locality.parent_id).eq('city_id', cityId)
      : supabase.from('localities').select('id').eq('parent_id', localityId).eq('city_id', cityId),
    locality.admin_zone_id
      ? supabase.from('localities').select('id').eq('admin_zone_id', locality.admin_zone_id).eq('city_id', cityId)
      : Promise.resolve({ data: [] as { id: string }[], error: null }),
  ])

  // Build ID sets per match level
  const microIds = new Set<string>()
  const localityIds = new Set<string>()
  const wardIds = new Set<string>()

  if (locality.level === 'microlocality') {
    // Exact match = the microlocality itself
    // Neighborhood match = parent locality + sibling microlocalities
    microIds.add(localityId)
    if (locality.parent_id) localityIds.add(locality.parent_id)
    neighborRes.data?.forEach(l => { if (l.id !== localityId) localityIds.add(l.id) })
  } else {
    // Selected is a parent locality
    // Neighborhood match = the locality itself
    // Microlocality match = its children
    localityIds.add(localityId)
    neighborRes.data?.forEach(l => microIds.add(l.id))
  }

  // Ward IDs: all localities in the same admin zone, excluding those already bucketed
  wardRes.data?.forEach(l => {
    if (!microIds.has(l.id) && !localityIds.has(l.id)) wardIds.add(l.id)
  })

  // Which levels to include based on context
  const includeMicro = context !== 'civic'
  const includeLocalityLevel = context !== 'civic'
  const includeCity = !context // default feed only

  // Collect all locality IDs to query in one round-trip
  const queryIds: string[] = []
  if (includeMicro) { queryIds.push(...microIds); queryIds.push(...localityIds) }
  if (!includeMicro && includeLocalityLevel) queryIds.push(...localityIds)
  queryIds.push(...wardIds)

  // Fetch articles: locality-scoped + city-wide (if applicable)
  const fetches: Promise<{ data: any[] | null; error: any }>[] = []

  if (queryIds.length > 0) {
    fetches.push(
      supabase.from('feed').select('*').eq('city_id', cityId).in('locality_id', queryIds) as any
    )
  }

  if (includeCity) {
    // City-wide articles have no specific locality assignment
    fetches.push(
      supabase.from('feed').select('*').eq('city_id', cityId).is('locality_id', null) as any
    )
  }

  if (fetches.length === 0) {
    return NextResponse.json({ articles: [] })
  }

  const results = await Promise.all(fetches)
  for (const r of results) {
    if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
  }

  const allArticles = results.flatMap(r => r.data || [])

  // Assign match_level and deduplicate — keep the most specific level per article
  const seen = new Map<string, any>()

  for (const article of allArticles) {
    const lid: string | null = article.locality_id
    let level: MatchLevel

    if (lid && microIds.has(lid)) {
      level = 'microlocality'
    } else if (lid && localityIds.has(lid)) {
      level = 'locality'
    } else if (lid && wardIds.has(lid)) {
      level = 'ward'
    } else {
      level = 'city'
    }

    if (!seen.has(article.id)) {
      seen.set(article.id, { ...article, match_level: level })
    } else {
      const existing = seen.get(article.id)
      if (LEVEL_RANK[level] < LEVEL_RANK[existing.match_level as MatchLevel]) {
        seen.set(article.id, { ...article, match_level: level })
      }
    }
  }

  // Sort: match_level rank ascending, then published_at descending within each group
  const sorted = [...seen.values()].sort((a, b) => {
    const rankDiff = LEVEL_RANK[a.match_level as MatchLevel] - LEVEL_RANK[b.match_level as MatchLevel]
    if (rankDiff !== 0) return rankDiff
    return new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  })

  return NextResponse.json({ articles: sorted.slice(offset, offset + limit) })
}
