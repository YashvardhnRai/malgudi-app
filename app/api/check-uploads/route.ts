import { NextRequest, NextResponse } from 'next/server'
import { getCeoEmails } from '@/lib/auth'
import { getAuthActor } from '@/lib/auth-server'
import { verifyReminderWorkflowToken } from '@/lib/github-oidc'
import {
  COUNTER_ROUND_SLOTS,
  counterRoundMinutes,
} from '@/lib/counter-rounds'
import {
  deliverOperationalEmails,
  deliverOperationalPhoneAlerts,
} from '@/lib/notification-delivery'
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

type CeoContact = {
  email: string
  phone: string | null
}

function withoutDeliveryPhone<T extends { recipient_phone?: string | null }>(
  notifications: T[]
) {
  return notifications.map((notification) => {
    const copy = { ...notification }
    delete copy.recipient_phone
    return copy
  })
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
  const dueCounterSlots = COUNTER_ROUND_SLOTS.filter(
    (slot) => nowMinutes >= counterRoundMinutes(slot) + 30
  )
  if (!dueSlots.length && !dueCounterSlots.length) {
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
  const results: Array<{
    outlet: string
    slot: string
    status: 'done' | 'reminded' | 'already-reminded' | 'escalated'
  }> = []
  let reminders = 0
  const ceoEmails = getCeoEmails()
  const { data: ceoContacts } = await supabase
    .from('users')
    .select('email, phone')
    .in('email', ceoEmails)
    .returns<CeoContact[]>()

  for (const outlet of (outlets ?? []) as OutletRow[]) {
    const { data: manager } = await supabase
      .from('users')
      .select('email, phone')
      .eq('outlet_id', outlet.id)
      .eq('role', 'MANAGER')
      .maybeSingle<{ email: string; phone: string | null }>()

    let missingOverdueCount = 0
    let missingCounterCount = 0

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

      missingOverdueCount += 1
      const marker = `[slot:${slot.key}][date:${ist.date}]`
      const escalationMarker = `${marker}[escalation]`
      const { count: priorCount } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'PHOTO_MISSED')
        .eq('outlet_id', outlet.id)
        .gte('created_at', start)
        .ilike('message', `%${marker}%`)

      let resultStatus: 'reminded' | 'already-reminded' | 'escalated' =
        (priorCount ?? 0) > 0 ? 'already-reminded' : 'reminded'

      const message = `${slot.label} proof is overdue at ${outlet.name}. ${marker}`
      const notifications = ceoEmails.map((email) => ({
        recipient_email: email,
        recipient_phone:
          ceoContacts?.find((contact) => contact.email.toLowerCase() === email)?.phone ??
          null,
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
          recipient_phone: manager.phone ?? outlet.manager_phone,
          recipient_role: 'MANAGER',
          type: 'UPLOAD_REMINDER',
          title: 'Photo proof overdue',
          message: `${slot.label} is overdue. Open your shift board and upload proof now. ${marker}`,
          outlet_id: outlet.id,
          manager_phone: outlet.manager_phone,
          is_read: false,
        })
      }

      if ((priorCount ?? 0) === 0) {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(withoutDeliveryPhone(notifications))
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
        await Promise.all([
          deliverOperationalEmails(notifications),
          deliverOperationalPhoneAlerts(notifications),
        ])
        reminders += notifications.length
      }

      const minutesLate = nowMinutes - slot.hour * 60
      const shouldEscalate = minutesLate >= 90 || missingOverdueCount >= 2
      if (shouldEscalate) {
        const { count: priorEscalationCount } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('type', 'PHOTO_ESCALATION')
          .eq('outlet_id', outlet.id)
          .gte('created_at', start)
          .ilike('message', `%${escalationMarker}%`)

        if ((priorEscalationCount ?? 0) === 0) {
          const escalationMessage = `${slot.label} proof is still missing at ${outlet.name}. This is now escalated for owner follow-up. ${escalationMarker}`
          const escalationNotifications = ceoEmails.map((email) => ({
            recipient_email: email,
            recipient_phone:
              ceoContacts?.find((contact) => contact.email.toLowerCase() === email)?.phone ??
              null,
            recipient_role: 'CEO',
            type: 'PHOTO_ESCALATION',
            title: 'Proof escalation',
            message: escalationMessage,
            outlet_id: outlet.id,
            manager_phone: outlet.manager_phone,
            is_read: false,
          }))

          await Promise.all([
            supabase.from('notifications').insert(
              withoutDeliveryPhone(escalationNotifications)
            ),
            supabase.from('alerts').insert({
              outlet_id: outlet.id,
              alert_type: 'PHOTO_ESCALATION',
              message: escalationMessage,
              severity: 'CRITICAL',
              is_read: false,
            }),
            deliverOperationalEmails(escalationNotifications),
            deliverOperationalPhoneAlerts(escalationNotifications),
          ])
          reminders += escalationNotifications.length
          resultStatus = 'escalated'
        }
      }

      results.push({ outlet: outlet.name, slot: slot.key, status: resultStatus })
    }

    for (const slot of dueCounterSlots) {
      const { data: round, error: roundError } = await supabase
        .from('counter_temperature_rounds')
        .select('id')
        .eq('outlet_id', outlet.id)
        .eq('round_date', ist.date)
        .eq('slot_key', slot.key)
        .maybeSingle()

      if (roundError) {
        if (roundError.code === '42P01' || roundError.code === 'PGRST205') {
          return NextResponse.json(
            { error: 'Counter rounds are waiting for the latest database migration' },
            { status: 503 }
          )
        }
        continue
      }

      if (round) {
        results.push({ outlet: outlet.name, slot: slot.key, status: 'done' })
        continue
      }

      missingCounterCount += 1
      const marker = `[counter-slot:${slot.key}][date:${ist.date}]`
      const escalationMarker = `${marker}[escalation]`
      const { count: priorCount } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'COUNTER_ROUND_MISSED')
        .eq('outlet_id', outlet.id)
        .gte('created_at', start)
        .ilike('message', `%${marker}%`)

      let resultStatus: 'reminded' | 'already-reminded' | 'escalated' =
        (priorCount ?? 0) > 0 ? 'already-reminded' : 'reminded'
      const message = `${slot.label} is overdue at ${outlet.name}. Five photos and four thermometer readings are required. ${marker}`
      const notifications = ceoEmails.map((email) => ({
        recipient_email: email,
        recipient_phone:
          ceoContacts?.find((contact) => contact.email.toLowerCase() === email)?.phone ??
          null,
        recipient_role: 'CEO',
        type: 'COUNTER_ROUND_MISSED',
        title: 'Counter round missed',
        message,
        outlet_id: outlet.id,
        manager_phone: outlet.manager_phone,
        is_read: false,
      }))

      if (manager?.email) {
        notifications.push({
          recipient_email: manager.email,
          recipient_phone: manager.phone ?? outlet.manager_phone,
          recipient_role: 'MANAGER',
          type: 'COUNTER_ROUND_REMINDER',
          title: 'Counter round overdue',
          message: `${slot.label} is overdue. Open the shift board and submit all five proofs now. ${marker}`,
          outlet_id: outlet.id,
          manager_phone: outlet.manager_phone,
          is_read: false,
        })
      }

      if ((priorCount ?? 0) === 0) {
        await Promise.all([
          supabase.from('notifications').insert(withoutDeliveryPhone(notifications)),
          supabase.from('alerts').insert({
            outlet_id: outlet.id,
            alert_type: 'COUNTER_ROUND_MISSED',
            message,
            severity: 'MEDIUM',
            is_read: false,
          }),
          deliverOperationalEmails(notifications),
          deliverOperationalPhoneAlerts(notifications),
        ])
        reminders += notifications.length
      }

      const minutesLate = nowMinutes - counterRoundMinutes(slot)
      if (minutesLate >= 90 || missingCounterCount >= 2) {
        const { count: priorEscalationCount } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('type', 'COUNTER_ROUND_ESCALATION')
          .eq('outlet_id', outlet.id)
          .gte('created_at', start)
          .ilike('message', `%${escalationMarker}%`)

        if ((priorEscalationCount ?? 0) === 0) {
          const escalationMessage = `${slot.label} is still missing at ${outlet.name}. Owner follow-up is required. ${escalationMarker}`
          const escalationNotifications = ceoEmails.map((email) => ({
            recipient_email: email,
            recipient_phone:
              ceoContacts?.find((contact) => contact.email.toLowerCase() === email)?.phone ??
              null,
            recipient_role: 'CEO',
            type: 'COUNTER_ROUND_ESCALATION',
            title: 'Counter round escalation',
            message: escalationMessage,
            outlet_id: outlet.id,
            manager_phone: outlet.manager_phone,
            is_read: false,
          }))
          await Promise.all([
            supabase.from('notifications').insert(
              withoutDeliveryPhone(escalationNotifications)
            ),
            supabase.from('alerts').insert({
              outlet_id: outlet.id,
              alert_type: 'COUNTER_ROUND_ESCALATION',
              message: escalationMessage,
              severity: 'CRITICAL',
              is_read: false,
            }),
            deliverOperationalEmails(escalationNotifications),
            deliverOperationalPhoneAlerts(escalationNotifications),
          ])
          reminders += escalationNotifications.length
          resultStatus = 'escalated'
        }
      }

      results.push({ outlet: outlet.name, slot: slot.key, status: resultStatus })
    }
  }

  return NextResponse.json({
    date: ist.date,
    checked: results.length,
    reminders,
    results,
  })
}
