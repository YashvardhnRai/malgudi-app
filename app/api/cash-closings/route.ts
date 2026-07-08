import { NextRequest, NextResponse } from 'next/server'
import { getCeoEmails } from '@/lib/auth'
import { enforceRateLimit, requireSameOrigin } from '@/lib/api-security'
import { writeAuditEvent } from '@/lib/audit'
import { authorizeApi, type AuthActor } from '@/lib/auth-server'
import {
  calculateCashClosing,
  deriveCashClosingStatus,
  isCashClosingDifferenceAboveThreshold,
  type CashClosingAmounts,
} from '@/lib/cash-closing'
import { deliverOperationalEmails } from '@/lib/notification-delivery'
import { getIstParts } from '@/lib/operations'
import { signPhotoPath } from '@/lib/photo-urls'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'
import type { CashClosing } from '@/lib/types'
import { cleanText, isIsoDate, isUuid } from '@/lib/validation'

const MAX_PHOTO_BYTES = 2 * 1024 * 1024
const MAX_REQUEST_PHOTO_BYTES = 4 * 1024 * 1024

const MONEY_FIELDS = [
  'opening_cash_balance',
  'cash_sales_as_per_pos',
  'upi_sales',
  'card_sales',
  'aggregator_sales',
  'cash_expenses',
  'cash_deposited_or_handed_over',
  'physical_cash_counted',
] as const satisfies readonly (keyof CashClosingAmounts)[]

type CashClosingRow = CashClosing

function isMissingTableError(error: { code?: string }) {
  return error.code === '42P01' || error.code === 'PGRST205'
}

function migrationPending() {
  return NextResponse.json(
    { error: 'Cash closing is waiting for the latest database migration' },
    { status: 503 }
  )
}

function parseMoney(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || value.trim() === '') return null
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0 || number > 1_000_000_000) return null
  return Math.round((number + Number.EPSILON) * 100) / 100
}

function parseAmounts(formData: FormData) {
  const entries = MONEY_FIELDS.map((field) => [field, parseMoney(formData.get(field))] as const)
  if (entries.some(([, value]) => value === null)) return null
  return Object.fromEntries(entries) as CashClosingAmounts
}

function getImage(formData: FormData, key: string) {
  const value = formData.get(key)
  return value instanceof File && value.size > 0 ? value : null
}

function validateImage(file: File | null, label: string) {
  if (!file) return null
  if (!file.type.startsWith('image/')) return `${label} must be an image`
  if (file.size > MAX_PHOTO_BYTES) return `${label} must be under 2 MB`
  return null
}

async function uploadProof({
  file,
  outletId,
  businessDate,
  label,
}: {
  file: File
  outletId: string
  businessDate: string
  label: string
}) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-90) || `${label}.jpg`
  const path = `${outletId}/cash-closing/${businessDate}/${label}-${crypto.randomUUID()}-${safeName}`
  const { data, error } = await getSupabaseServerClient().storage
    .from('photos')
    .upload(path, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type || 'image/jpeg',
      upsert: false,
    })
  if (error) throw error
  return data.path
}

async function withSignedProofs(row: CashClosingRow) {
  const [proofPhotoUrl, posClosingReportPhotoUrl] = await Promise.all([
    signPhotoPath(row.proof_photo_url),
    signPhotoPath(row.pos_closing_report_photo_url),
  ])
  return {
    ...row,
    proof_photo_url: proofPhotoUrl,
    pos_closing_report_photo_url: posClosingReportPhotoUrl,
  }
}

async function sendCashClosingAlerts(row: CashClosingRow, actor: AuthActor) {
  const supabase = getSupabaseServerClient()
  const { data: outlet } = await supabase
    .from('outlets')
    .select('name, manager_phone')
    .eq('id', row.outlet_id)
    .maybeSingle<{ name: string; manager_phone: string | null }>()
  const outletName = outlet?.name ?? 'Outlet'
  const marker = `[cash-closing:${row.id}]`
  const alerts: Array<{ type: string; title: string; message: string; severity: string }> = []

  if (!row.proof_photo_url || !row.pos_closing_report_photo_url) {
    alerts.push({
      type: 'CASH_CLOSING_PROOF_MISSING',
      title: 'Cash closing proof missing',
      message: `${outletName} cash closing is missing one or more proof photos. ${marker}`,
      severity: 'HIGH',
    })
  }
  if (!row.verified_by?.trim()) {
    alerts.push({
      type: 'CASH_CLOSING_VERIFIER_MISSING',
      title: 'Cash closing verifier missing',
      message: `${outletName} cash closing was submitted without a verifier. ${marker}`,
      severity: 'HIGH',
    })
  }
  if (Number(row.difference_amount) < 0) {
    alerts.push({
      type: 'CASH_CLOSING_SHORTAGE',
      title: 'Cash shortage detected',
      message: `${outletName} has a cash shortage of Rs ${Math.abs(Number(row.difference_amount)).toFixed(2)}. ${marker}`,
      severity: 'HIGH',
    })
  }
  if (Number(row.difference_amount) > 0) {
    alerts.push({
      type: 'CASH_CLOSING_EXCESS',
      title: 'Cash excess detected',
      message: `${outletName} has excess cash of Rs ${Number(row.difference_amount).toFixed(2)}. ${marker}`,
      severity: 'MEDIUM',
    })
  }
  if (isCashClosingDifferenceAboveThreshold(Number(row.difference_amount))) {
    alerts.push({
      type: 'CASH_CLOSING_THRESHOLD',
      title: 'Cash difference above Rs 500',
      message: `${outletName} cash difference is Rs ${Number(row.difference_amount).toFixed(2)}, above the allowed threshold. ${marker}`,
      severity: 'CRITICAL',
    })
  }

  for (const alert of alerts) {
    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('type', alert.type)
      .eq('outlet_id', row.outlet_id)
      .ilike('message', `%${marker}%`)
    if ((count ?? 0) > 0) continue

    const notifications = getCeoEmails().map((email) => ({
      recipient_email: email,
      recipient_role: 'CEO',
      type: alert.type,
      title: alert.title,
      message: alert.message,
      outlet_id: row.outlet_id,
      manager_phone: outlet?.manager_phone ?? null,
      is_read: false,
    }))
    await Promise.all([
      supabase.from('notifications').insert(notifications),
      supabase.from('alerts').insert({
        outlet_id: row.outlet_id,
        alert_type: alert.type,
        message: alert.message,
        severity: alert.severity,
        is_read: false,
      }),
      deliverOperationalEmails(notifications),
    ])
  }

  await writeAuditEvent({
    actor,
    action: actor.role === 'CEO' ? 'CASH_CLOSING_REVIEWED' : 'CASH_CLOSING_SUBMITTED',
    outletId: row.outlet_id,
    target: row.id,
    detail: {
      business_date: row.business_date,
      expected_cash: Number(row.expected_cash),
      difference_amount: Number(row.difference_amount),
      status: row.status,
    },
  })
}

export async function GET(request: NextRequest) {
  const { actor, response } = await authorizeApi({ roles: ['CEO', 'MANAGER', 'STAFF'] })
  if (response || !actor) return response
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Restaurant data service is unavailable' }, { status: 503 })
  }

  const { searchParams } = new URL(request.url)
  const requestedOutletId = searchParams.get('outlet_id')
  const date = searchParams.get('date') ?? getIstParts().date
  if ((requestedOutletId && !isUuid(requestedOutletId)) || !isIsoDate(date)) {
    return NextResponse.json({ error: 'Invalid outlet or business date' }, { status: 400 })
  }
  const outletId = actor.role === 'CEO' ? requestedOutletId : actor.outletId
  if (actor.role !== 'CEO' && !outletId) {
    return NextResponse.json({ error: 'No outlet assigned' }, { status: 403 })
  }

  let query = getSupabaseServerClient()
    .from('cash_closings')
    .select('*')
    .eq('business_date', date)
    .order('submitted_at', { ascending: false })
  if (outletId) query = query.eq('outlet_id', outletId)
  const { data, error } = await query
  if (error) {
    if (isMissingTableError(error)) return migrationPending()
    return NextResponse.json({ error: 'Unable to load cash closings' }, { status: 503 })
  }
  return NextResponse.json({ closings: await Promise.all((data ?? []).map(withSignedProofs)) })
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const rateError = enforceRateLimit(request, 'cash-closing:create', 8, 60_000)
  if (rateError) return rateError

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Multipart form data is required' }, { status: 400 })
  }
  const outletId = String(formData.get('outlet_id') ?? '')
  const businessDate = String(formData.get('business_date') ?? '')
  const amounts = parseAmounts(formData)
  if (!isUuid(outletId) || !isIsoDate(businessDate) || !amounts) {
    return NextResponse.json({ error: 'Valid outlet, date, and cash values are required' }, { status: 400 })
  }

  const { actor, response } = await authorizeApi({
    roles: ['CEO', 'MANAGER', 'STAFF'],
    outletId,
  })
  if (response || !actor) return response
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Restaurant data service is unavailable' }, { status: 503 })
  }
  const today = getIstParts().date
  if (businessDate > today || (actor.role !== 'CEO' && businessDate !== today)) {
    return NextResponse.json({ error: "Staff can submit only today's cash closing" }, { status: 400 })
  }

  const countedBy = cleanText(formData.get('counted_by'), 120) || actor.name
  const verifiedBy = cleanText(formData.get('verified_by'), 120) || null
  const notes = cleanText(formData.get('notes'), 1000) || null
  const proofPhoto = getImage(formData, 'proof_photo')
  const posPhoto = getImage(formData, 'pos_closing_report_photo')
  const imageError =
    validateImage(proofPhoto, 'Cash proof photo') ||
    validateImage(posPhoto, 'POS closing report photo')
  if (imageError) return NextResponse.json({ error: imageError }, { status: 400 })
  if ((proofPhoto?.size ?? 0) + (posPhoto?.size ?? 0) > MAX_REQUEST_PHOTO_BYTES) {
    return NextResponse.json({ error: 'The proof photos are too large' }, { status: 413 })
  }

  const supabase = getSupabaseServerClient()
  const { data: existing, error: existingError } = await supabase
    .from('cash_closings')
    .select('id')
    .eq('outlet_id', outletId)
    .eq('business_date', businessDate)
    .maybeSingle()
  if (existingError) {
    if (isMissingTableError(existingError)) return migrationPending()
    return NextResponse.json({ error: 'Unable to verify cash closing' }, { status: 503 })
  }
  if (existing) {
    return NextResponse.json({ error: 'Cash closing is already submitted for this date' }, { status: 409 })
  }

  const uploadedPaths: string[] = []
  try {
    const proofPhotoUrl = proofPhoto
      ? await uploadProof({ file: proofPhoto, outletId, businessDate, label: 'cash-proof' })
      : null
    if (proofPhotoUrl) uploadedPaths.push(proofPhotoUrl)
    const posClosingReportPhotoUrl = posPhoto
      ? await uploadProof({ file: posPhoto, outletId, businessDate, label: 'pos-report' })
      : null
    if (posClosingReportPhotoUrl) uploadedPaths.push(posClosingReportPhotoUrl)
    const { differenceAmount } = calculateCashClosing(amounts)
    const status = deriveCashClosingStatus({
      differenceAmount,
      proofPhotoUrl,
      posClosingReportPhotoUrl,
      verifiedBy,
    })

    const { data, error } = await supabase
      .from('cash_closings')
      .insert({
        outlet_id: outletId,
        business_date: businessDate,
        ...amounts,
        status,
        counted_by: countedBy,
        verified_by: verifiedBy,
        submitted_by: actor.profileId,
        submitted_by_email: actor.email,
        notes,
        proof_photo_url: proofPhotoUrl,
        pos_closing_report_photo_url: posClosingReportPhotoUrl,
      })
      .select()
      .single<CashClosingRow>()
    if (error) throw error
    try {
      await sendCashClosingAlerts(data, actor)
    } catch (alertError) {
      console.error(JSON.stringify({
        event: 'cash_closing_alert_failed',
        closingId: data.id,
        message: alertError instanceof Error ? alertError.message : 'Unknown error',
      }))
    }
    return NextResponse.json({ closing: await withSignedProofs(data) }, { status: 201 })
  } catch (error) {
    if (uploadedPaths.length) await supabase.storage.from('photos').remove(uploadedPaths)
    console.error(JSON.stringify({
      event: 'cash_closing_create_failed',
      outletId,
      message: error instanceof Error ? error.message : 'Unknown error',
    }))
    return NextResponse.json({ error: 'Cash closing could not be saved' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const rateError = enforceRateLimit(request, 'cash-closing:review', 12, 60_000)
  if (rateError) return rateError

  const { actor, response } = await authorizeApi({ roles: ['CEO'] })
  if (response || !actor) return response
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Multipart form data is required' }, { status: 400 })
  }
  const id = String(formData.get('id') ?? '')
  const amounts = parseAmounts(formData)
  if (!isUuid(id) || !amounts) {
    return NextResponse.json({ error: 'Valid cash closing values are required' }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  const { data: existing, error: existingError } = await supabase
    .from('cash_closings')
    .select('*')
    .eq('id', id)
    .maybeSingle<CashClosingRow>()
  if (existingError) {
    if (isMissingTableError(existingError)) return migrationPending()
    return NextResponse.json({ error: 'Unable to load cash closing' }, { status: 503 })
  }
  if (!existing) return NextResponse.json({ error: 'Cash closing not found' }, { status: 404 })

  const proofPhoto = getImage(formData, 'proof_photo')
  const posPhoto = getImage(formData, 'pos_closing_report_photo')
  const imageError =
    validateImage(proofPhoto, 'Cash proof photo') ||
    validateImage(posPhoto, 'POS closing report photo')
  if (imageError) return NextResponse.json({ error: imageError }, { status: 400 })
  if ((proofPhoto?.size ?? 0) + (posPhoto?.size ?? 0) > MAX_REQUEST_PHOTO_BYTES) {
    return NextResponse.json({ error: 'The proof photos are too large' }, { status: 413 })
  }

  const uploadedPaths: string[] = []
  try {
    const proofPhotoUrl = proofPhoto
      ? await uploadProof({
          file: proofPhoto,
          outletId: existing.outlet_id,
          businessDate: existing.business_date,
          label: 'cash-proof',
        })
      : existing.proof_photo_url
    if (proofPhoto && proofPhotoUrl) uploadedPaths.push(proofPhotoUrl)
    const posClosingReportPhotoUrl = posPhoto
      ? await uploadProof({
          file: posPhoto,
          outletId: existing.outlet_id,
          businessDate: existing.business_date,
          label: 'pos-report',
        })
      : existing.pos_closing_report_photo_url
    if (posPhoto && posClosingReportPhotoUrl) uploadedPaths.push(posClosingReportPhotoUrl)

    const verifiedBy = cleanText(formData.get('verified_by'), 120) || null
    const { differenceAmount } = calculateCashClosing(amounts)
    const status = deriveCashClosingStatus({
      differenceAmount,
      proofPhotoUrl,
      posClosingReportPhotoUrl,
      verifiedBy,
    })
    const { data, error } = await supabase
      .from('cash_closings')
      .update({
        ...amounts,
        status,
        counted_by: cleanText(formData.get('counted_by'), 120) || existing.counted_by,
        verified_by: verifiedBy,
        notes: cleanText(formData.get('notes'), 1000) || null,
        proof_photo_url: proofPhotoUrl,
        pos_closing_report_photo_url: posClosingReportPhotoUrl,
        reviewed_by: actor.profileId,
        reviewed_by_email: actor.email,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single<CashClosingRow>()
    if (error) throw error

    const oldPaths = [
      proofPhoto ? existing.proof_photo_url : null,
      posPhoto ? existing.pos_closing_report_photo_url : null,
    ].filter((value): value is string => Boolean(value))
    if (oldPaths.length) await supabase.storage.from('photos').remove(oldPaths)
    try {
      await sendCashClosingAlerts(data, actor)
    } catch (alertError) {
      console.error(JSON.stringify({
        event: 'cash_closing_alert_failed',
        closingId: data.id,
        message: alertError instanceof Error ? alertError.message : 'Unknown error',
      }))
    }
    return NextResponse.json({ closing: await withSignedProofs(data) })
  } catch (error) {
    if (uploadedPaths.length) await supabase.storage.from('photos').remove(uploadedPaths)
    console.error(JSON.stringify({
      event: 'cash_closing_review_failed',
      closingId: id,
      message: error instanceof Error ? error.message : 'Unknown error',
    }))
    return NextResponse.json({ error: 'Cash closing could not be updated' }, { status: 500 })
  }
}
