import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const localityId = searchParams.get('locality_id')
  const cityId = searchParams.get('city_id')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20
  const offset = (page - 1) * limit

  if (!cityId) {
    return NextResponse.json({ error: 'city_id is required' }, { status: 400 })
  }

  let query = supabase
    .from('feed')
    .select('*')
    .eq('city_id', cityId)
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (localityId) {
    // Fetch child localities so selecting "Bandra West" also shows
    // articles tagged to Pali Hill, Carter Road etc.
    const { data: children } = await supabase
      .from('localities')
      .select('id')
      .eq('parent_id', localityId)

    const allIds = [localityId, ...(children?.map(c => c.id) || [])]
    query = query.in('locality_id', allIds)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ articles: data })
}