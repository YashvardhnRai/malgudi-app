import { NextRequest, NextResponse } from 'next/server'
import { getCeoEmails } from '@/lib/auth'
import { enforceRateLimit, requireSameOrigin } from '@/lib/api-security'
import { writeAuditEvent } from '@/lib/audit'
import { authorizeApi } from '@/lib/auth-server'
import {
  COUNTER_ROUND_ITEMS,
  counterRoundMinutes,
  getCounterRoundSlot,
  getCounterRoundWindow,
  isCounterRoundLate,
  type CounterRoundItemKey,
} from '@/lib/counter-rounds'
import { deliverOperationalEmails } from '@/lib/notification-delivery'
import { getIstParts } from '@/lib/operations'
import { signPhotoRows } from '@/lib/photo-urls'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { cleanText, isIsoDate, isUuid } from '@/lib/validation'

const MAX_PHOTO_BYTES = 8 * 1024 * 1024
const MAX_REQUEST_PHOTO_BYTES = 4 * 1024 * 1024

type ReadingInput = {
  item_key?: unknown
  temperature_c?: unknown
}

type StoredProof = {
  itemKey: CounterRoundItemKey
  temperatureC: number | null
  path: string
  signedUrl: string
}

function isMissingTableError(error: { code?: string }) {
  return error.code === '42P01' || error.code === 'PGRST205'
}

function pendingMigrationResponse() {
  return NextResponse.json(
    { error: 'Counter rounds are waiting for the latest database migration' },
    { status: 503 }
  )
}

function parseReadings(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') return null
  try {
    const parsed = JSON.parse(value) as ReadingInput[]
    if (!Array.isArray(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

function parseTemperature(value: unknown) {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  const temperature = Number(value)
  if (!Number.isFinite(temperature) || temperature < -20 || temperature > 120) {
    return null
  }
  return Math.round(temperature * 10) / 10
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
  if (!outletId) {
    return NextResponse.json({ error: 'No outlet assigned' }, { status: 403 })
  }
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Restaurant data service is unavailable' }, { status: 503 })
  }

  const supabase = getSupabaseServerClient()
  const { data: rounds, error: roundError } = await supabase
    .from('counter_temperature_rounds')
    .select('*')
    .eq('outlet_id', outletId)
    .eq('round_date', date)
    .order('scheduled_at', { ascending: true })

  if (roundError) {
    if (isMissingTableError(roundError)) return pendingMigrationResponse()
    return NextResponse.json({ error: 'Unable to load counter rounds' }, { status: 503 })
  }

  const roundIds = (rounds ?? []).map((round) => round.id)
  const readings = roundIds.length
    ? await supabase
        .from('counter_temperature_readings')
        .select('*')
        .in('round_id', roundIds)
        .order('created_at', { ascending: true })
    : { data: [], error: null }

  if (readings.error) {
    if (isMissingTableError(readings.error)) return pendingMigrationResponse()
    return NextResponse.json({ error: 'Unable to load counter readings' }, { status: 503 })
  }

  const signedReadings = await signPhotoRows(readings.data ?? [])
  return NextResponse.json({
    rounds: (rounds ?? []).map((round) => ({
      ...round,
      readings: signedReadings.filter((reading) => reading.round_id === round.id),
    })),
  })
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const rateError = enforceRateLimit(request, 'counter-round:create', 12, 60_000)
  if (rateError) return rateError

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Multipart form data is required' }, { status: 400 })
  }

  const outletId = String(formData.get('outlet_id') ?? '')
  const slotKey = String(formData.get('slot_key') ?? '')
  const note = cleanText(formData.get('note'), 300)
  const slot = getCounterRoundSlot(slotKey)
  const readingInputs = parseReadings(formData.get('readings'))

  if (!isUuid(outletId) || !slot || !readingInputs) {
    return NextResponse.json({ error: 'Valid outlet, round, and readings are required' }, { status: 400 })
  }

  const { actor, response } = await authorizeApi({
    roles: ['CEO', 'MANAGER', 'STAFF'],
    outletId,
  })
  if (response || !actor) return response
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Restaurant data service is unavailable' }, { status: 503 })
  }

  const now = new Date()
  const ist = getIstParts(now)
  const nowMinutes = ist.hour * 60 + ist.minute
  if (nowMinutes < counterRoundMinutes(slot)) {
    return NextResponse.json(
      { error: `${slot.label} has not started yet` },
      { status: 400 }
    )
  }

  const inputByKey = new Map(
    readingInputs.map((reading) => [String(reading.item_key), reading])
  )
  const proofs: Array<{
    itemKey: CounterRoundItemKey
    temperatureC: number | null
    file: File
  }> = []

  for (const item of COUNTER_ROUND_ITEMS) {
    const input = inputByKey.get(item.key)
    const file = formData.get(`photo_${item.key}`)
    const temperatureC = item.temperatureRequired
      ? parseTemperature(input?.temperature_c)
      : null

    if (!(file instanceof File) || !file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: `${item.label} photo is required` },
        { status: 400 }
      )
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return NextResponse.json(
        { error: `${item.label} photo must be under 8 MB` },
        { status: 413 }
      )
    }
    if (item.temperatureRequired && temperatureC === null) {
      return NextResponse.json(
        { error: `${item.label} temperature is required in Celsius` },
        { status: 400 }
      )
    }

    proofs.push({ itemKey: item.key, temperatureC, file })
  }

  const totalPhotoBytes = proofs.reduce((total, proof) => total + proof.file.size, 0)
  if (totalPhotoBytes > MAX_REQUEST_PHOTO_BYTES) {
    return NextResponse.json(
      { error: 'The five photos are too large. Retake them with the phone camera.' },
      { status: 413 }
    )
  }

  const supabase = getSupabaseServerClient()
  const { data: existing, error: existingError } = await supabase
    .from('counter_temperature_rounds')
    .select('id')
    .eq('outlet_id', outletId)
    .eq('round_date', ist.date)
    .eq('slot_key', slot.key)
    .maybeSingle()

  if (existingError) {
    if (isMissingTableError(existingError)) return pendingMigrationResponse()
    return NextResponse.json({ error: 'Unable to verify this round' }, { status: 503 })
  }
  if (existing) {
    return NextResponse.json({ error: `${slot.label} is already submitted` }, { status: 409 })
  }

  const stored: StoredProof[] = []
  const photoUploadIds: string[] = []
  let roundId: string | null = null

  try {
    for (const proof of proofs) {
      const safeName = proof.file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-100)
      const path = `${outletId}/counter-rounds/${ist.date}/${slot.key}/${proof.itemKey}-${crypto.randomUUID()}-${safeName}`
      const buffer = Buffer.from(await proof.file.arrayBuffer())
      const { data, error } = await supabase.storage.from('photos').upload(path, buffer, {
        contentType: proof.file.type || 'image/jpeg',
        upsert: false,
      })
      if (error) throw error
      const { data: signedData, error: signedError } = await supabase.storage
        .from('photos')
        .createSignedUrl(data.path, 6 * 60 * 60)
      if (signedError) throw signedError
      stored.push({
        itemKey: proof.itemKey,
        temperatureC: proof.temperatureC,
        path: data.path,
        signedUrl: signedData.signedUrl,
      })
    }

    const scheduledAt = getCounterRoundWindow(slot, now).start
    const { data: round, error: roundError } = await supabase
      .from('counter_temperature_rounds')
      .insert({
        outlet_id: outletId,
        submitted_by: actor.profileId,
        submitted_by_email: actor.email,
        round_date: ist.date,
        slot_key: slot.key,
        scheduled_at: scheduledAt,
        submitted_at: now.toISOString(),
        status: isCounterRoundLate(slot, now) ? 'LATE' : 'SUBMITTED',
        note: note || null,
      })
      .select()
      .single()
    if (roundError) throw roundError
    roundId = round.id

    const photoRows = stored.map((proof) => {
      const item = COUNTER_ROUND_ITEMS.find((candidate) => candidate.key === proof.itemKey)!
      const temperature = proof.temperatureC === null ? '' : ` - ${proof.temperatureC} C`
      return {
        outlet_id: outletId,
        submitted_by: actor.profileId,
        category: 'BANMARIE',
        photo_url: proof.path,
        caption: `${slot.label}: ${item.label}${temperature}`,
        ai_status: 'PENDING',
        ai_notes: 'Counter temperature round proof.',
      }
    })
    const { data: photoRowsData, error: photoError } = await supabase
      .from('photo_uploads')
      .insert(photoRows)
      .select('id')
    if (photoError) throw photoError
    photoUploadIds.push(...(photoRowsData ?? []).map((photo) => photo.id))

    const readingRows = stored.map((proof, index) => ({
      round_id: round.id,
      item_key: proof.itemKey,
      temperature_c: proof.temperatureC,
      photo_upload_id: photoRowsData?.[index]?.id ?? null,
      photo_url: proof.path,
    }))
    const { data: readings, error: readingError } = await supabase
      .from('counter_temperature_readings')
      .insert(readingRows)
      .select()
    if (readingError) throw readingError

    const { data: outlet } = await supabase
      .from('outlets')
      .select('name, manager_phone')
      .eq('id', outletId)
      .maybeSingle<{ name: string; manager_phone: string | null }>()
    const temperatureSummary = stored
      .filter((proof) => proof.temperatureC !== null)
      .map((proof) => {
        const item = COUNTER_ROUND_ITEMS.find((candidate) => candidate.key === proof.itemKey)!
        return `${item.shortLabel} ${proof.temperatureC} C`
      })
      .join(', ')
    const notifications = getCeoEmails().map((email) => ({
      recipient_email: email,
      recipient_role: 'CEO',
      type: 'COUNTER_ROUND_SUBMITTED',
      title: 'Counter round submitted',
      message: `${actor.name} completed ${slot.label} at ${outlet?.name ?? 'the outlet'}. ${temperatureSummary}.`,
      outlet_id: outletId,
      manager_phone: outlet?.manager_phone ?? null,
      is_read: false,
    }))
    await Promise.all([
      supabase.from('notifications').insert(notifications),
      deliverOperationalEmails(notifications),
      writeAuditEvent({
        actor,
        action: 'COUNTER_ROUND_SUBMITTED',
        outletId,
        target: round.id,
        detail: {
          slot_key: slot.key,
          status: round.status,
          temperatures: Object.fromEntries(
            stored.map((proof) => [proof.itemKey, proof.temperatureC])
          ),
        },
      }),
    ])

    return NextResponse.json({ round: { ...round, readings } }, { status: 201 })
  } catch (error) {
    if (roundId) {
      await supabase.from('counter_temperature_rounds').delete().eq('id', roundId)
    }
    if (photoUploadIds.length) {
      await supabase.from('photo_uploads').delete().in('id', photoUploadIds)
    }
    if (stored.length) {
      await supabase.storage.from('photos').remove(stored.map((proof) => proof.path))
    }
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'counter_round_failed',
        outletId,
        slot: slot.key,
        actor: actor.email,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    )
    return NextResponse.json({ error: 'Counter round could not be saved' }, { status: 500 })
  }
}
