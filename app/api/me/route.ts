import { NextResponse } from 'next/server'
import { getAuthActor } from '@/lib/auth-server'

export async function GET() {
  const actor = await getAuthActor()
  if (!actor) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      email: actor.email,
      name: actor.name,
      role: actor.role,
      outlet_id: actor.outletId,
      phone: actor.phone,
    },
  })
}
