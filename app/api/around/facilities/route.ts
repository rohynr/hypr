import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

const KIND_ORDER: Record<string, number> = {
  police_station: 1,
  fire_station:   2,
  hospital:       3,
  ward_office:    4,
  pharmacy_24x7:  5,
  railway_station:6,
  metro_station:  7,
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const adminZoneId = searchParams.get('admin_zone_id')
  const cityId      = searchParams.get('city_id')

  if (!cityId) {
    return NextResponse.json({ error: 'city_id is required' }, { status: 400 })
  }

  // Ward-specific facilities (police, fire, ward office)
  const wardQuery = supabase
    .from('facilities')
    .select('id, kind, name, address_line, phone, is_24x7')
    .eq('city_id', cityId)

  if (adminZoneId) {
    wardQuery.eq('jurisdiction_admin_zone_id', adminZoneId)
  } else {
    // No ward known — only fetch city-wide facilities
    wardQuery.is('jurisdiction_admin_zone_id', null)
  }

  const { data: wardFacilities, error: wardError } = await wardQuery

  if (wardError) {
    return NextResponse.json({ error: wardError.message }, { status: 500 })
  }

  // City-wide facilities with no jurisdiction (hospitals, pharmacies)
  // Only fetch these separately if we already have a ward filter above
  let cityFacilities: typeof wardFacilities = []
  if (adminZoneId) {
    const { data, error } = await supabase
      .from('facilities')
      .select('id, kind, name, address_line, phone, is_24x7')
      .eq('city_id', cityId)
      .is('jurisdiction_admin_zone_id', null)

    if (!error && data) cityFacilities = data
  }

  const all = [...(wardFacilities ?? []), ...cityFacilities]

  // Deduplicate by id and sort by kind priority
  const seen = new Set<string>()
  const unique = all
    .filter(f => { if (seen.has(f.id)) return false; seen.add(f.id); return true })
    .sort((a, b) => (KIND_ORDER[a.kind] ?? 99) - (KIND_ORDER[b.kind] ?? 99))

  return NextResponse.json({ facilities: unique })
}
