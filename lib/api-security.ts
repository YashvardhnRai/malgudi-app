import { NextRequest, NextResponse } from 'next/server'

type RateBucket = {
  count: number
  resetAt: number
}

const rateBuckets = new Map<string, RateBucket>()

export function getClientIp(request: NextRequest) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export function enforceRateLimit(
  request: NextRequest,
  scope: string,
  limit = 30,
  windowMs = 60_000
) {
  const now = Date.now()
  const key = `${scope}:${getClientIp(request)}`
  const current = rateBuckets.get(key)

  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }

  if (current.count >= limit) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait and try again.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.max(1, Math.ceil((current.resetAt - now) / 1000))),
        },
      }
    )
  }

  current.count += 1
  return null
}

export function requireSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (!origin) return null

  const expected = new URL(request.url).origin
  if (origin === expected) return null

  return NextResponse.json({ error: 'Cross-origin request rejected' }, { status: 403 })
}

export async function readJsonBody<T>(request: NextRequest) {
  try {
    return { data: (await request.json()) as T, response: null }
  } catch {
    return {
      data: null,
      response: NextResponse.json({ error: 'Valid JSON is required' }, { status: 400 }),
    }
  }
}
