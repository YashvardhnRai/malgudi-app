import 'server-only'

type OperationalNotification = {
  recipient_email: string
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
        text: `${notification.message}\n\nOpen Malgudi Operations: ${
          process.env.NEXT_PUBLIC_SITE_URL || 'https://malgudi-app.vercel.app'
        }`,
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
