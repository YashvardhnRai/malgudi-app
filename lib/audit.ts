import 'server-only'

import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'
import type { AuthActor } from '@/lib/auth-server'

export type AuditAction =
  | 'CHECKLIST_SUBMITTED'
  | 'PHOTO_UPLOADED'
  | 'COMPLAINT_CREATED'
  | 'COMPLAINT_UPDATED'
  | 'SALES_UPDATED'
  | 'ATTENDANCE_UPDATED'
  | 'INVENTORY_LOGGED'
  | 'COUNTER_ROUND_SUBMITTED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'INVITE_RESENT'

export async function writeAuditEvent({
  actor,
  action,
  outletId,
  target,
  detail,
}: {
  actor: AuthActor
  action: AuditAction
  outletId?: string | null
  target?: string | null
  detail?: Record<string, unknown>
}) {
  if (!isSupabaseConfigured) return

  const payload = {
    actor_email: actor.email,
    actor_role: actor.role,
    action,
    target: target ?? null,
    detail: detail ?? {},
  }

  const { error } = await getSupabaseServerClient().from('notifications').insert({
    recipient_email: 'audit@malgudi.internal',
    recipient_role: 'SYSTEM',
    type: 'AUDIT',
    title: action,
    message: JSON.stringify(payload),
    outlet_id: outletId ?? null,
    manager_phone: null,
    is_read: true,
  })

  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'audit_write_failed',
        action,
        message: error.message,
      })
    )
  }
}
