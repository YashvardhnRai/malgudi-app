import { NextResponse } from 'next/server'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'

export async function GET() {
  const checkedAt = new Date().toISOString()
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { status: 'degraded', database: 'unconfigured', checked_at: checkedAt },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const startedAt = Date.now()
  const { error } = await getSupabaseServerClient()
    .from('outlets')
    .select('id', { count: 'exact', head: true })
    .limit(1)

  const body = {
    status: error ? 'degraded' : 'ok',
    database: error ? 'unavailable' : 'ok',
    latency_ms: Date.now() - startedAt,
    checked_at: checkedAt,
    deployment: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
  }

  return NextResponse.json(body, {
    status: error ? 503 : 200,
    headers: { 'Cache-Control': 'no-store' },
  })
}
