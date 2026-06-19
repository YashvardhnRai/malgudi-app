import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit, readJsonBody, requireSameOrigin } from '@/lib/api-security'
import { writeAuditEvent } from '@/lib/audit'
import { authorizeApi } from '@/lib/auth-server'
import { getIstParts } from '@/lib/operations'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { cleanText, isIsoDate, isUuid } from '@/lib/validation'

type AttendanceBody = {
  outlet_id?: unknown
  date?: unknown
  action?: unknown
  note?: unknown
}

type AttendanceRow = {
  id: string
  outlet_id: string
  user_email: string
  check_in_at: string
  check_out_at: string | null
}

function pendingMigrationResponse() {
  return NextResponse.json(
    { error: 'Attendance is waiting for the restaurant features database migration' },
    { status: 503 }
  )
}

function isMissingTableError(error: { code?: string }) {
  return error.code === '42P01' || error.code === 'PGRST205'
}

export async function GET(request: NextRequest) {
  const { actor, response } = await authorizeApi({
    roles: ['CEO', 'MANAGER', 'STAFF'],
  })
  if (response || !actor) return response

  const { searchParams } = new URL(request.url)
  const requestedOutletId = searchParams.get('outlet_id')
  const date = searchParams.get('date') ?? getIstParts().date

  if ((requestedOutletId && !isUuid(requestedOutletId)) || !isIsoDate(date)) {
    return NextResponse.json({ error: 'Invalid outlet or date' }, { status: 400 })
  }

  const outletId = actor.role === 'CEO' ? requestedOutletId : actor.outletId
  if (actor.role !== 'CEO' && !outletId) {
    return NextResponse.json({ error: 'No outlet assigned' }, { status: 403 })
  }

  if (!isSupabaseConfigured) return NextResponse.json([])

  let query = getSupabaseServerClient()
    .from('shift_attendance')
    .select('*')
    .eq('shift_date', date)
    .order('check_in_at', { ascending: false })

  if (outletId) query = query.eq('outlet_id', outletId)
  if (actor.role === 'STAFF') query = query.eq('user_email', actor.email)

  const { data, error } = await query
  if (error) {
    if (isMissingTableError(error)) return pendingMigrationResponse()
    return NextResponse.json({ error: 'Unable to load attendance' }, { status: 503 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const rateError = enforceRateLimit(request, 'attendance:update', 30, 60_000)
  if (rateError) return rateError

  const parsed = await readJsonBody<AttendanceBody>(request)
  if (parsed.response || !parsed.data) return parsed.response
  const body = parsed.data

  const outletId = body.outlet_id
  const date = body.date ?? getIstParts().date
  const action = typeof body.action === 'string' ? body.action : ''
  const note = cleanText(body.note, 240)

  if (!isUuid(outletId) || !isIsoDate(date) || !['check_in', 'check_out'].includes(action)) {
    return NextResponse.json({ error: 'Valid attendance details are required' }, { status: 400 })
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
  const { data: existing, error: existingError } = await supabase
    .from('shift_attendance')
    .select('id, outlet_id, user_email, check_in_at, check_out_at')
    .eq('outlet_id', outletId)
    .eq('user_email', actor.email)
    .eq('shift_date', date)
    .maybeSingle<AttendanceRow>()

  if (existingError) {
    if (isMissingTableError(existingError)) return pendingMigrationResponse()
    return NextResponse.json({ error: 'Unable to load attendance' }, { status: 503 })
  }

  const now = new Date().toISOString()

  if (action === 'check_out') {
    if (!existing) {
      return NextResponse.json({ error: 'Check in before checking out' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('shift_attendance')
      .update({
        status: 'CHECKED_OUT',
        check_out_at: existing.check_out_at ?? now,
        note: note || null,
        updated_at: now,
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Unable to update attendance' }, { status: 400 })

    await writeAuditEvent({
      actor,
      action: 'ATTENDANCE_UPDATED',
      outletId,
      target: data.id,
      detail: { shift_date: date, status: 'CHECKED_OUT' },
    })

    return NextResponse.json(data)
  }

  const payload = {
    outlet_id: outletId,
    user_id: actor.profileId,
    user_email: actor.email,
    user_name: actor.name,
    role: actor.role,
    shift_date: date,
    status: existing?.check_out_at ? 'CHECKED_OUT' : 'CHECKED_IN',
    check_in_at: existing?.check_in_at ?? now,
    check_out_at: existing?.check_out_at ?? null,
    note: note || null,
    updated_at: now,
  }

  const { data, error } = await supabase
    .from('shift_attendance')
    .upsert(payload, { onConflict: 'outlet_id,user_email,shift_date' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Unable to update attendance' }, { status: 400 })

  await writeAuditEvent({
    actor,
    action: 'ATTENDANCE_UPDATED',
    outletId,
    target: data.id,
    detail: { shift_date: date, status: data.status },
  })

  return NextResponse.json(data, { status: existing ? 200 : 201 })
}
