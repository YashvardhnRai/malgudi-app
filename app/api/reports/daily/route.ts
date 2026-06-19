import { NextRequest, NextResponse } from 'next/server'
import { authorizeApi } from '@/lib/auth-server'
import { buildDailyReport, dailyReportToCsv } from '@/lib/daily-report'
import { getIstParts } from '@/lib/operations'
import { isSupabaseConfigured } from '@/lib/supabase'
import { isIsoDate } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const { response } = await authorizeApi({ roles: ['CEO'] })
  if (response) return response

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Restaurant data service is unavailable' }, { status: 503 })
  }

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') ?? getIstParts().date
  const format = searchParams.get('format') ?? 'json'

  if (!isIsoDate(date)) {
    return NextResponse.json({ error: 'Valid report date is required' }, { status: 400 })
  }

  try {
    const report = await buildDailyReport(date)

    if (format === 'csv') {
      return new NextResponse(dailyReportToCsv(report), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="malgudi-daily-report-${date}.csv"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    return NextResponse.json(report, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'daily_report_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    )
    return NextResponse.json({ error: 'Unable to build daily report' }, { status: 503 })
  }
}
