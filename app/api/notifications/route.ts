import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit, readJsonBody, requireSameOrigin } from '@/lib/api-security'
import { authorizeApi } from '@/lib/auth-server'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { cleanText, isEmail, isUuid } from '@/lib/validation'

type NotificationBody = {
  recipient_email?: unknown
  recipient_role?: unknown
  type?: unknown
  title?: unknown
  message?: unknown
  outlet_id?: unknown
  manager_phone?: unknown
}

export async function GET() {
  const { actor, response } = await authorizeApi({
    roles: ['CEO', 'MANAGER', 'STAFF'],
  })
  if (response || !actor) return response
  if (!isSupabaseConfigured) return NextResponse.json([])

  const { data, error } = await getSupabaseServerClient()
    .from('notifications')
    .select('id, type, title, message, outlet_id, manager_phone, is_read, created_at')
    .eq('recipient_email', actor.email)
    .neq('type', 'AUDIT')
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) {
    return NextResponse.json({ error: 'Unable to load notifications' }, { status: 503 })
  }
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const rateError = enforceRateLimit(request, 'notifications:create', 20, 60_000)
  if (rateError) return rateError

  const { actor, response } = await authorizeApi({ roles: ['CEO'] })
  if (response || !actor) return response

  const parsed = await readJsonBody<NotificationBody>(request)
  if (parsed.response || !parsed.data) return parsed.response
  const body = parsed.data
  const recipientEmail =
    typeof body.recipient_email === 'string' ? body.recipient_email.trim().toLowerCase() : ''
  const outletId = body.outlet_id
  const type = cleanText(body.type, 60).toUpperCase()
  const title = cleanText(body.title, 120)
  const message = cleanText(body.message, 500)

  if (
    !isEmail(recipientEmail) ||
    !type ||
    !title ||
    !message ||
    (outletId !== null && outletId !== undefined && !isUuid(outletId))
  ) {
    return NextResponse.json({ error: 'Valid notification details are required' }, { status: 400 })
  }
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Restaurant data service is unavailable' }, { status: 503 })
  }

  const { data, error } = await getSupabaseServerClient()
    .from('notifications')
    .insert({
      recipient_email: recipientEmail,
      recipient_role: cleanText(body.recipient_role, 20).toUpperCase() || 'STAFF',
      type,
      title,
      message,
      outlet_id: outletId ?? null,
      manager_phone: cleanText(body.manager_phone, 30) || null,
      is_read: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Unable to create notification' }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const rateError = enforceRateLimit(request, 'notifications:read', 30, 60_000)
  if (rateError) return rateError

  const { actor, response } = await authorizeApi({
    roles: ['CEO', 'MANAGER', 'STAFF'],
  })
  if (response || !actor) return response

  const parsed = await readJsonBody<{ ids?: unknown }>(request)
  if (parsed.response || !parsed.data) return parsed.response
  const ids = Array.isArray(parsed.data.ids)
    ? parsed.data.ids.filter(isUuid).slice(0, 30)
    : []
  if (!ids.length) {
    return NextResponse.json({ error: 'Notification ids are required' }, { status: 400 })
  }
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true })

  const { error } = await getSupabaseServerClient()
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_email', actor.email)
    .in('id', ids)

  if (error) {
    return NextResponse.json({ error: 'Unable to update notifications' }, { status: 503 })
  }
  return NextResponse.json({ ok: true })
}
