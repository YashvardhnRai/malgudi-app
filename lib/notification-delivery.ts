import 'server-only'

import { getPublicSiteUrl } from '@/lib/site-url'

type OperationalNotification = {
  recipient_email: string
  recipient_phone?: string | null
  title: string
  message: string
  type: string
}

export async function deliverOperationalEmails(
  notifications: OperationalNotification[]
) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.ALERT_FROM_EMAIL
  if (!apiKey || !from || notifications.length === 0) {
    return { delivered: 0, skipped: notifications.length }
  }

  let delivered = 0

  for (const notification of notifications) {
    if (
      !notification.recipient_email ||
      notification.recipient_email.endsWith('@malgudi.internal')
    ) {
      continue
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [notification.recipient_email],
        subject: `[Malgudi] ${notification.title}`,
        text: `${notification.message}\n\nOpen Malgudi Operations: ${getPublicSiteUrl()}`,
      }),
    })

    if (response.ok) {
      delivered += 1
    } else {
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'notification_email_failed',
          type: notification.type,
          status: response.status,
        })
      )
    }
  }

  return { delivered, skipped: notifications.length - delivered }
}

function normalizePhone(phone: string | null | undefined) {
  if (!phone) return null
  const trimmed = phone.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('+')) return trimmed.replace(/\s+/g, '')
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 10) return `+91${digits}`
  if (digits.length > 10) return `+${digits}`
  return null
}

async function deliverTwilioMessage({
  to,
  body,
  channel,
}: {
  to: string
  body: string
  channel: 'sms' | 'whatsapp'
}) {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const smsFrom = process.env.TWILIO_FROM_SMS
  const whatsappFrom = process.env.TWILIO_FROM_WHATSAPP
  const from = channel === 'whatsapp' ? whatsappFrom : smsFrom
  if (!sid || !token || !from) return false

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: channel === 'whatsapp' ? `whatsapp:${from}` : from,
        To: channel === 'whatsapp' ? `whatsapp:${to}` : to,
        Body: body,
      }),
    }
  )

  if (!response.ok) {
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'twilio_delivery_failed',
        channel,
        status: response.status,
      })
    )
  }

  return response.ok
}

export async function deliverOperationalPhoneAlerts(
  notifications: OperationalNotification[]
) {
  const siteUrl = getPublicSiteUrl()
  let sms = 0
  let whatsapp = 0
  let skipped = 0

  for (const notification of notifications) {
    const to = normalizePhone(notification.recipient_phone)
    if (!to) {
      skipped += 1
      continue
    }

    const body = `[Malgudi] ${notification.title}: ${notification.message.replace(
      /\s*\[[^\]]+\]\s*/g,
      ' '
    )} ${siteUrl}`.slice(0, 900)

    const [smsDelivered, whatsappDelivered] = await Promise.all([
      deliverTwilioMessage({ to, body, channel: 'sms' }),
      deliverTwilioMessage({ to, body, channel: 'whatsapp' }),
    ])

    if (smsDelivered) sms += 1
    if (whatsappDelivered) whatsapp += 1
    if (!smsDelivered && !whatsappDelivered) skipped += 1
  }

  return { sms, whatsapp, skipped }
}
