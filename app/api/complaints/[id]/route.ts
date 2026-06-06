import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit, readJsonBody, requireSameOrigin } from '@/lib/api-security'
import { writeAuditEvent } from '@/lib/audit'
import { authorizeApi } from '@/lib/auth-server'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { isUuid } from '@/lib/validation'

const STATUSES = new Set(['OPEN', 'IN_PROGRESS', 'RESOLVED'])

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const rateError = enforceRateLimit(request, 'complaints:update', 30, 60_000)
  if (rateError) return rateError

  const { id } = await params
  if (!isUuid(id)) {
    return NextResponse.json({ error: 'Invalid complaint id' }, { status: 400 })
  }

  const parsed = await readJsonBody<{ status?: unknown }>(request)
  if (parsed.response || !parsed.data) return parsed.response
  const status =
    typeof parsed.data.status === 'string' ? parsed.data.status.toUpperCase() : ''
  if (!STATUSES.has(status)) {
    return NextResponse.json({ error: 'Invalid complaint status' }, { status: 400 })
  }

  const { actor, response } = await authorizeApi({
    roles: ['CEO', 'MANAGER'],
  })
  if (response || !actor) return response
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Restaurant data service is unavailable' }, { status: 503 })
  }

  const supabase = getSupabaseServerClient()
  const { data: existing, error: lookupError } = await supabase
    .from('complaints')
    .select('id, outlet_id')
    .eq('id', id)
    .maybeSingle<{ id: string; outlet_id: string }>()

  if (lookupError) {
    return NextResponse.json({ error: 'Unable to load complaint' }, { status: 503 })
  }
  if (!existing) return NextResponse.json({ error: 'Complaint not found' }, { status: 404 })
  if (actor.role !== 'CEO' && actor.outletId !== existing.outlet_id) {
    return NextResponse.json({ error: 'Outlet access denied' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('complaints')
    .update({
      status,
      resolved_at: status === 'RESOLVED' ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Unable to update complaint' }, { status: 400 })
  }

  await writeAuditEvent({
    actor,
    action: 'COMPLAINT_UPDATED',
    outletId: existing.outlet_id,
    target: id,
    detail: { status },
  })

  return NextResponse.json(data)
}
