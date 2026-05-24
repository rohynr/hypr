import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const wardCode = searchParams.get('ward_code')

  if (!wardCode) {
    return NextResponse.json({ error: 'ward_code is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('civic_issues')
    .select('id, category, status, title, description, upvote_count, reported_at, ward_code, lat, lon')
    .eq('ward_code', wardCode)
    .order('reported_at', { ascending: false })
    .limit(20)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ issues: data })
}
