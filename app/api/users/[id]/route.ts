import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit, readJsonBody, requireSameOrigin } from '@/lib/api-security'
import { writeAuditEvent } from '@/lib/audit'
import { authorizeApi } from '@/lib/auth-server'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { cleanText, isUuid } from '@/lib/validation'

type UpdateUserBody = {
  name?: unknown
  phone?: unknown
  role?: unknown
  outlet_id?: unknown
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const rateError = enforceRateLimit(request, 'users:update', 20, 60_000)
  if (rateError) return rateError

  const { actor, response } = await authorizeApi({ roles: ['CEO'] })
  if (response || !actor) return response
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Invalid user id' }, { status: 400 })

  const parsed = await readJsonBody<UpdateUserBody>(request)
  if (parsed.response || !parsed.data) return parsed.response
  const name = cleanText(parsed.data.name, 100)
  const phone = cleanText(parsed.data.phone, 30)
  const role =
    parsed.data.role === 'MANAGER' || parsed.data.role === 'STAFF'
      ? parsed.data.role
      : null
  const outletId = parsed.data.outlet_id

  if (!name || !role || !isUuid(outletId)) {
    return NextResponse.json({ error: 'Valid name, role, and outlet are required' }, { status: 400 })
  }
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Restaurant data service is unavailable' }, { status: 503 })
  }

  const { data, error } = await getSupabaseServerClient()
    .from('users')
    .update({ name, phone: phone || null, role, outlet_id: outletId })
    .eq('id', id)
    .neq('role', 'CEO')
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Unable to update user' }, { status: 400 })
  if (!data) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  await writeAuditEvent({
    actor,
    action: 'USER_UPDATED',
    outletId,
    target: id,
    detail: { role },
  })
  return NextResponse.json({ user: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const rateError = enforceRateLimit(request, 'users:delete', 10, 60_000)
  if (rateError) return rateError

  const { actor, response } = await authorizeApi({ roles: ['CEO'] })
  if (response || !actor) return response
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Invalid user id' }, { status: 400 })
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Restaurant data service is unavailable' }, { status: 503 })
  }

  const supabase = getSupabaseServerClient()
  const { data: existing } = await supabase
    .from('users')
    .select('id, email, outlet_id, role')
    .eq('id', id)
    .neq('role', 'CEO')
    .maybeSingle<{ id: string; email: string; outlet_id: string | null; role: string }>()
  if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { error } = await supabase.from('users').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'Unable to remove user' }, { status: 400 })

  const { data: authUsers } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const authUser = authUsers?.users.find(
    (candidate) => candidate.email?.toLowerCase() === existing.email.toLowerCase()
  )
  if (authUser) await supabase.auth.admin.deleteUser(authUser.id)

  await writeAuditEvent({
    actor,
    action: 'USER_DELETED',
    outletId: existing.outlet_id,
    target: id,
    detail: { email: existing.email, role: existing.role },
  })
  return NextResponse.json({ ok: true })
}
