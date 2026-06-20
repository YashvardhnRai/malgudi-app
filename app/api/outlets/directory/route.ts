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
        manager_name: outlet.manager_name,
        manager_phone: outlet.manager_phone,
        is_active: outlet.is_active,
        created_at: outlet.created_at,
      })),
    })
  }

  const { data, error } = await getSupabaseServerClient()
    .from('outlets')
    .select('id, name, city, country, manager_name, manager_phone, is_active, created_at')
    .eq('is_active', true)
    .order('name')

  if (error) {
    return NextResponse.json({ error: 'Outlet directory unavailable', outlets: [] }, { status: 503 })
  }

  return NextResponse.json({ outlets: data ?? [] })
}
