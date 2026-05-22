'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { isSupabaseConfigured, getSupabaseBrowserClient } from '@/lib/supabase'
import MalgudiLogo from '@/app/components/MalgudiLogo'

interface Props {
  role?: 'CEO' | 'MANAGER'
  alertCount?: number
  userName?: string
}

export default function NavBar({ role = 'CEO', alertCount = 0, userName }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  const avatarLetter = userName
    ? userName[0].toUpperCase()
    : role === 'CEO'
    ? 'C'
    : 'M'

  const handleSignOut = async () => {
    if (isSupabaseConfigured) {
      const supabase = getSupabaseBrowserClient()
      await supabase.auth.signOut()
    }
    router.push('/auth')
  }

  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        backgroundColor: '#2B2F77',
        height: 64,
        boxShadow: '0 1px 0 rgba(240,90,40,0.1)',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 48px',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
          <MalgudiLogo size={36} color="#F05A28" />
          <div>
            <div style={{
              fontSize: 17,
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              color: '#F05A28',
              letterSpacing: 3,
              lineHeight: 1,
            }}>
              MALGUDI
            </div>
            <div style={{
              fontSize: 9,
              color: 'rgba(240,90,40,0.5)',
              letterSpacing: 2,
              marginTop: 2,
            }}>
              मालगुडी
            </div>
          </div>
        </Link>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {role === 'CEO' && (
            <Link
              href="/complaints"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: pathname === '/complaints' ? '#F05A28' : 'rgba(255,255,255,0.6)',
                textDecoration: 'none',
                letterSpacing: 0.3,
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#F05A28' }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLElement).style.color =
                  pathname === '/complaints' ? '#F05A28' : 'rgba(255,255,255,0.6)'
              }}
            >
              Complaints
            </Link>
          )}

          {/* Bell */}
          <button
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.6)',
              position: 'relative',
              padding: 4,
              lineHeight: 1,
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {alertCount > 0 && (
              <span style={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 16,
                height: 16,
                background: 'var(--danger)',
                borderRadius: '50%',
                fontSize: 9,
                fontWeight: 700,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </button>

          {/* Avatar */}
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: '#F05A28',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 800,
            color: '#2B2F77',
            fontFamily: 'var(--font-display)',
            flexShrink: 0,
          }}>
            {avatarLetter}
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 14px',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'var(--font-body)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(240,90,40,0.4)'
              e.currentTarget.style.color = '#F05A28'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
              e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
