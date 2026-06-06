import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { isCeoEmail } from '@/lib/auth'

export type AppRole = 'CEO' | 'MANAGER' | 'STAFF'

export type AuthActor = {
  authUserId: string
  profileId: string | null
  email: string
  name: string
  role: AppRole
  outletId: string | null
  phone: string | null
}

type UserProfile = {
  id: string
  email: string
  name: string
  role: AppRole
  outlet_id: string | null
  phone: string | null
}

export async function getAuthActor(): Promise<AuthActor | null> {
  if (!isSupabaseConfigured) return null

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // Route handlers and pages only read the caller session here.
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const email = user?.email?.trim().toLowerCase()
  if (!user || !email) return null

  const { data: profile } = await getSupabaseServerClient()
    .from('users')
    .select('id, email, name, role, outlet_id, phone')
    .eq('email', email)
    .maybeSingle<UserProfile>()

  if (profile) {
    return {
      authUserId: user.id,
      profileId: profile.id,
      email,
      name: profile.name,
      role: profile.role,
      outletId: profile.outlet_id,
      phone: profile.phone,
    }
  }

  if (isCeoEmail(email)) {
    return {
      authUserId: user.id,
      profileId: null,
      email,
      name: email.split('@')[0],
      role: 'CEO',
      outletId: null,
      phone: null,
    }
  }

  return null
}

export function getRoleHome(actor: AuthActor) {
  if (actor.role === 'CEO') return '/dashboard'
  if (actor.role === 'MANAGER' && actor.outletId) {
    return `/manager/${actor.outletId}`
  }
  if (actor.outletId) return `/worker?outlet=${encodeURIComponent(actor.outletId)}`
  return '/worker'
}

export async function authorizeApi(options?: {
  roles?: AppRole[]
  outletId?: string | null
}) {
  const actor = await getAuthActor()
  if (!actor) {
    return {
      actor: null,
      response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    }
  }

  if (options?.roles && !options.roles.includes(actor.role)) {
    return {
      actor: null,
      response: NextResponse.json({ error: 'Insufficient access' }, { status: 403 }),
    }
  }

  if (
    options?.outletId &&
    actor.role !== 'CEO' &&
    actor.outletId !== options.outletId
  ) {
    return {
      actor: null,
      response: NextResponse.json({ error: 'Outlet access denied' }, { status: 403 }),
    }
  }

  return { actor, response: null }
}

export async function requirePageActor(options?: {
  roles?: AppRole[]
  outletId?: string | null
}) {
  const actor = await getAuthActor()
  if (!actor) redirect('/auth')

  if (options?.roles && !options.roles.includes(actor.role)) {
    redirect(getRoleHome(actor))
  }

  if (
    options?.outletId &&
    actor.role !== 'CEO' &&
    actor.outletId !== options.outletId
  ) {
    redirect(getRoleHome(actor))
  }

  return actor
}
