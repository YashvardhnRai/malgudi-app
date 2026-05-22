import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { isSupabaseConfigured, getSupabaseServerClient } from '@/lib/supabase'

const ANALYSIS_PROMPT = `You are a food quality inspector for Malgudi, a premium South Indian restaurant chain by Shankar Mahadevan.
Analyse this food/kitchen photo and check for quality issues. Look for:
- Food that looks undercooked, overcooked, contaminated, or old
- Dirty surfaces, poor hygiene, pest signs
- Banmarie items that look depleted, congealed, or improperly maintained
- Presentation issues not meeting premium restaurant standards

Respond ONLY with valid JSON in this exact format:
{"status": "APPROVED" or "FLAGGED", "notes": "one brief sentence about what you see"}`

async function analyseWithClaude(imageBase64: string, mediaType: string): Promise<{ status: 'APPROVED' | 'FLAGGED' | 'PENDING'; notes: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
    return { status: 'PENDING', notes: 'AI analysis not configured.' }
  }

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 128,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: imageBase64,
            },
          },
          { type: 'text', text: ANALYSIS_PROMPT },
        ],
      }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const parsed = JSON.parse(text.trim())
    return {
      status: parsed.status === 'FLAGGED' ? 'FLAGGED' : 'APPROVED',
      notes: parsed.notes ?? '',
    }
  } catch {
    return { status: 'PENDING', notes: 'AI analysis unavailable.' }
  }
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const photos = formData.getAll('photos') as File[]
  const category = formData.get('category') as string
  const caption = formData.get('caption') as string
  const outletId = formData.get('outlet_id') as string

  if (!photos.length) {
    return NextResponse.json({ error: 'No photos provided' }, { status: 400 })
  }

  const photo = photos[0]
  const bytes = await photo.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const base64 = buffer.toString('base64')
  const mediaType = photo.type || 'image/jpeg'

  const aiResult = await analyseWithClaude(base64, mediaType)

  if (!isSupabaseConfigured) {
    return NextResponse.json({
      url: '',
      aiStatus: aiResult.status,
      aiNotes: aiResult.notes,
      id: `ph-${Date.now()}`,
    })
  }

  try {
    const supabase = getSupabaseServerClient()

    const fileName = `${outletId}/${Date.now()}-${photo.name}`
    const { data: storageData, error: storageError } = await supabase.storage
      .from('photos')
      .upload(fileName, buffer, { contentType: mediaType, upsert: false })

    if (storageError) throw storageError

    const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(storageData.path)

    const record = {
      outlet_id: outletId,
      category: category ?? 'FOOD_QUALITY',
      photo_url: publicUrl,
      caption: caption || null,
      ai_status: aiResult.status,
      ai_notes: aiResult.notes,
    }

    const { data, error } = await supabase.from('photo_uploads').insert(record).select().single()
    if (error) throw error

    if (aiResult.status === 'FLAGGED') {
      await supabase.from('alerts').insert({
        outlet_id: outletId,
        alert_type: 'PHOTO_FLAGGED',
        message: `AI flagged a ${category} photo: ${aiResult.notes}`,
        severity: 'MEDIUM',
        is_read: false,
      })
    }

    return NextResponse.json({
      url: publicUrl,
      aiStatus: aiResult.status,
      aiNotes: aiResult.notes,
      id: data.id,
    })
  } catch (err) {
    console.error('photo upload error:', err)
    return NextResponse.json({
      url: '',
      aiStatus: aiResult.status,
      aiNotes: aiResult.notes,
    })
  }
}
