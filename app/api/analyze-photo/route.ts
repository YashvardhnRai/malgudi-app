import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { isSupabaseConfigured, getSupabaseServerClient } from '@/lib/supabase'

const INSPECTION_PROMPT = `You are a restaurant quality inspector for Malgudi restaurants. Analyze this photo from an outlet. Look for:
1. Kitchen cleanliness and hygiene
2. Food presentation and quality
3. Storage and organization
4. Safety hazards
5. Staff uniform and grooming

Respond in JSON format:
{
  "status": "PASS" or "FAIL",
  "score": 1-10,
  "issues": [
    {
      "category": "Hygiene",
      "severity": "HIGH" | "MEDIUM" | "LOW",
      "description": "short description"
    }
  ],
  "summary": "one line summary",
  "recommendation": "what to fix"
}`

const SEVERITY_ORDER: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 }

export async function POST(request: NextRequest) {
  const { image, outlet_id, media_type } = await request.json()

  if (!image) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    return NextResponse.json({ error: 'AI analysis not configured' }, { status: 503 })
  }

  const anthropic = new Anthropic({ apiKey })

  let analysis: {
    status: 'PASS' | 'FAIL'
    score: number
    issues: { category: string; severity: string; description: string }[]
    summary: string
    recommendation: string
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: (media_type ?? 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: image,
            },
          },
          { type: 'text', text: INSPECTION_PROMPT },
        ],
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
    analysis = JSON.parse(cleaned)
  } catch (err) {
    console.error('Claude analysis error:', err)
    return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 })
  }

  if (analysis.status === 'FAIL' && outlet_id && isSupabaseConfigured) {
    try {
      const supabase = getSupabaseServerClient()

      const highestSeverity = analysis.issues.reduce(
        (best, issue) =>
          (SEVERITY_ORDER[issue.severity] ?? 0) > (SEVERITY_ORDER[best] ?? 0) ? issue.severity : best,
        'LOW'
      )

      const dbSeverity = highestSeverity === 'HIGH' ? 'HIGH'
        : highestSeverity === 'MEDIUM' ? 'MEDIUM'
        : 'LOW'

      await supabase.from('alerts').insert({
        outlet_id,
        alert_type: 'AI_PHOTO_REVIEW',
        message: `${analysis.summary}. ${analysis.recommendation}`,
        severity: dbSeverity,
        is_read: false,
      })
    } catch (err) {
      console.error('Alert insert error:', err)
    }
  }

  return NextResponse.json(analysis)
}
