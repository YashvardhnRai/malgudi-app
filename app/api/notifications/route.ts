import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, getSupabaseServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')

  if (!isSupabaseConfigured) return NextResponse.json([])

  try {
    const supabase = getSupabaseServerClient()
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)

    if (email) query = query.eq('recipient_email', email)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (!isSupabaseConfigured) {
    return NextResponse.json({ id: `notif-${Date.now()}`, ...body }, { status: 201 })
  }

  try {
    const supabase = getSupabaseServerClient()
    const { data, error } = await supabase
      .from('notifications')
      .insert(body)
      .select()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Insert failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PATCH(request: NextRequest) {
  const { ids } = await request.json()

  if (!isSupabaseConfigured) return NextResponse.json({ ok: true })

  try {
    const supabase = getSupabaseServerClient()
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', ids)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
