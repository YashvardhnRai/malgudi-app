import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit, readJsonBody, requireSameOrigin } from '@/lib/api-security'
import { writeAuditEvent } from '@/lib/audit'
import { authorizeApi } from '@/lib/auth-server'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { cleanText, isUuid } from '@/lib/validation'

const SOURCES = new Set(['SWIGGY', 'ZOMATO', 'DIRECT', 'GOOGLE'])
const SEVERITIES = new Set(['LOW', 'MEDIUM', 'HIGH'])

type ComplaintBody = {
  outlet_id?: unknown
  source?: unknown
  complaint_text?: unknown
  severity?: unknown
}

export async function GET() {
  const { actor, response } = await authorizeApi({
    roles: ['CEO', 'MANAGER', 'STAFF'],
  })
  if (response || !actor) return response

  if (!isSupabaseConfigured) return NextResponse.json([])

  let query = getSupabaseServerClient()
    .from('complaints')
    .select('*')
    .order('reported_at', { ascending: false })

  if (actor.role !== 'CEO') {
    if (!actor.outletId) return NextResponse.json([])
    query = query.eq('outlet_id', actor.outletId)
  }

  const { data, error } = await query
  if (error) {
    console.error(JSON.stringify({ event: 'complaints_load_failed', message: error.message }))
    return NextResponse.json({ error: 'Unable to load complaints' }, { status: 503 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const rateError = enforceRateLimit(request, 'complaints:create', 12, 60_000)
  if (rateError) return rateError

  const parsed = await readJsonBody<ComplaintBody>(request)
  if (parsed.response || !parsed.data) return parsed.response

  const outletId = parsed.data.outlet_id
  const source = cleanText(parsed.data.source, 20).toUpperCase()
  const severity = cleanText(parsed.data.severity, 10).toUpperCase()
  const complaintText = cleanText(parsed.data.complaint_text, 1500)

  if (
    !isUuid(outletId) ||
    !SOURCES.has(source) ||
    !SEVERITIES.has(severity) ||
    complaintText.length < 5
  ) {
    return NextResponse.json({ error: 'Valid outlet, source, severity, and complaint are required' }, { status: 400 })
  }

  const { actor, response } = await authorizeApi({
    roles: ['CEO', 'MANAGER', 'STAFF'],
    outletId,
  })
  if (response || !actor) return response

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Restaurant data service is unavailable' }, { status: 503 })
  }

  const supabase = getSupabaseServerClient()
  const record = {
    outlet_id: outletId,
    source,
    complaint_text: complaintText,
    severity,
    status: 'OPEN',
    reported_at: new Date().toISOString(),
    resolved_at: null,
  }

  const { data, error } = await supabase.from('complaints').insert(record).select().single()
  if (error) {
    console.error(JSON.stringify({ event: 'complaint_create_failed', message: error.message }))
    return NextResponse.json({ error: 'Unable to save complaint' }, { status: 400 })
  }

  if (severity === 'HIGH') {
    await supabase.from('alerts').insert({
      outlet_id: outletId,
      alert_type: 'NEW_COMPLAINT',
      message: `High-priority ${source.toLowerCase()} complaint: ${complaintText.slice(0, 120)}`,
      severity: 'HIGH',
      is_read: false,
    })
  }

  await writeAuditEvent({
    actor,
    action: 'COMPLAINT_CREATED',
    outletId,
    target: data.id,
    detail: { source, severity },
  })

  return NextResponse.json(data, { status: 201 })
}
