import CEODashboard from '@/app/components/CEODashboard'
import { requirePageActor } from '@/lib/auth-server'

export default async function DashboardPage() {
  const actor = await requirePageActor({ roles: ['CEO'] })
  return <CEODashboard userName={actor.name} />
}
