import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, getSupabaseServerClient } from '@/lib/supabase'
import { getMockDashboard } from '@/lib/mock-data'

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json(getMockDashboard())
  }

  try {
    const supabase = getSupabaseServerClient()
    const today = new Date().toISOString().split('T')[0]

    const [outletsRes, salesRes, checklistsRes, complaintsRes, photosRes, alertsRes] = await Promise.all([
      supabase.from('outlets').select('*').eq('is_active', true),
      supabase.from('daily_sales').select('*').eq('date', today),
      supabase.from('checklist_submissions').select('*').gte('created_at', `${today}T00:00:00Z`),
      supabase.from('complaints').select('*').eq('status', 'OPEN'),
      supabase.from('photo_uploads').select('*').gte('created_at', `${today}T00:00:00Z`).order('created_at', { ascending: false }).limit(12),
      supabase.from('alerts').select('*').eq('is_read', false).order('created_at', { ascending: false }),
    ])

    if (outletsRes.error) throw outletsRes.error

    const outlets = (outletsRes.data ?? []).map(outlet => {
      const sales = (salesRes.data ?? []).find(s => s.outlet_id === outlet.id)
      const complaints = (complaintsRes.data ?? []).filter(c => c.outlet_id === outlet.id)
      const checklists = (checklistsRes.data ?? []).filter(c => c.outlet_id === outlet.id)
      const flaggedPhotos = (photosRes.data ?? []).filter(p => p.outlet_id === outlet.id && p.ai_status === 'FLAGGED')

      const missed = checklists.some(c => c.status === 'MISSED')
      const late = checklists.some(c => c.status === 'LATE')
      const highComplaint = complaints.some(c => c.severity === 'HIGH')
      const hasComplaints = complaints.length > 0

      let status: 'GREEN' | 'AMBER' | 'RED' = 'GREEN'
      if (missed || highComplaint || flaggedPhotos.length > 0) status = 'RED'
      else if (late || hasComplaints) status = 'AMBER'

      const done = checklists.filter(c => c.status !== 'MISSED').length

      return {
        ...outlet,
        status,
        last_update: null,
        today_sales: sales?.total_sales ?? 0,
        complaint_count: complaints.length,
        checklists_done: done,
        checklists_total: checklists.length,
      }
    })

    const totalSales = (salesRes.data ?? []).reduce((sum: number, s: { total_sales: number }) => sum + (s.total_sales ?? 0), 0)
    const allChecklists = checklistsRes.data ?? []
    const complianceRate = allChecklists.length > 0
      ? Math.round((allChecklists.filter((c: { status: string }) => c.status === 'SUBMITTED').length / allChecklists.length) * 100)
      : 100

    return NextResponse.json({
      total_sales: totalSales,
      total_complaints: (complaintsRes.data ?? []).length,
      compliance_rate: complianceRate,
      photos_uploaded: (photosRes.data ?? []).length,
      alerts: alertsRes.data ?? [],
      outlets,
      recent_photos: photosRes.data ?? [],
    })
  } catch (err) {
    console.error('outlets API error:', err)
    return NextResponse.json(getMockDashboard())
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (!isSupabaseConfigured) {
    return NextResponse.json({ id: `outlet-${Date.now()}`, ...body }, { status: 201 })
  }

  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.from('outlets').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
