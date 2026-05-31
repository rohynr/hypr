import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const cityId = searchParams.get('city_id')

  if (!cityId) {
    return NextResponse.json({ error: 'city_id is required' }, { status: 400 })
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('feed')
    .select('locality_id, locality_name, parent_locality_name, locality_level')
    .eq('city_id', cityId)
    .not('locality_id', 'is', null)
    .gte('published_at', since)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const counts = new Map<string, { locality_id: string; locality_name: string; count: number }>()
  for (const row of data ?? []) {
    if (!row.locality_id) continue
    const existing = counts.get(row.locality_id)
    const displayName =
      row.locality_level === 'microlocality' && row.parent_locality_name
        ? `${row.locality_name}, ${row.parent_locality_name}`
        : row.locality_name
    if (existing) {
      existing.count++
    } else {
      counts.set(row.locality_id, { locality_id: row.locality_id, locality_name: displayName, count: 1 })
    }
  }

  const trending = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 8)
  return NextResponse.json({ trending })
}
