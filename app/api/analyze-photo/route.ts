import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { enforceRateLimit, readJsonBody, requireSameOrigin } from '@/lib/api-security'
import { authorizeApi } from '@/lib/auth-server'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { isUuid } from '@/lib/validation'

const INSPECTION_PROMPT = `You are a restaurant quality inspector for Malgudi restaurants. Analyze this photo for kitchen cleanliness, food quality, storage, safety, and staff hygiene. Respond with JSON only:
{"status":"PASS" or "FAIL","score":1-10,"issues":[{"category":"Hygiene","severity":"HIGH" or "MEDIUM" or "LOW","description":"brief issue"}],"summary":"brief summary","recommendation":"brief action"}`

const MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const MAX_BASE64_LENGTH = 11_200_000
const SEVERITY_ORDER: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 }

type Analysis = {
  status: 'PASS' | 'FAIL'
  score: number
  issues: { category: string; severity: string; description: string }[]
  summary: string
  recommendation: string
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request)
  if (originError) return originError
  const rateError = enforceRateLimit(request, 'photo-analysis', 6, 10 * 60_000)
  if (rateError) return rateError

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > 12 * 1024 * 1024) {
    return NextResponse.json({ error: 'Photo is too large' }, { status: 413 })
  }

  const parsed = await readJsonBody<{
    image?: unknown
    outlet_id?: unknown
    media_type?: unknown
  }>(request)
  if (parsed.response || !parsed.data) return parsed.response

  const image = typeof parsed.data.image === 'string' ? parsed.data.image : ''
  const outletId = parsed.data.outlet_id
  const mediaType =
    typeof parsed.data.media_type === 'string' ? parsed.data.media_type : 'image/jpeg'

  if (
    !isUuid(outletId) ||
    !MEDIA_TYPES.has(mediaType) ||
    !image ||
    image.length > MAX_BASE64_LENGTH ||
    !/^[A-Za-z0-9+/=]+$/.test(image)
  ) {
    return NextResponse.json({ error: 'Valid image data is required' }, { status: 400 })
  }

  const { actor, response } = await authorizeApi({
    roles: ['CEO', 'MANAGER'],
    outletId,
  })
  if (response || !actor) return response

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'AI analysis is not configured' }, { status: 503 })
  }

  let analysis: Analysis
  try {
    const anthropic = new Anthropic({ apiKey })
    const result = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: image,
            },
          },
          { type: 'text', text: INSPECTION_PROMPT },
        ],
      }],
    })

    const text = result.content[0].type === 'text' ? result.content[0].text : ''
    const raw = JSON.parse(text.replace(/```json|```/g, '').trim()) as Partial<Analysis>
    analysis = {
      status: raw.status === 'FAIL' ? 'FAIL' : 'PASS',
      score: Math.max(1, Math.min(10, Number(raw.score) || 1)),
      issues: Array.isArray(raw.issues)
        ? raw.issues.slice(0, 10).map((issue) => ({
            category: String(issue.category || 'Quality').slice(0, 60),
            severity: ['HIGH', 'MEDIUM', 'LOW'].includes(issue.severity)
              ? issue.severity
              : 'LOW',
            description: String(issue.description || '').slice(0, 240),
          }))
        : [],
      summary: String(raw.summary || '').slice(0, 300),
      recommendation: String(raw.recommendation || '').slice(0, 300),
    }
  } catch {
    return NextResponse.json({ error: 'AI analysis is temporarily unavailable' }, { status: 503 })
  }

  if (analysis.status === 'FAIL' && isSupabaseConfigured) {
    const highestSeverity = analysis.issues.reduce(
      (best, issue) =>
        (SEVERITY_ORDER[issue.severity] ?? 0) > (SEVERITY_ORDER[best] ?? 0)
          ? issue.severity
          : best,
      'LOW'
    )
    await getSupabaseServerClient().from('alerts').insert({
      outlet_id: outletId,
      alert_type: 'AI_PHOTO_REVIEW',
      message: `${analysis.summary}. ${analysis.recommendation}`.slice(0, 500),
      severity: highestSeverity,
      is_read: false,
    })
  }

  return NextResponse.json(analysis)
}
