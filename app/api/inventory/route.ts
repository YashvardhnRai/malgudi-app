import { NextRequest, NextResponse } from 'next/server'
import { getCeoEmails } from '@/lib/auth'
import { enforceRateLimit, readJsonBody, requireSameOrigin } from '@/lib/api-security'
import { writeAuditEvent } from '@/lib/audit'
import { authorizeApi } from '@/lib/auth-server'
import {
  deliverOperationalEmails,
  deliverOperationalPhoneAlerts,
} from '@/lib/notification-delivery'
import { getIstParts } from '@/lib/operations'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'
import {
  cleanText,
  isIsoDate,
  isUuid,
  toNonNegativeNumber,
} from '@/lib/validation'

type InventoryBody = {
  outlet_id?: unknown
  date?: unknown
  item_name?: unknown
  category?: unknown
  unit?: unknown
  opening_qty?: unknown
  used_qty?: unknown
  wasted_qty?: unknown
  closing_qty?: unknown
  note?: unknown
}

type CeoContact = {
  email: string
  phone: string | null
}

function withoutDeliveryPhone<T extends { recipient_phone?: string | null }>(
  notifications: T[]
) {
  return notifications.map((notification) => {
    const copy = { ...notification }
    delete copy.recipient_phone
    return copy
  })
}

function pendingMigrationResponse() {
  return NextResponse.json(
    { error: 'Inventory is waiting for the restaurant features database migration' },
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
    .from('inventory_logs')
    .select('*')
    .eq('log_date', date)
    .order('created_at', { ascending: false })

  if (outletId) query = query.eq('outlet_id', outletId)

  const { data, error } = await query
  if (error) {
    if (isMissingTableError(error)) return pendingMigrationResponse()
    return NextResponse.json({ error: 'Unable to load inventory' }, { status: 503 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const rateError = enforceRateLimit(request, 'inventory:create', 40, 60_000)
  if (rateError) return rateError

  const parsed = await readJsonBody<InventoryBody>(request)
  if (parsed.response || !parsed.data) return parsed.response
  const body = parsed.data

  const outletId = body.outlet_id
  const date = body.date ?? getIstParts().date
  const itemName = cleanText(body.item_name, 90)
  const category = cleanText(body.category || 'GENERAL', 50).toUpperCase()
  const unit = cleanText(body.unit || 'pcs', 24)
  const note = cleanText(body.note, 240)
  const openingQty = toNonNegativeNumber(body.opening_qty)
  const usedQty = toNonNegativeNumber(body.used_qty)
  const wastedQty = toNonNegativeNumber(body.wasted_qty)
  const closingQty = toNonNegativeNumber(body.closing_qty)

  if (
    !isUuid(outletId) ||
    !isIsoDate(date) ||
    !itemName ||
    !unit ||
    [openingQty, usedQty, wastedQty, closingQty].some((value) => value === null)
  ) {
    return NextResponse.json({ error: 'Valid inventory details are required' }, { status: 400 })
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
  const { data, error } = await supabase
    .from('inventory_logs')
    .insert({
      outlet_id: outletId,
      recorded_by: actor.profileId,
      item_name: itemName,
      category,
      unit,
      opening_qty: openingQty,
      used_qty: usedQty,
      wasted_qty: wastedQty,
      closing_qty: closingQty,
      note: note || null,
      log_date: date,
    })
    .select()
    .single()

  if (error) {
    if (isMissingTableError(error)) return pendingMigrationResponse()
    return NextResponse.json({ error: 'Unable to save inventory' }, { status: 400 })
  }

  await writeAuditEvent({
    actor,
    action: 'INVENTORY_LOGGED',
    outletId,
    target: data.id,
    detail: { item_name: itemName, wasted_qty: wastedQty, unit, log_date: date },
  })

  if ((wastedQty ?? 0) > 0) {
    const [{ data: outlet }, { data: ceos }] = await Promise.all([
      supabase
        .from('outlets')
        .select('name, manager_phone')
        .eq('id', outletId)
        .maybeSingle<{ name: string; manager_phone: string | null }>(),
      supabase
        .from('users')
        .select('email, phone')
        .in('email', getCeoEmails())
        .returns<CeoContact[]>(),
    ])

    const title = 'Wastage logged'
    const message = `${itemName}: ${wastedQty} ${unit} wasted at ${
      outlet?.name ?? 'outlet'
    }.`
    const notifications = getCeoEmails().map((email) => {
      const contact = ceos?.find((ceo) => ceo.email.toLowerCase() === email)
      return {
        recipient_email: email,
        recipient_phone: contact?.phone ?? null,
        recipient_role: 'CEO',
        type: 'WASTAGE_LOGGED',
        title,
        message,
        outlet_id: outletId,
        manager_phone: outlet?.manager_phone ?? null,
        is_read: false,
      }
    })

    await Promise.all([
      supabase.from('notifications').insert(withoutDeliveryPhone(notifications)),
      supabase.from('alerts').insert({
        outlet_id: outletId,
        alert_type: 'WASTAGE_LOGGED',
        message,
        severity: (wastedQty ?? 0) >= 5 ? 'MEDIUM' : 'LOW',
        is_read: false,
      }),
      deliverOperationalEmails(notifications),
      deliverOperationalPhoneAlerts(notifications),
    ])
  }

  return NextResponse.json(data, { status: 201 })
}
