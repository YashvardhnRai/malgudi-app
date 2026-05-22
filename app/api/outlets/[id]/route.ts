import { NextResponse } from 'next/server'
import { isSupabaseConfigured, getSupabaseServerClient } from '@/lib/supabase'
import { getMockOutletDetail } from '@/lib/mock-data'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!isSupabaseConfigured) {
    const detail = getMockOutletDetail(id)
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

    if (outletRes.error) return NextResponse.json({ error: 'Not found' }, { status: 404 })

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
    const detail = getMockOutletDetail(id)
    if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(detail)
  }
}
