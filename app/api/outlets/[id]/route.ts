import { NextResponse } from 'next/server'
import { authorizeApi } from '@/lib/auth-server'
import { getIstDateRange } from '@/lib/operations'
import { signPhotoRows } from '@/lib/photo-urls'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'

function isMissingTableError(error: { code?: string }) {
  return error.code === '42P01' || error.code === 'PGRST205'
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const access = await authorizeApi({
    roles: ['CEO', 'MANAGER', 'STAFF'],
    outletId: id,
  })
  if (access.response) return access.response

  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Operations database unavailable' }, { status: 503 })
  }

  try {
    const supabase = getSupabaseServerClient()
    const { date, start, end } = getIstDateRange()
    const [outletRes, checklistsRes, photosRes, salesRes, complaintsRes, attendanceRes, inventoryRes, counterRoundsRes] =
      await Promise.all([
        supabase.from('outlets').select('*').eq('id', id).single(),
        supabase
          .from('checklist_submissions')
          .select('*')
          .eq('outlet_id', id)
          .gte('created_at', start)
          .lte('created_at', end),
        supabase
          .from('photo_uploads')
          .select('*')
          .eq('outlet_id', id)
          .gte('created_at', start)
          .lte('created_at', end)
          .order('created_at', { ascending: false }),
        supabase
          .from('daily_sales')
          .select('*')
          .eq('outlet_id', id)
          .eq('date', date)
          .maybeSingle(),
        supabase
          .from('complaints')
          .select('*')
          .eq('outlet_id', id)
          .gte('reported_at', start)
          .lte('reported_at', end),
        supabase
          .from('shift_attendance')
          .select('*')
          .eq('outlet_id', id)
          .eq('shift_date', date)
          .order('check_in_at', { ascending: false }),
        supabase
          .from('inventory_logs')
          .select('*')
          .eq('outlet_id', id)
          .eq('log_date', date)
          .order('created_at', { ascending: false }),
        supabase
          .from('counter_temperature_rounds')
          .select('*')
          .eq('outlet_id', id)
          .eq('round_date', date)
          .order('scheduled_at', { ascending: true }),
      ])

    if (outletRes.error) {
      return NextResponse.json({ error: 'Outlet not found' }, { status: 404 })
    }
    if (checklistsRes.error) throw checklistsRes.error
    if (photosRes.error) throw photosRes.error
    if (salesRes.error) throw salesRes.error
    if (complaintsRes.error) throw complaintsRes.error
    if (attendanceRes.error && !isMissingTableError(attendanceRes.error)) throw attendanceRes.error
    if (inventoryRes.error && !isMissingTableError(inventoryRes.error)) throw inventoryRes.error
    if (counterRoundsRes.error && !isMissingTableError(counterRoundsRes.error)) {
      throw counterRoundsRes.error
    }

    const counterRounds = counterRoundsRes.error ? [] : counterRoundsRes.data ?? []
    const counterRoundIds = counterRounds.map((round) => round.id)
    const counterReadingsRes = counterRoundIds.length
      ? await supabase
          .from('counter_temperature_readings')
          .select('*')
          .in('round_id', counterRoundIds)
          .order('created_at', { ascending: true })
      : { data: [], error: null }
    if (counterReadingsRes.error && !isMissingTableError(counterReadingsRes.error)) {
      throw counterReadingsRes.error
    }

    const signedPhotos = await signPhotoRows(photosRes.data ?? [])
    const signedCounterReadings = await signPhotoRows(counterReadingsRes.data ?? [])

    return NextResponse.json({
      outlet: outletRes.data,
      checklists: checklistsRes.data ?? [],
      photos: signedPhotos,
      sales: salesRes.data ?? null,
      complaints: complaintsRes.data ?? [],
      attendance: attendanceRes.error ? [] : attendanceRes.data ?? [],
      inventory: inventoryRes.error ? [] : inventoryRes.data ?? [],
      counter_rounds: counterRounds.map((round) => ({
        ...round,
        readings: signedCounterReadings.filter(
          (reading) => reading.round_id === round.id
        ),
      })),
      compliance_history: [],
    })
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'outlet_detail_failed',
        outletId: id,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    )
    return NextResponse.json({ error: 'Outlet data unavailable' }, { status: 503 })
  }
}
