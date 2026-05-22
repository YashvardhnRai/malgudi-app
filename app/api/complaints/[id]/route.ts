import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, getSupabaseServerClient } from '@/lib/supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  if (!isSupabaseConfigured) {
    return NextResponse.json({ id, ...body, resolved_at: body.status === 'RESOLVED' ? new Date().toISOString() : null })
  }

  const supabase = getSupabaseServerClient()
  const updates: Record<string, unknown> = { ...body }
  if (body.status === 'RESOLVED') updates.resolved_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('complaints')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
