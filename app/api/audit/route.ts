import { NextResponse } from 'next/server'
import { authorizeApi } from '@/lib/auth-server'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'

type AuditPayload = {
  actor_email?: string
  actor_role?: string
  action?: string
  target?: string | null
  detail?: Record<string, unknown>
}

export async function GET() {
  const { actor, response } = await authorizeApi({ roles: ['CEO'] })
  if (response || !actor) return response
  if (!isSupabaseConfigured) return NextResponse.json({ events: [] })

  const { data, error } = await getSupabaseServerClient()
    .from('notifications')
    .select('id, title, message, outlet_id, created_at')
    .eq('recipient_email', 'audit@malgudi.internal')
    .eq('type', 'AUDIT')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: 'Unable to load audit history', events: [] }, { status: 503 })
  }

  const events = (data ?? []).map((row) => {
    let payload: AuditPayload = {}
    try {
      payload = JSON.parse(row.message) as AuditPayload
    } catch {}
    return {
      id: row.id,
      action: payload.action || row.title,
      actor_email: payload.actor_email || 'system',
      actor_role: payload.actor_role || 'SYSTEM',
      target: payload.target ?? null,
      detail: payload.detail ?? {},
      outlet_id: row.outlet_id,
      created_at: row.created_at,
    }
  })

  return NextResponse.json({ events })
}
