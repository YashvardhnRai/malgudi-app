import { NextRequest, NextResponse } from 'next/server'
import { getCeoEmails } from '@/lib/auth'
import { getAuthActor } from '@/lib/auth-server'
import { verifyReminderWorkflowToken } from '@/lib/github-oidc'
import { deliverOperationalEmails } from '@/lib/notification-delivery'
import {
  decodeChecklistNotes,
  getIstDateRange,
  getIstParts,
  getSlotWindow,
  OPERATIONS_SLOTS,
} from '@/lib/operations'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'

type OutletRow = {
  id: string
  name: string
  manager_phone: string | null
}

async function hasSchedulerAccess(request: NextRequest) {
  const authorization = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && authorization === `Bearer ${secret}`) return true

  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : ''
  return token ? verifyReminderWorkflowToken(token) : false
}

export async function GET(request: NextRequest) {
  if (!(await hasSchedulerAccess(request))) {
    const actor = await getAuthActor()
    if (actor?.role !== 'CEO') {
      return NextResponse.json({ error: 'Scheduler or CEO access required' }, { status: 401 })
    }
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Restaurant data service is unavailable' }, { status: 503 })
  }

  const now = new Date()
  const ist = getIstParts(now)
  const nowMinutes = ist.hour * 60 + ist.minute
  const dueSlots = OPERATIONS_SLOTS.filter(
    (slot) => nowMinutes >= slot.hour * 60 + 30
  )
  if (!dueSlots.length) {
    return NextResponse.json({ date: ist.date, checked: 0, reminders: 0 })
  }

  const supabase = getSupabaseServerClient()
  const { data: outlets, error: outletError } = await supabase
    .from('outlets')
    .select('id, name, manager_phone')
    .eq('is_active', true)

  if (outletError) {
    return NextResponse.json({ error: 'Unable to load outlets' }, { status: 503 })
  }

  const { start, end } = getIstDateRange(now)
  const results: Array<{ outlet: string; slot: string; status: 'done' | 'reminded' | 'already-reminded' }> = []
  let reminders = 0

  for (const outlet of (outlets ?? []) as OutletRow[]) {
    const { data: manager } = await supabase
      .from('users')
      .select('email')
      .eq('outlet_id', outlet.id)
      .eq('role', 'MANAGER')
      .maybeSingle<{ email: string }>()

    for (const slot of dueSlots) {
      const { data: submissions } = await supabase
        .from('checklist_submissions')
        .select('notes')
        .eq('outlet_id', outlet.id)
        .eq('checklist_type', slot.checklistType)
        .gte('created_at', start)
        .lte('created_at', end)

      const submitted = (submissions ?? []).some(
        (submission) => decodeChecklistNotes(submission.notes).slotKey === slot.key
      )

      let hasProof = submitted
      if (!hasProof) {
        const window = getSlotWindow(slot, now)
        const { count } = await supabase
          .from('photo_uploads')
          .select('id', { count: 'exact', head: true })
          .eq('outlet_id', outlet.id)
          .eq('category', slot.category)
          .gte('created_at', window.start)
          .lt('created_at', window.end)
        hasProof = (count ?? 0) > 0
      }

      if (hasProof) {
        results.push({ outlet: outlet.name, slot: slot.key, status: 'done' })
        continue
      }

      const marker = `[slot:${slot.key}][date:${ist.date}]`
      const { count: priorCount } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'PHOTO_MISSED')
        .eq('outlet_id', outlet.id)
        .gte('created_at', start)
        .ilike('message', `%${marker}%`)

      if ((priorCount ?? 0) > 0) {
        results.push({ outlet: outlet.name, slot: slot.key, status: 'already-reminded' })
        continue
      }

      const message = `${slot.label} proof is overdue at ${outlet.name}. ${marker}`
      const notifications = getCeoEmails().map((email) => ({
        recipient_email: email,
        recipient_role: 'CEO',
        type: 'PHOTO_MISSED',
        title: 'Scheduled proof missed',
        message,
        outlet_id: outlet.id,
        manager_phone: outlet.manager_phone,
        is_read: false,
      }))

      if (manager?.email) {
        notifications.push({
          recipient_email: manager.email,
          recipient_role: 'MANAGER',
          type: 'UPLOAD_REMINDER',
          title: 'Photo proof overdue',
          message: `${slot.label} is overdue. Open your shift board and upload proof now. ${marker}`,
          outlet_id: outlet.id,
          manager_phone: outlet.manager_phone,
          is_read: false,
        })
      }

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications)
      if (notificationError) {
        console.error(JSON.stringify({
          event: 'reminder_insert_failed',
          outletId: outlet.id,
          slot: slot.key,
          message: notificationError.message,
        }))
        continue
      }

      await supabase.from('alerts').insert({
        outlet_id: outlet.id,
        alert_type: 'PHOTO_MISSED',
        message,
        severity: 'MEDIUM',
        is_read: false,
      })
      await deliverOperationalEmails(notifications)
      reminders += notifications.length
      results.push({ outlet: outlet.name, slot: slot.key, status: 'reminded' })
    }
  }

  return NextResponse.json({
    date: ist.date,
    checked: results.length,
    reminders,
    results,
  })
}
