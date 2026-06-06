import { redirect } from 'next/navigation'
import { getRoleHome, requirePageActor } from '@/lib/auth-server'
import { getSupabaseServerClient } from '@/lib/supabase'

export default async function ManagerIndexPage() {
  const actor = await requirePageActor({
    roles: ['CEO', 'MANAGER', 'STAFF'],
  })

  if (actor.role !== 'CEO') {
    redirect(getRoleHome(actor))
  }

  const { data } = await getSupabaseServerClient()
    .from('outlets')
    .select('id')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>()

  redirect(data?.id ? `/manager/${data.id}` : '/dashboard')
}
