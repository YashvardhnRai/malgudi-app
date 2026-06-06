import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase'
import { isCeoEmail } from '@/lib/auth'

type UserProfile = {
  role: 'CEO' | 'MANAGER' | 'STAFF'
  outlet_id: string | null
}

const CEO_PATHS = ['/dashboard', '/admin', '/outlet', '/complaints', '/launch']
const OPERATIONS_PATHS = ['/manager', '/upload', '/report']

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie))
  return target
}

function roleHome(profile: UserProfile) {
  if (profile.role === 'CEO') return '/dashboard'
  if (profile.role === 'MANAGER' && profile.outlet_id) {
    return `/manager/${profile.outlet_id}`
  }
  return profile.outlet_id
    ? `/worker?outlet=${encodeURIComponent(profile.outlet_id)}`
    : '/worker'
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isProtected =
    CEO_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    OPERATIONS_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    )

  if (!user?.email) {
    if (!isProtected) return response

    const loginUrl = new URL('/auth', request.url)
    loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`)
    return copyCookies(response, NextResponse.redirect(loginUrl))
  }

  const email = user.email.trim().toLowerCase()
  const { data: userRow } = await getSupabaseServerClient()
    .from('users')
    .select('role, outlet_id')
    .eq('email', email)
    .maybeSingle<UserProfile>()

  const profile: UserProfile | null =
    userRow ??
    (isCeoEmail(email)
      ? {
          role: 'CEO',
          outlet_id: null,
        }
      : null)

  if (!profile) {
    return copyCookies(response, NextResponse.redirect(new URL('/auth?error=no_access', request.url)))
  }

  if (pathname === '/') {
    return copyCookies(
      response,
      NextResponse.redirect(new URL(roleHome(profile), request.url))
    )
  }

  if (CEO_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    if (profile.role !== 'CEO') {
      return copyCookies(
        response,
        NextResponse.redirect(new URL(roleHome(profile), request.url))
      )
    }
  }

  if (pathname.startsWith('/manager/')) {
    const requestedOutletId = pathname.split('/')[2]
    if (
      profile.role !== 'CEO' &&
      (!profile.outlet_id || requestedOutletId !== profile.outlet_id)
    ) {
      return copyCookies(
        response,
        NextResponse.redirect(new URL(roleHome(profile), request.url))
      )
    }
  }

  if (pathname === '/manager' && profile.role !== 'CEO' && profile.outlet_id) {
    return copyCookies(
      response,
      NextResponse.redirect(
        new URL(`/manager/${profile.outlet_id}`, request.url)
      )
    )
  }

  return response
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/admin/:path*',
    '/outlet/:path*',
    '/complaints/:path*',
    '/launch/:path*',
    '/manager/:path*',
    '/upload/:path*',
    '/report/:path*',
  ],
}
