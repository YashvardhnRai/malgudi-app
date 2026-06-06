import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit, readJsonBody, requireSameOrigin } from '@/lib/api-security'
import { authorizeApi } from '@/lib/auth-server'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { cleanText, isUuid } from '@/lib/validation'

const SEVERITIES = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])

export async function GET() {
  const { actor, response } = await authorizeApi({
    roles: ['CEO', 'MANAGER'],
  })
  if (response || !actor) return response
  if (!isSupabaseConfigured) return NextResponse.json([])

  let query = getSupabaseServerClient()
    .from('alerts')
    .select('*')
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(100)

  if (actor.role !== 'CEO') {
    if (!actor.outletId) return NextResponse.json([])
    query = query.eq('outlet_id', actor.outletId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: 'Unable to load alerts' }, { status: 503 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const rateError = enforceRateLimit(request, 'alerts:create', 20, 60_000)
  if (rateError) return rateError

  const parsed = await readJsonBody<{
    outlet_id?: unknown
    alert_type?: unknown
    message?: unknown
    severity?: unknown
  }>(request)
  if (parsed.response || !parsed.data) return parsed.response

  const outletId = parsed.data.outlet_id
  const alertType = cleanText(parsed.data.alert_type, 60).toUpperCase()
  const message = cleanText(parsed.data.message, 500)
  const severity = cleanText(parsed.data.severity, 10).toUpperCase() || 'MEDIUM'

  if (!isUuid(outletId) || !alertType || message.length < 3 || !SEVERITIES.has(severity)) {
    return NextResponse.json({ error: 'Valid alert details are required' }, { status: 400 })
  }

  const { actor, response } = await authorizeApi({
    roles: ['CEO', 'MANAGER'],
    outletId,
  })
  if (response || !actor) return response
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Restaurant data service is unavailable' }, { status: 503 })
  }

  const { data, error } = await getSupabaseServerClient()
    .from('alerts')
    .insert({
      outlet_id: outletId,
      alert_type: alertType,
      message,
      severity,
      is_read: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Unable to create alert' }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
