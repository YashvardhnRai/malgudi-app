import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { authorizeApi } from '@/lib/auth-server'
import { enforceRateLimit, requireSameOrigin } from '@/lib/api-security'
import { writeAuditEvent } from '@/lib/audit'
import { getCeoEmails } from '@/lib/auth'
import { deliverOperationalEmails } from '@/lib/notification-delivery'
import {
  decodeChecklistNotes,
  encodeChecklistNotes,
  getIstDateRange,
  getSlotByKey,
} from '@/lib/operations'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { PHOTO_CATEGORIES } from '@/lib/validation'
import type { PhotoUpload } from '@/lib/types'

const MAX_PHOTO_BYTES = 8 * 1024 * 1024
const MAX_PHOTOS = 5
const AI_MEDIA_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
])

const ANALYSIS_PROMPT = `You are a food quality inspector for Malgudi, a premium South Indian restaurant chain.
Analyse this food or kitchen photo for quality, hygiene, freshness, stock level, and presentation problems.
Respond ONLY with JSON:
{"status":"APPROVED" or "FLAGGED","notes":"one brief sentence"}`

async function analyseWithClaude(
  imageBase64: string,
  mediaType: string
): Promise<{
  status: 'APPROVED' | 'FLAGGED' | 'PENDING'
  notes: string
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || !AI_MEDIA_TYPES.has(mediaType)) {
    return { status: 'PENDING', notes: 'AI review pending.' }
  }

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 128,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as
                  | 'image/jpeg'
                  | 'image/png'
                  | 'image/gif'
                  | 'image/webp',
                data: imageBase64,
              },
            },
            { type: 'text', text: ANALYSIS_PROMPT },
          ],
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim()) as {
      status?: string
      notes?: string
    }
    return {
      status: parsed.status === 'FLAGGED' ? 'FLAGGED' : 'APPROVED',
      notes: typeof parsed.notes === 'string' ? parsed.notes.slice(0, 500) : '',
    }
  } catch {
    return { status: 'PENDING', notes: 'AI review temporarily unavailable.' }
  }
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const rateError = enforceRateLimit(request, 'photo-upload', 12, 60_000)
  if (rateError) return rateError

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { error: 'Multipart form data is required' },
      { status: 400 }
    )
  }

  const photos = formData.getAll('photos').filter((item): item is File => item instanceof File)
  const category = String(formData.get('category') ?? '') as PhotoUpload['category']
  const caption = String(formData.get('caption') ?? '').trim().slice(0, 500)
  const outletId = String(formData.get('outlet_id') ?? '')
  const slotKey = String(formData.get('slot_key') ?? '') || null

  const access = await authorizeApi({
    roles: ['CEO', 'MANAGER', 'STAFF'],
    outletId,
  })
  if (access.response) return access.response
  const actor = access.actor!

  if (!outletId) {
    return NextResponse.json({ error: 'Outlet is required' }, { status: 400 })
  }
  if (!PHOTO_CATEGORIES.has(category)) {
    return NextResponse.json({ error: 'Invalid photo category' }, { status: 400 })
  }
  if (!photos.length || photos.length > MAX_PHOTOS) {
    return NextResponse.json(
      { error: `Select between 1 and ${MAX_PHOTOS} photos` },
      { status: 400 }
    )
  }
  for (const photo of photos) {
    if (!photo.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image uploads are allowed' }, { status: 400 })
    }
    if (photo.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: 'Each photo must be under 8 MB' }, { status: 413 })
    }
  }

  const slot = slotKey ? getSlotByKey(slotKey) : null
  if (slotKey && !slot) {
    return NextResponse.json({ error: 'Invalid schedule slot' }, { status: 400 })
  }
  if (slot && slot.category !== category) {
    return NextResponse.json(
      { error: `This slot requires the ${slot.category} category` },
      { status: 400 }
    )
  }
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Operations database unavailable' }, { status: 503 })
  }

  const supabase = getSupabaseServerClient()
  const uploads: Array<{
    id: string
    url: string
    aiStatus: 'APPROVED' | 'FLAGGED' | 'PENDING'
    aiNotes: string
  }> = []

  try {
    for (const photo of photos) {
      const buffer = Buffer.from(await photo.arrayBuffer())
      const mediaType = photo.type || 'image/jpeg'
      const aiResult = await analyseWithClaude(buffer.toString('base64'), mediaType)
      const safeName = photo.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-120)
      const fileName = `${outletId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`

      const { data: storageData, error: storageError } = await supabase.storage
        .from('photos')
        .upload(fileName, buffer, {
          contentType: mediaType,
          upsert: false,
        })
      if (storageError) throw storageError

      const { data: publicData } = supabase.storage
        .from('photos')
        .getPublicUrl(storageData.path)

      const { data: record, error: insertError } = await supabase
        .from('photo_uploads')
        .insert({
          outlet_id: outletId,
          submitted_by: actor.profileId,
          category,
          photo_url: publicData.publicUrl,
          caption: caption || (slot ? `${slot.label} [${slot.key}]` : null),
          ai_status: aiResult.status,
          ai_notes: aiResult.notes,
        })
        .select()
        .single()

      if (insertError) {
        await supabase.storage.from('photos').remove([storageData.path])
        throw insertError
      }

      if (aiResult.status === 'FLAGGED') {
        await supabase.from('alerts').insert({
          outlet_id: outletId,
          alert_type: 'PHOTO_FLAGGED',
          message: `AI flagged a ${category} photo: ${aiResult.notes}`,
          severity: 'HIGH',
          is_read: false,
        })
      }

      uploads.push({
        id: record.id,
        url: publicData.publicUrl,
        aiStatus: aiResult.status,
        aiNotes: aiResult.notes,
      })
    }

    if (slot) {
      const { start, end } = getIstDateRange()
      const { data: existingSubmissions, error: existingError } = await supabase
        .from('checklist_submissions')
        .select('id, notes')
        .eq('outlet_id', outletId)
        .eq('checklist_type', slot.checklistType)
        .gte('created_at', start)
        .lte('created_at', end)

      if (existingError) throw existingError
      const alreadySubmitted = (existingSubmissions ?? []).some(
        (submission) => decodeChecklistNotes(submission.notes).slotKey === slot.key
      )

      if (!alreadySubmitted) {
        const { error: checklistError } = await supabase
          .from('checklist_submissions')
          .insert({
            outlet_id: outletId,
            submitted_by: actor.profileId,
            checklist_type: slot.checklistType,
            submission_time: new Date().toISOString(),
            status: 'SUBMITTED',
            notes: encodeChecklistNotes(slot.key, caption),
          })
        if (checklistError) throw checklistError
      }
    }

    const { data: outlet } = await supabase
      .from('outlets')
      .select('name, manager_phone')
      .eq('id', outletId)
      .maybeSingle<{ name: string; manager_phone: string | null }>()

    const notifications = getCeoEmails().map((email) => ({
      recipient_email: email,
      recipient_role: 'CEO',
      type: 'PHOTO_UPLOADED',
      title: 'Photo proof uploaded',
      message: `${actor.name} uploaded ${uploads.length} photo${
        uploads.length === 1 ? '' : 's'
      } for ${outlet?.name || 'an outlet'}${slot ? ` - ${slot.label}` : ''}.`,
      outlet_id: outletId,
      manager_phone: outlet?.manager_phone ?? null,
      is_read: false,
    }))

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert(notifications)
    if (notificationError) throw notificationError
    await deliverOperationalEmails(notifications)

    await writeAuditEvent({
      actor,
      action: 'PHOTO_UPLOADED',
      outletId,
      target: uploads.map((upload) => upload.id).join(','),
      detail: {
        category,
        slot_key: slot?.key ?? null,
        photo_count: uploads.length,
      },
    })

    const first = uploads[0]
    return NextResponse.json({
      ...first,
      uploads,
    })
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'photo_upload_failed',
        outletId,
        actor: actor.email,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    )
    return NextResponse.json({ error: 'Upload could not be saved' }, { status: 500 })
  }
}
