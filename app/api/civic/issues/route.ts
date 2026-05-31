import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function makeClient(token?: string | null) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : undefined
  )
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const wardCode = searchParams.get('ward_code')

  if (!wardCode) {
    return NextResponse.json({ error: 'ward_code is required' }, { status: 400 })
  }

  const supabase = makeClient()
  const { data, error } = await supabase
    .from('civic_issues')
    .select('id, category, status, description, upvotes, created_at, ward_code, latitude, longitude, image_url')
    .eq('ward_code', wardCode)
    .order('upvotes', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ issues: data ?? [] })
}

export async function POST(request: NextRequest) {
  const token = request.headers.get('Authorization')?.split(' ')[1]
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = makeClient(token)
  const body = await request.json()

  const { data, error } = await supabase
    .from('civic_issues')
    .insert(body)
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ issue: data })
}

export async function PATCH(request: NextRequest) {
  const token = request.headers.get('Authorization')?.split(' ')[1]
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const supabase = makeClient(token)
  const { data: current } = await supabase
    .from('civic_issues').select('upvotes').eq('id', id).single()

  const { error } = await supabase
    .from('civic_issues')
    .update({ upvotes: (current?.upvotes ?? 0) + 1 })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
