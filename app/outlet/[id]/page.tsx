import { redirect } from 'next/navigation'
import OutletDetail from '@/app/components/OutletDetail'
import { requirePageActor } from '@/lib/auth-server'
import { getIstDateRange } from '@/lib/operations'
import { getSupabaseServerClient } from '@/lib/supabase'

export default async function OutletPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const actor = await requirePageActor({ roles: ['CEO'], outletId: id })

  const supabase = getSupabaseServerClient()
  const { date, start, end } = getIstDateRange()
  const [outletRes, photosRes, complaintsRes, salesRes, checklistsRes, managerRes] =
    await Promise.all([
      supabase.from('outlets').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('photo_uploads')
        .select('*')
        .eq('outlet_id', id)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false }),
      supabase
        .from('complaints')
        .select('*')
        .eq('outlet_id', id)
        .order('reported_at', { ascending: false }),
      supabase
        .from('daily_sales')
        .select('*')
        .eq('outlet_id', id)
        .eq('date', date)
        .maybeSingle(),
      supabase
        .from('checklist_submissions')
        .select('*')
        .eq('outlet_id', id)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false }),
      supabase
        .from('users')
        .select('name, phone, email')
        .eq('outlet_id', id)
        .eq('role', 'MANAGER')
        .maybeSingle(),
    ])

  if (!outletRes.data) redirect('/dashboard')

  return (
    <OutletDetail
      userName={actor.name}
      outlet={outletRes.data}
      photos={photosRes.data ?? []}
      complaints={complaintsRes.data ?? []}
      sales={salesRes.data ?? null}
      checklists={checklistsRes.data ?? []}
      manager={managerRes.data ?? null}
    />
  )
}
