import { NextRequest, NextResponse } from 'next/server'
import { authorizeApi } from '@/lib/auth-server'
import { enforceRateLimit, readJsonBody, requireSameOrigin } from '@/lib/api-security'
import { writeAuditEvent } from '@/lib/audit'
import {
  decodeChecklistNotes,
  encodeChecklistNotes,
  getIstDateRange,
  getSlotByKey,
} from '@/lib/operations'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { isUuid, cleanText } from '@/lib/validation'

type ChecklistBody = {
  outlet_id?: string
  slot_key?: string
  notes?: string
  items?: Array<{
    name?: string
    checks?: string[]
    notes?: string
  }>
}

export async function GET(request: NextRequest) {
  const outletId = request.nextUrl.searchParams.get('outlet_id')
  if (!outletId) {
    return NextResponse.json({ error: 'Outlet is required' }, { status: 400 })
  }

  const access = await authorizeApi({
    roles: ['CEO', 'MANAGER', 'STAFF'],
    outletId,
  })
  if (access.response) return access.response
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Operations database unavailable' }, { status: 503 })
  }

  const { start, end } = getIstDateRange()
  const { data, error } = await getSupabaseServerClient()
    .from('checklist_submissions')
    .select('*')
    .eq('outlet_id', outletId)
    .gte('created_at', start)
    .lte('created_at', end)
    .order('submission_time', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Checklist data unavailable' }, { status: 503 })
  }
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const rateError = enforceRateLimit(request, 'checklist-submit', 20, 60_000)
  if (rateError) return rateError

  const bodyResult = await readJsonBody<ChecklistBody>(request)
  if (bodyResult.response) return bodyResult.response
  const body = bodyResult.data!
  const outletId = body.outlet_id ?? ''
  const slot = getSlotByKey(body.slot_key)

  const access = await authorizeApi({
    roles: ['CEO', 'MANAGER', 'STAFF'],
    outletId,
  })
  if (access.response) return access.response
  const actor = access.actor!

  if (!isUuid(outletId) || !slot) {
    return NextResponse.json(
      { error: 'A valid outlet and schedule slot are required' },
      { status: 400 }
    )
  }
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Operations database unavailable' }, { status: 503 })
  }

  const supabase = getSupabaseServerClient()
  const { start, end } = getIstDateRange()
  const { data: existing, error: existingError } = await supabase
    .from('checklist_submissions')
    .select('id, notes')
    .eq('outlet_id', outletId)
    .eq('checklist_type', slot.checklistType)
    .gte('created_at', start)
    .lte('created_at', end)

  if (existingError) {
    return NextResponse.json({ error: 'Checklist could not be checked' }, { status: 503 })
  }

  const duplicate = (existing ?? []).find(
    (submission) => decodeChecklistNotes(submission.notes).slotKey === slot.key
  )
  if (duplicate) {
    return NextResponse.json(
      { error: 'This schedule slot has already been submitted', id: duplicate.id },
      { status: 409 }
    )
  }

  const { data: submission, error } = await supabase
    .from('checklist_submissions')
    .insert({
      outlet_id: outletId,
      submitted_by: actor.profileId,
      checklist_type: slot.checklistType,
      submission_time: new Date().toISOString(),
      status: 'SUBMITTED',
      notes: encodeChecklistNotes(slot.key, cleanText(body.notes, 500)),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Checklist could not be submitted' }, { status: 500 })
  }

  if (Array.isArray(body.items) && body.items.length > 0) {
    const checklistItems = body.items.slice(0, 50).flatMap((item) =>
      (item.checks ?? []).slice(0, 20).map((check) => ({
        submission_id: submission.id,
        item_name: `${cleanText(item.name, 100)} - ${cleanText(check, 150)}`,
        is_completed: true,
        notes: cleanText(item.notes, 300) || null,
      }))
    )
    if (checklistItems.length > 0) {
      await supabase.from('checklist_items').insert(checklistItems)
    }
  }

  await writeAuditEvent({
    actor,
    action: 'CHECKLIST_SUBMITTED',
    outletId,
    target: submission.id,
    detail: { slot_key: slot.key },
  })

  return NextResponse.json(submission, { status: 201 })
}
