import ReportIssueClient from './ReportIssueClient'
import { requirePageActor } from '@/lib/auth-server'

export default async function ReportIssuePage() {
  const actor = await requirePageActor({
    roles: ['CEO', 'MANAGER', 'STAFF'],
  })

  return (
    <ReportIssueClient
      actorRole={actor.role}
      assignedOutletId={actor.outletId}
    />
  )
}
