import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, getSupabaseServerClient } from '@/lib/supabase'
import { MOCK_SALES } from '@/lib/mock-data'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const outletId = searchParams.get('outlet_id')
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  if (!isSupabaseConfigured) {
    const results = outletId
      ? MOCK_SALES.filter(s => s.outlet_id === outletId)
      : MOCK_SALES
    return NextResponse.json(results)
  }

  const supabase = getSupabaseServerClient()
  let query = supabase.from('daily_sales').select('*').eq('date', date)
  if (outletId) query = query.eq('outlet_id', outletId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (!isSupabaseConfigured) {
    return NextResponse.json({ id: `sales-${Date.now()}`, ...body }, { status: 201 })
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from('daily_sales')
    .upsert(body, { onConflict: 'outlet_id,date' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
