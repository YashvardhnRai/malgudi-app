import { NextResponse } from 'next/server'
import { isSupabaseConfigured, getSupabaseServerClient } from '@/lib/supabase'

const CEO_EMAILS = [
  'yashvardhnrai@gmail.com',
  'chandrashekharr05@gmail.com',
]

function getISTHour(): number {
  const ist = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  return ist.getHours()
}

function getISTTwoHoursAgo(): string {
  const now = new Date()
  return new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
}

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ message: 'Supabase not configured' })
  }

  const supabase = getSupabaseServerClient()
  const currentHour = getISTHour()

  const { data: schedules, error: schedErr } = await supabase
    .from('upload_schedule')
    .select('*, outlets(*)')
    .eq('hour', currentHour)
    .eq('is_active', true)

  if (schedErr) {
    return NextResponse.json({ error: schedErr.message }, { status: 500 })
  }

  if (!schedules?.length) {
    return NextResponse.json({ message: 'No schedules for this hour', hour: currentHour })
  }

  const twoHoursAgo = getISTTwoHoursAgo()
  const results = []

  for (const schedule of schedules) {
    const outlet = schedule.outlets as any
    if (!outlet) continue

    const { data: photos } = await supabase
      .from('photo_uploads')
      .select('id')
      .eq('outlet_id', schedule.outlet_id)
      .gte('created_at', twoHoursAgo)

    const uploaded = (photos?.length ?? 0) > 0
    const notifRows = []

    if (uploaded) {
      for (const email of CEO_EMAILS) {
        notifRows.push({
          recipient_email: email,
          recipient_role: 'CEO',
          type: 'PHOTO_UPLOADED',
          title: '📸 Photo Uploaded',
          message: `Photo uploaded — ${outlet.name} Outlet`,
          outlet_id: schedule.outlet_id,
          manager_phone: outlet.manager_phone ?? null,
          is_read: false,
        })
      }
    } else {
      for (const email of CEO_EMAILS) {
        notifRows.push({
          recipient_email: email,
          recipient_role: 'CEO',
          type: 'PHOTO_MISSED',
          title: '⚠️ Photo Not Uploaded',
          message: `Photo NOT uploaded on time — ${outlet.name} Outlet`,
          outlet_id: schedule.outlet_id,
          manager_phone: outlet.manager_phone ?? null,
          is_read: false,
        })
      }

      const { data: managerUser } = await supabase
        .from('users')
        .select('email')
        .eq('outlet_id', schedule.outlet_id)
        .eq('role', 'MANAGER')
        .maybeSingle()

      if (managerUser?.email) {
        notifRows.push({
          recipient_email: managerUser.email,
          recipient_role: 'MANAGER',
          type: 'UPLOAD_REMINDER',
          title: '⏰ Upload Reminder',
          message: `You missed the ${schedule.label} upload. Please upload now.`,
          outlet_id: schedule.outlet_id,
          manager_phone: null,
          is_read: false,
        })
      }

      await supabase.from('alerts').insert({
        outlet_id: schedule.outlet_id,
        alert_type: 'PHOTO_MISSED',
        message: `Photo NOT uploaded on time for ${schedule.label} — ${outlet.name}`,
        severity: 'MEDIUM',
        is_read: false,
      })
    }

    if (notifRows.length > 0) {
      await supabase.from('notifications').insert(notifRows)
    }

    results.push({ outlet: outlet.name, uploaded, notifications: notifRows.length })
  }

  return NextResponse.json({ checked: results, hour: currentHour })
}
