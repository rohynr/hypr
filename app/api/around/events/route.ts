import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const localityId = searchParams.get('locality_id')

  if (!localityId) {
    return NextResponse.json({ error: 'locality_id is required' }, { status: 400 })
  }

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('local_events')
    .select('id, title, starts_at, ends_at, venue, category')
    .eq('locality_id', localityId)
    .gt('starts_at', now)
    .order('starts_at', { ascending: true })
    .limit(3)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ events: data })
}