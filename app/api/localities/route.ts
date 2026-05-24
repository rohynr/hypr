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

  const { data, error } = await supabase
    .from('localities')
    .select('id, name, level, parent_id, admin_zone_id, lat, lon, admin_zones(display_name, zone_code, lat, lon)')
    .eq('city_id', cityId)
    .not('name', 'ilike', 'Mumbai (City-wide)%')
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ localities: data })
}