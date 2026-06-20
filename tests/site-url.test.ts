import { afterEach, describe, expect, it, vi } from 'vitest'
import { getPublicSiteUrl } from '../lib/site-url'

function requestFor(origin: string) {
  return new Request(`${origin}/api/users`, {
    headers: {
      host: new URL(origin).host,
      'x-forwarded-host': new URL(origin).host,
      'x-forwarded-proto': new URL(origin).protocol.replace(':', ''),
    },
  })
}

describe('public site URL helper', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    vi.unstubAllEnvs()
    process.env = { ...originalEnv }
  })

  it('uses configured localhost during local development', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3001')

    expect(getPublicSiteUrl(requestFor('http://localhost:3001'))).toBe(
      'http://localhost:3001'
    )
  })

  it('ignores configured localhost when production request origin is public', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3001')

    expect(getPublicSiteUrl(requestFor('https://malgudi-app.vercel.app'))).toBe(
      'https://malgudi-app.vercel.app'
    )
  })
})
