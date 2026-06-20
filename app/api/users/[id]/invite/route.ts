import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit, requireSameOrigin } from '@/lib/api-security'
import { writeAuditEvent } from '@/lib/audit'
import { authorizeApi } from '@/lib/auth-server'
import { getPublicSiteUrl } from '@/lib/site-url'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { isUuid } from '@/lib/validation'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const rateError = enforceRateLimit(request, 'users:invite', 10, 60_000)
  if (rateError) return rateError

  const { actor, response } = await authorizeApi({ roles: ['CEO'] })
  if (response || !actor) return response
  const { id } = await params
  if (!isUuid(id)) return NextResponse.json({ error: 'Invalid user id' }, { status: 400 })
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Restaurant data service is unavailable' }, { status: 503 })
  }

  const supabase = getSupabaseServerClient()
  const { data: user } = await supabase
    .from('users')
    .select('id, email, name, role, outlet_id')
    .eq('id', id)
    .neq('role', 'CEO')
    .maybeSingle<{
      id: string
      email: string
      name: string
      role: string
      outlet_id: string | null
    }>()
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { error } = await supabase.auth.admin.inviteUserByEmail(user.email, {
    redirectTo: `${getPublicSiteUrl(request)}/auth/callback`,
    data: { name: user.name, role: user.role, outlet_id: user.outlet_id },
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await writeAuditEvent({
    actor,
    action: 'INVITE_RESENT',
    outletId: user.outlet_id,
    target: id,
    detail: { email: user.email },
  })
  return NextResponse.json({ ok: true })
}
