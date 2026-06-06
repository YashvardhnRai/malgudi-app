import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit, requireSameOrigin } from '@/lib/api-security'
import { authorizeApi } from '@/lib/auth-server'

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const rateError = enforceRateLimit(request, 'legacy-photo-review', 6, 10 * 60_000)
  if (rateError) return rateError

  const { response } = await authorizeApi({ roles: ['CEO', 'MANAGER', 'STAFF'] })
  if (response) return response

  return NextResponse.json(
    {
      error: 'This endpoint has been retired. Upload photos through /api/photos for automatic review.',
    },
    { status: 410 }
  )
}
