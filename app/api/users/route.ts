import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit, readJsonBody, requireSameOrigin } from '@/lib/api-security'
import { writeAuditEvent } from '@/lib/audit'
import { authorizeApi } from '@/lib/auth-server'
import { getPublicSiteUrl } from '@/lib/site-url'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { cleanText, isEmail, isUuid } from '@/lib/validation'

type CreateUserBody = {
  name?: unknown
  email?: unknown
  phone?: unknown
  role?: unknown
  outlet_id?: unknown
}

function getRedirectTo(request: NextRequest) {
  return `${getPublicSiteUrl(request)}/auth/callback`
}

export async function GET() {
  const { actor, response } = await authorizeApi({ roles: ['CEO'] })
  if (response || !actor) return response
  if (!isSupabaseConfigured) return NextResponse.json({ users: [] })

  const { data, error } = await getSupabaseServerClient()
    .from('users')
    .select('*')
    .neq('role', 'CEO')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Unable to load users', users: [] }, { status: 503 })
  }
  return NextResponse.json({ users: data ?? [] })
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const rateError = enforceRateLimit(request, 'users:create', 10, 60_000)
  if (rateError) return rateError

  const { actor, response } = await authorizeApi({ roles: ['CEO'] })
  if (response || !actor) return response

  const parsed = await readJsonBody<CreateUserBody>(request)
  if (parsed.response || !parsed.data) return parsed.response
  const body = parsed.data
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const name = cleanText(body.name, 100)
  const phone = cleanText(body.phone, 30)
  const role = body.role === 'MANAGER' || body.role === 'STAFF' ? body.role : null
  const outletId = body.outlet_id

  if (!name || !isEmail(email) || !role || !isUuid(outletId)) {
    return NextResponse.json(
      { error: 'Valid name, email, role, and outlet are required' },
      { status: 400 }
    )
  }
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Restaurant data service is unavailable' }, { status: 503 })
  }

  const supabase = getSupabaseServerClient()
  const { data: outlet } = await supabase
    .from('outlets')
    .select('id')
    .eq('id', outletId)
    .eq('is_active', true)
    .maybeSingle()
  if (!outlet) {
    return NextResponse.json({ error: 'Active outlet not found' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('users')
    .insert({
      name,
      email,
      phone: phone || null,
      role,
      outlet_id: outletId,
    })
    .select()
    .single()

  if (error) {
    const duplicate = error.code === '23505'
    return NextResponse.json(
      { error: duplicate ? 'A user with this email already exists' : 'Unable to add user' },
      { status: duplicate ? 409 : 400 }
    )
  }

  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: getRedirectTo(request),
    data: { name, role, outlet_id: outletId },
  })

  await writeAuditEvent({
    actor,
    action: 'USER_CREATED',
    outletId,
    target: data.id,
    detail: { email, role, invite_sent: !inviteError },
  })

  return NextResponse.json(
    { user: data, inviteWarning: inviteError?.message ?? null },
    { status: 201 }
  )
}
