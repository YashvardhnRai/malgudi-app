import 'server-only'

import { createRemoteJWKSet, jwtVerify } from 'jose'

const GITHUB_ISSUER = 'https://token.actions.githubusercontent.com'
const GITHUB_AUDIENCE = 'malgudi-restaurant-reminders'
const GITHUB_REPOSITORY = 'yashvardhnrai/malgudi-app'
const GITHUB_JWKS = createRemoteJWKSet(
  new URL('https://token.actions.githubusercontent.com/.well-known/jwks')
)

export async function verifyReminderWorkflowToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, GITHUB_JWKS, {
      issuer: GITHUB_ISSUER,
      audience: GITHUB_AUDIENCE,
    })

    const repository = String(payload.repository || '').toLowerCase()
    const eventName = String(payload.event_name || '')
    const workflowRef = String(payload.workflow_ref || '')
    const ref = String(payload.ref || '')

    return (
      repository === GITHUB_REPOSITORY &&
      ['schedule', 'workflow_dispatch'].includes(eventName) &&
      ref === 'refs/heads/main' &&
      workflowRef.includes(
        '/.github/workflows/restaurant-reminders.yml@refs/heads/main'
      )
    )
  } catch {
    return false
  }
}
