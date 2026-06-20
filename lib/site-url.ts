const FALLBACK_SITE_URL = 'https://malgudi-app.vercel.app'

function cleanOrigin(value: string | null | undefined) {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.origin
  } catch {
    return null
  }
}

function isLocalOrigin(origin: string | null) {
  if (!origin) return false
  try {
    const { hostname } = new URL(origin)
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
  } catch {
    return false
  }
}

function getForwardedOrigin(request: Request) {
  const host =
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
    request.headers.get('host')?.split(',')[0]?.trim()
  if (!host) return cleanOrigin(request.url)

  const protocol =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
    new URL(request.url).protocol.replace(':', '')

  return cleanOrigin(`${protocol}://${host}`)
}

export function getPublicSiteUrl(request?: Request) {
  const configured = cleanOrigin(
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
  )
  const requestOrigin = request ? getForwardedOrigin(request) : null
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'

  if (configured && !(isProduction && isLocalOrigin(configured))) {
    return configured
  }

  if (requestOrigin && !(isProduction && isLocalOrigin(requestOrigin))) {
    return requestOrigin
  }

  return configured || requestOrigin || FALLBACK_SITE_URL
}
