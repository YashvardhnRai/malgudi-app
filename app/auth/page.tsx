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
      background: 'linear-gradient(180deg, #0F1240 0%, #1E2260 50%, #2B2F77 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      overflowX: 'hidden',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative',
    }}>
      {/* Animated orb — top right */}
      <div style={{
        position: 'fixed',
        top: -100,
        right: -100,
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(240,90,40,0.12) 0%, transparent 70%)',
        animation: 'float 6s ease-in-out infinite',
        pointerEvents: 'none',
      }} />
      {/* Animated orb — bottom left */}
      <div style={{
        position: 'fixed',
        bottom: -80,
        left: -80,
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(240,90,40,0.08) 0%, transparent 70%)',
        animation: 'float 8s ease-in-out infinite reverse',
        pointerEvents: 'none',
      }} />
      {/* Grid pattern */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(240,90,40,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(240,90,40,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
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
            className="btn-primary"
            style={{
              width: '100%',
              padding: '16px',
              background: loading ? 'rgba(240,90,40,0.5)' : '#F05A28',
              fontSize: 16,
              marginTop: 4,
              boxSizing: 'border-box',
              letterSpacing: 0.5,
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
            className="btn-secondary"
            style={{ padding: '10px 24px', fontSize: 13 }}
          >
            Use different email
          </button>
        </div>
      )}
    </div>
  )
}
