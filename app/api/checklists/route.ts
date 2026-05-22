import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, getSupabaseServerClient } from '@/lib/supabase'
import { MOCK_CHECKLISTS } from '@/lib/mock-data'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const outletId = searchParams.get('outlet_id')
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  if (!isSupabaseConfigured) {
    const results = outletId
      ? MOCK_CHECKLISTS.filter(c => c.outlet_id === outletId)
      : MOCK_CHECKLISTS
    return NextResponse.json(results)
  }

  const supabase = getSupabaseServerClient()
  let query = supabase.from('checklist_submissions').select('*').gte('created_at', `${date}T00:00:00Z`)
  if (outletId) query = query.eq('outlet_id', outletId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { outlet_id, checklist_type, items, notes } = body

  const now = new Date()
  const submission = {
    outlet_id,
    checklist_type,
    submission_time: now.toISOString(),
    status: 'SUBMITTED',
    notes: notes ?? null,
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({ id: `cl-${Date.now()}`, ...submission, created_at: now.toISOString() }, { status: 201 })
  }

  try {
    const supabase = getSupabaseServerClient()
    const { data: sub, error } = await supabase
      .from('checklist_submissions')
      .insert(submission)
      .select()
      .single()

    if (error) throw error

    if (items && Array.isArray(items)) {
      const checklistItems = items.flatMap((item: { name: string; checks: string[]; notes: string }) =>
        item.checks.map((check: string) => ({
          submission_id: sub.id,
          item_name: `${item.name} - ${check}`,
          is_completed: true,
          notes: item.notes || null,
        }))
      )
      if (checklistItems.length > 0) {
        await supabase.from('checklist_items').insert(checklistItems)
      }
    }

    return NextResponse.json(sub, { status: 201 })
  } catch (err) {
    console.error('checklist submit error:', err)
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 })
  }
}
