import { NextResponse } from 'next/server'
import { isSupabaseConfigured, getSupabaseServerClient } from '@/lib/supabase'
import { getMockOutletDetail } from '@/lib/mock-data'

const SEEDED_OUTLET_ID_TO_MOCK_ID: Record<string, string> = {
  '00000000-0000-0000-0000-000000000001': 'outlet-bandra',
  '00000000-0000-0000-0000-000000000002': 'outlet-juhu',
  '00000000-0000-0000-0000-000000000003': 'outlet-andheri',
  '00000000-0000-0000-0000-000000000004': 'outlet-powai',
  '00000000-0000-0000-0000-000000000005': 'outlet-dadar',
  '00000000-0000-0000-0000-000000000006': 'outlet-colaba',
  '00000000-0000-0000-0000-000000000007': 'outlet-cp',
  '00000000-0000-0000-0000-000000000008': 'outlet-hk',
  '00000000-0000-0000-0000-000000000009': 'outlet-saket',
  '00000000-0000-0000-0000-00000000000a': 'outlet-dm',
  '00000000-0000-0000-0000-00000000000b': 'outlet-jbr',
  '00000000-0000-0000-0000-00000000000c': 'outlet-bb',
  '00000000-0000-0000-0000-00000000000d': 'outlet-difc',
}

function getFallbackDetail(id: string) {
  return getMockOutletDetail(SEEDED_OUTLET_ID_TO_MOCK_ID[id] ?? id)
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!isSupabaseConfigured) {
    const detail = getFallbackDetail(id)
    if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(detail)
  }

  try {
    const supabase = getSupabaseServerClient()
    const today = new Date().toISOString().split('T')[0]

    const [outletRes, checklistsRes, photosRes, salesRes, complaintsRes] = await Promise.all([
      supabase.from('outlets').select('*').eq('id', id).single(),
      supabase.from('checklist_submissions').select('*').eq('outlet_id', id).gte('created_at', `${today}T00:00:00Z`),
      supabase.from('photo_uploads').select('*').eq('outlet_id', id).gte('created_at', `${today}T00:00:00Z`),
      supabase.from('daily_sales').select('*').eq('outlet_id', id).eq('date', today).single(),
      supabase.from('complaints').select('*').eq('outlet_id', id).gte('reported_at', `${today}T00:00:00Z`),
    ])

    if (outletRes.error || !outletRes.data) {
      const detail = getFallbackDetail(id)
      if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json(detail)
    }

    const compliance_history: { date: string; rate: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const dayRes = await supabase
        .from('checklist_submissions')
        .select('status')
        .eq('outlet_id', id)
        .gte('created_at', `${dateStr}T00:00:00Z`)
        .lt('created_at', `${dateStr}T23:59:59Z`)
      const items = dayRes.data ?? []
      const rate = items.length > 0
        ? Math.round((items.filter((c: { status: string }) => c.status === 'SUBMITTED').length / items.length) * 100)
        : 0
      compliance_history.push({ date: dateStr, rate })
    }

    return NextResponse.json({
      outlet: outletRes.data,
      checklists: checklistsRes.data ?? [],
      photos: photosRes.data ?? [],
      sales: salesRes.data ?? null,
      complaints: complaintsRes.data ?? [],
      compliance_history,
    })
  } catch (err) {
    console.error('outlet detail error:', err)
    const detail = getFallbackDetail(id)
    if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(detail)
  }
}
