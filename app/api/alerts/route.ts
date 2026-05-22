import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, getSupabaseServerClient } from '@/lib/supabase'
import { MOCK_ALERTS } from '@/lib/mock-data'

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json(MOCK_ALERTS)
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('is_read', false)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { outlet_id, alert_type, message, severity } = body

  const alert = {
    outlet_id: outlet_id ?? null,
    alert_type,
    message,
    severity: severity ?? 'MEDIUM',
    is_read: false,
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({ id: `al-${Date.now()}`, ...alert, created_at: new Date().toISOString() }, { status: 201 })
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.from('alerts').insert(alert).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
