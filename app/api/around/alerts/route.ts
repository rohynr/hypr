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

  // Get alert IDs linked to this locality
  const { data: links, error: linkError } = await supabase
    .from('alert_localities')
    .select('alert_id')
    .eq('locality_id', localityId)

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 })
  }

  if (!links || links.length === 0) {
    return NextResponse.json({ alerts: [] })
  }

  const alertIds = links.map((l: { alert_id: string }) => l.alert_id)

  // Fetch those alerts, filtered to currently active ones
  const { data, error } = await supabase
    .from('civic_alerts')
    .select('id, kind, severity, headline, details, affected_areas, source, starts_at, ends_at')
    .in('id', alertIds)
    .lte('starts_at', now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .order('severity', { ascending: false })
    .order('starts_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ alerts: data })
}
