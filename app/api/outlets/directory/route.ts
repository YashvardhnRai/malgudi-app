import { NextResponse } from 'next/server'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { getMockDashboard } from '@/lib/mock-data'

export async function GET() {
  if (!isSupabaseConfigured) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ outlets: [] }, { status: 503 })
    }
    return NextResponse.json({
      outlets: getMockDashboard().outlets.map((outlet) => ({
        id: outlet.id,
        name: outlet.name,
        city: outlet.city,
        country: outlet.country,
        manager_name: null,
        manager_phone: null,
        is_active: outlet.is_active,
        created_at: outlet.created_at,
      })),
    })
  }

  const { data, error } = await getSupabaseServerClient()
    .from('outlets')
    .select('id, name, city, country, is_active, created_at')
    .eq('is_active', true)
    .order('name')

  if (error) {
    return NextResponse.json({ error: 'Outlet directory unavailable', outlets: [] }, { status: 503 })
  }

  return NextResponse.json({
    outlets: (data ?? []).map((outlet) => ({
      ...outlet,
      manager_name: null,
      manager_phone: null,
    })),
  })
}
