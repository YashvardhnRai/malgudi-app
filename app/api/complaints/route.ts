import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, getSupabaseServerClient } from '@/lib/supabase'
import { MOCK_COMPLAINTS } from '@/lib/mock-data'

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json(MOCK_COMPLAINTS)
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from('complaints')
    .select('*')
    .order('reported_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data?.length ? data : MOCK_COMPLAINTS)
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (!isSupabaseConfigured) {
    return NextResponse.json({
      id: `comp-${Date.now()}`,
      ...body,
      status: 'OPEN',
      reported_at: new Date().toISOString(),
      resolved_at: null,
    }, { status: 201 })
  }

  const supabase = getSupabaseServerClient()
  const record = {
    ...body,
    status: 'OPEN',
    reported_at: new Date().toISOString(),
    resolved_at: null,
  }

  const { data, error } = await supabase.from('complaints').insert(record).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (body.severity === 'HIGH') {
    await supabase.from('alerts').insert({
      outlet_id: body.outlet_id,
      alert_type: 'NEW_COMPLAINT',
      message: `HIGH severity complaint at ${body.outlet_id}: ${body.complaint_text?.slice(0, 60)}...`,
      severity: 'HIGH',
      is_read: false,
    })
  }

  return NextResponse.json(data, { status: 201 })
}
