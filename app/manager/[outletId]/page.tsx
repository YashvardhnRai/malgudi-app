import ManagerPageClient from './ManagerPageClient'
import { requirePageActor } from '@/lib/auth-server'

export default async function ManagerPage({
  params,
}: {
  params: Promise<{ outletId: string }>
}) {
  const { outletId } = await params
  const actor = await requirePageActor({
    roles: ['CEO', 'MANAGER', 'STAFF'],
    outletId,
  })

  return (
    <ManagerPageClient
      actorName={actor.name}
      actorEmail={actor.email}
      actorRole={actor.role}
      presenceEnabled={actor.role === 'MANAGER'}
    />
  )
}
