import { NextRequest, NextResponse } from 'next/server'
import { authorizeApi } from '@/lib/auth-server'
import { enforceRateLimit, readJsonBody, requireSameOrigin } from '@/lib/api-security'
import {
  COUNTER_ROUND_SLOTS,
  counterRoundMinutes,
} from '@/lib/counter-rounds'
import {
  decodeChecklistNotes,
  getIstDateRange,
  getIstParts,
  inferLegacySlotKey,
  OPERATIONS_SLOTS,
} from '@/lib/operations'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { signPhotoRows } from '@/lib/photo-urls'
import { cleanText } from '@/lib/validation'

type CreateOutletBody = {
  name?: string
  city?: string
  country?: string
  manager_name?: string
  manager_phone?: string
}

function isMissingTableError(error: { code?: string }) {
  return error.code === '42P01' || error.code === 'PGRST205'
}

export async function GET() {
  const access = await authorizeApi({ roles: ['CEO', 'MANAGER', 'STAFF'] })
  if (access.response) return access.response
  const actor = access.actor!

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Operations database unavailable' }, { status: 503 })
  }

  try {
    const supabase = getSupabaseServerClient()
    const { date, start, end } = getIstDateRange()
    const ist = getIstParts()
    const nowMinutes = ist.hour * 60 + ist.minute
    const expectedSlots = OPERATIONS_SLOTS.filter(
      (slot) => nowMinutes >= slot.hour * 60
    )
    const overdueSlots = OPERATIONS_SLOTS.filter(
      (slot) => nowMinutes >= slot.hour * 60 + 30
    )
    const expectedCounterSlots = COUNTER_ROUND_SLOTS.filter(
      (slot) => nowMinutes >= counterRoundMinutes(slot)
    )
    const overdueCounterSlots = COUNTER_ROUND_SLOTS.filter(
      (slot) => nowMinutes >= counterRoundMinutes(slot) + 30
    )
    let outletQuery = supabase.from('outlets').select('*').eq('is_active', true)
    if (actor.role !== 'CEO') {
      if (!actor.outletId) {
        return NextResponse.json({ error: 'No outlet assigned' }, { status: 403 })
      }
      outletQuery = outletQuery.eq('id', actor.outletId)
    }

    const [outletsRes, salesRes, checklistsRes, complaintsRes, photosRes, alertsRes, counterRoundsRes] =
      await Promise.all([
        outletQuery,
        supabase.from('daily_sales').select('*').eq('date', date),
        supabase
          .from('checklist_submissions')
          .select('*')
          .gte('created_at', start)
          .lte('created_at', end),
        supabase.from('complaints').select('*').neq('status', 'RESOLVED'),
        supabase
          .from('photo_uploads')
          .select('*')
          .gte('created_at', start)
          .lte('created_at', end)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('alerts')
          .select('*')
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('counter_temperature_rounds')
          .select('outlet_id, slot_key')
          .eq('round_date', date),
      ])

    if (outletsRes.error) throw outletsRes.error
    if (salesRes.error) throw salesRes.error
    if (checklistsRes.error) throw checklistsRes.error
    if (complaintsRes.error) throw complaintsRes.error
    if (photosRes.error) throw photosRes.error
    if (alertsRes.error) throw alertsRes.error
    if (counterRoundsRes.error && !isMissingTableError(counterRoundsRes.error)) {
      throw counterRoundsRes.error
    }

    const signedPhotos = await signPhotoRows(photosRes.data ?? [])

    const outletIds = new Set((outletsRes.data ?? []).map((outlet) => outlet.id))
    const outlets = (outletsRes.data ?? []).map((outlet) => {
      const sales = (salesRes.data ?? []).find((sale) => sale.outlet_id === outlet.id)
      const complaints = (complaintsRes.data ?? []).filter(
        (complaint) => complaint.outlet_id === outlet.id
      )
      const checklists = (checklistsRes.data ?? []).filter(
        (checklist) => checklist.outlet_id === outlet.id
      )
      const photos = signedPhotos.filter((photo) => photo.outlet_id === outlet.id)
      const flaggedPhotos = photos.filter((photo) => photo.ai_status === 'FLAGGED')
      const completedSlotKeys = new Set(
        checklists
          .filter((checklist) => checklist.status !== 'MISSED')
          .map(
            (checklist) =>
              decodeChecklistNotes(checklist.notes).slotKey ??
              inferLegacySlotKey(checklist)
          )
          .filter((key): key is string => Boolean(key))
      )
      const completedCounterKeys = new Set(
        (counterRoundsRes.error ? [] : counterRoundsRes.data ?? [])
          .filter((round) => round.outlet_id === outlet.id)
          .map((round) => round.slot_key)
      )

      const missed = checklists.some((checklist) => checklist.status === 'MISSED')
      const late = checklists.some((checklist) => checklist.status === 'LATE')
      const highComplaint = complaints.some((complaint) => complaint.severity === 'HIGH')
      const overdueMissing = overdueSlots.some(
        (slot) => !completedSlotKeys.has(slot.key)
      ) || overdueCounterSlots.some((slot) => !completedCounterKeys.has(slot.key))
      const dueMissing = expectedSlots.some(
        (slot) => !completedSlotKeys.has(slot.key)
      ) || expectedCounterSlots.some((slot) => !completedCounterKeys.has(slot.key))

      let status: 'GREEN' | 'AMBER' | 'RED' = 'GREEN'
      if (missed || overdueMissing || highComplaint || flaggedPhotos.length > 0) status = 'RED'
      else if (late || dueMissing || complaints.length > 0) status = 'AMBER'

      const latestTimestamp = [...photos, ...checklists]
        .map((item) => item.created_at)
        .filter(Boolean)
        .sort()
        .at(-1)

      return {
        ...outlet,
        status,
        last_update: latestTimestamp ?? null,
        today_sales: sales?.total_sales ?? 0,
        complaint_count: complaints.length,
        checklists_done:
          expectedSlots.filter((slot) => completedSlotKeys.has(slot.key)).length +
          expectedCounterSlots.filter((slot) => completedCounterKeys.has(slot.key)).length,
        checklists_total: expectedSlots.length + expectedCounterSlots.length,
        counter_rounds_done: expectedCounterSlots.filter((slot) =>
          completedCounterKeys.has(slot.key)
        ).length,
        counter_rounds_total: expectedCounterSlots.length,
      }
    })

    const completedExpectedChecks = outlets.reduce(
      (sum, outlet) => sum + outlet.checklists_done,
      0
    )
    const totalExpectedChecks = outlets.reduce(
      (sum, outlet) => sum + outlet.checklists_total,
      0
    )

    return NextResponse.json({
      total_sales: (salesRes.data ?? [])
        .filter((sale) => outletIds.has(sale.outlet_id))
        .reduce((sum, sale) => sum + Number(sale.total_sales ?? 0), 0),
      total_complaints: (complaintsRes.data ?? []).filter((complaint) =>
        outletIds.has(complaint.outlet_id)
      ).length,
      compliance_rate: totalExpectedChecks
        ? Math.round((completedExpectedChecks / totalExpectedChecks) * 100)
        : 100,
      photos_uploaded: signedPhotos.filter((photo) =>
        outletIds.has(photo.outlet_id)
      ).length,
      alerts: (alertsRes.data ?? []).filter(
        (alert) => !alert.outlet_id || outletIds.has(alert.outlet_id)
      ),
      outlets,
      recent_photos: signedPhotos
        .filter((photo) => outletIds.has(photo.outlet_id))
        .slice(0, 12),
    })
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'outlets_api_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    )
    return NextResponse.json({ error: 'Operations data unavailable' }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const rateError = enforceRateLimit(request, 'create-outlet', 10, 60_000)
  if (rateError) return rateError

  const access = await authorizeApi({ roles: ['CEO'] })
  if (access.response) return access.response

  const bodyResult = await readJsonBody<CreateOutletBody>(request)
  if (bodyResult.response) return bodyResult.response
  const body = bodyResult.data!

  const name = cleanText(body.name, 80)
  const city = cleanText(body.city, 80)
  const country = cleanText(body.country || 'India', 80)
  if (!name || !city) {
    return NextResponse.json({ error: 'Outlet name and city are required' }, { status: 400 })
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Operations database unavailable' }, { status: 503 })
  }

  const { data, error } = await getSupabaseServerClient()
    .from('outlets')
    .insert({
      name,
      city,
      country,
      manager_name: cleanText(body.manager_name, 100) || null,
      manager_phone: cleanText(body.manager_phone, 30) || null,
      is_active: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
