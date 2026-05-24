import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const adminZoneId = searchParams.get('admin_zone_id')

  if (!adminZoneId) {
    return NextResponse.json({ error: 'admin_zone_id is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('officials')
    .select('id, role, name, title, party, phone, sort_order')
    .contains('admin_zone_ids', [adminZoneId])
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ officials: data })
}
