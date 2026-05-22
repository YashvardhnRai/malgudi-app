'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { isSupabaseConfigured, getSupabaseBrowserClient } from '@/lib/supabase'
import MalgudiLogo from '@/app/components/MalgudiLogo'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async () => {
    if (!email.trim()) return
    setLoading(true)
    setError('')

    if (!isSupabaseConfigured) {
      router.push('/')
      return
    }

    try {
      const supabase = getSupabaseBrowserClient()
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (authError) throw authError
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1E2260',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      overflowX: 'hidden',
      width: '100%',
      boxSizing: 'border-box',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: `
          radial-gradient(circle at 20% 50%, rgba(240,90,40,0.08) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(240,90,40,0.05) 0%, transparent 40%)
        `,
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <div style={{ marginBottom: 12, position: 'relative' }}>
        <MalgudiLogo size={64} color="#F05A28" />
      </div>

      {/* Brand */}
      <div style={{
        fontSize: 28,
        fontFamily: 'var(--font-display)',
        fontWeight: 900,
        color: '#F05A28',
        letterSpacing: 6,
        marginBottom: 4,
        position: 'relative',
      }}>
        MALGUDI
      </div>
      <div style={{
        fontSize: 13,
        color: 'rgba(240,90,40,0.5)',
        letterSpacing: 3,
        marginBottom: 6,
        position: 'relative',
      }}>
        मालगुडी
      </div>
      <div style={{
        fontSize: 13,
        color: 'rgba(255,255,255,0.4)',
        marginBottom: 40,
        letterSpacing: 0.5,
        position: 'relative',
      }}>
        Operations Dashboard
      </div>

      {/* Form */}
      {!sent ? (
        <div style={{
          width: '100%',
          maxWidth: 360,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          position: 'relative',
        }}>
          <label style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: 2,
            textTransform: 'uppercase' as const,
          }}>
            Email Address
          </label>
          <input
            suppressHydrationWarning
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="you@example.com"
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(240,90,40,0.3)',
              borderRadius: 12,
              padding: '14px 18px',
              color: '#fff',
              fontSize: 16,
              outline: 'none',
              fontFamily: 'var(--font-body)',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(240,90,40,0.6)' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(240,90,40,0.3)' }}
          />

          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 10,
              color: '#FCA5A5',
              fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !email.trim()}
            style={{
              width: '100%',
              padding: '16px',
              background: loading ? 'rgba(240,90,40,0.5)' : '#F05A28',
              color: '#fff',
              fontWeight: 800,
              fontSize: 16,
              borderRadius: 12,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-display)',
              marginTop: 4,
              boxSizing: 'border-box',
              boxShadow: '0 4px 24px rgba(240,90,40,0.4)',
              transition: 'all 0.2s',
              letterSpacing: 0.5,
            }}
            onMouseEnter={e => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(240,90,40,0.5)'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = '0 4px 24px rgba(240,90,40,0.4)'
            }}
          >
            {loading ? 'Sending...' : 'Send Magic Link →'}
          </button>

          <div style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.25)',
            textAlign: 'center' as const,
            lineHeight: 1.7,
            marginTop: 8,
          }}>
            Access by invitation only.
            <br />
            Contact your administrator for access.
          </div>
        </div>
      ) : (
        <div style={{
          width: '100%',
          maxWidth: 360,
          textAlign: 'center' as const,
          position: 'relative',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div style={{
            fontSize: 22,
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            color: '#fff',
            marginBottom: 8,
          }}>
            Check your inbox
          </div>
          <div style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.8,
            marginBottom: 24,
          }}>
            Magic link sent to
            <br />
            <span style={{ color: '#F05A28' }}>{email}</span>
            <br />
            Click it to sign in instantly.
          </div>
          <button
            onClick={() => { setSent(false); setEmail('') }}
            style={{
              background: 'none',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              padding: '10px 24px',
              color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: 'var(--font-body)',
            }}
          >
            Use different email
          </button>
        </div>
      )}
    </div>
  )
}
