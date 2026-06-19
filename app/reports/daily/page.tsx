import DailyReportClient from './DailyReportClient'
import { requirePageActor } from '@/lib/auth-server'

export default async function DailyReportPage() {
  const actor = await requirePageActor({ roles: ['CEO'] })
  return <DailyReportClient userName={actor.name} />
}
