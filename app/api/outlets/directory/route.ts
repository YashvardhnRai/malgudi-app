import { NextResponse } from 'next/server'
import { authorizeApi } from '@/lib/auth-server'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { getMockDashboard } from '@/lib/mock-data'

export async function GET() {
  const { actor, response } = await authorizeApi({
    roles: ['CEO', 'MANAGER', 'STAFF'],
  })
  if (response || !actor) return response

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

  let query = getSupabaseServerClient()
    .from('outlets')
    .select('id, name, city, country, manager_name, manager_phone, is_active, created_at')
    .eq('is_active', true)
    .order('name')

  if (actor.role !== 'CEO') {
    if (!actor.outletId) {
      return NextResponse.json({ error: 'No outlet assigned', outlets: [] }, { status: 403 })
    }
    query = query.eq('id', actor.outletId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Outlet directory unavailable', outlets: [] }, { status: 503 })
  }

  return NextResponse.json({ outlets: data ?? [] })
}
