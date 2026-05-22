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
      background: '#2B2F77',
      display: 'flex',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background radial glows */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `radial-gradient(circle at 20% 50%, rgba(240,90,40,0.08) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(240,90,40,0.05) 0%, transparent 40%)`,
        pointerEvents: 'none',
      }} />

      {/* Left panel — brand */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px',
        position: 'relative',
        background: 'linear-gradient(135deg, #1E2260, #2B2F77)',
        borderRight: '1px solid rgba(240,90,40,0.1)',
      }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ marginBottom: 16 }}>
            <MalgudiLogo size={100} color="#F05A28" />
          </div>
          <div style={{
            fontSize: 32,
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            color: '#F05A28',
            letterSpacing: 8,
            marginBottom: 4,
          }}>
            MALGUDI
          </div>
          <div style={{
            fontSize: 16,
            color: 'rgba(240,90,40,0.5)',
            letterSpacing: 4,
            fontFamily: 'var(--font-body)',
          }}>
            मालगुडी
          </div>
        </div>

        <div style={{ maxWidth: 360 }}>
          <div style={{
            fontSize: 24,
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            color: '#fff',
            marginBottom: 12,
            lineHeight: 1.4,
          }}>
            Operations Dashboard
          </div>
          <div style={{
            fontSize: 15,
            color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.8,
          }}>
            Monitor all outlets, track food quality,
            manage complaints and keep every
            Malgudi experience consistent.
          </div>
        </div>

        <div style={{
          marginTop: 'auto',
          paddingTop: 48,
          borderTop: '1px solid rgba(240,90,40,0.1)',
        }}>
          <div style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.3)',
            fontStyle: 'italic',
            fontFamily: 'var(--font-display)',
          }}>
            &ldquo;Consistency is what transforms average into excellence.&rdquo;
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        width: 480,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px 60px',
        position: 'relative',
        background: '#1E2260',
      }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: 'rgba(240,90,40,0.6)',
            marginBottom: 12,
          }}>
            Welcome back
          </div>
          <div style={{
            fontSize: 28,
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            color: '#fff',
            marginBottom: 8,
          }}>
            Sign in to continue
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
            We&apos;ll send a magic link to your email
          </div>
        </div>

        {!sent ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: 1,
                textTransform: 'uppercase',
                marginBottom: 8,
              }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="you@example.com"
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(240,90,40,0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 18px',
                  color: '#fff',
                  fontSize: 15,
                  outline: 'none',
                  fontFamily: 'var(--font-body)',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(240,90,40,0.6)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(240,90,40,0.25)' }}
              />
            </div>

            {error && (
              <div style={{
                padding: '10px 14px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 'var(--radius-sm)',
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
                padding: '15px',
                background: loading ? 'rgba(240,90,40,0.5)' : '#F05A28',
                color: '#fff',
                fontWeight: 800,
                fontSize: 15,
                borderRadius: 'var(--radius-md)',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-display)',
                letterSpacing: 0.5,
                transition: 'all 0.2s',
                marginTop: 4,
              }}
              onMouseEnter={e => {
                if (!loading) {
                  const el = e.currentTarget
                  el.style.background = '#F47350'
                  el.style.transform = 'translateY(-1px)'
                  el.style.boxShadow = '0 4px 20px rgba(240,90,40,0.4)'
                }
              }}
              onMouseLeave={e => {
                const el = e.currentTarget
                el.style.background = loading ? 'rgba(240,90,40,0.5)' : '#F05A28'
                el.style.transform = 'none'
                el.style.boxShadow = 'none'
              }}
            >
              {loading ? 'Sending link...' : 'Send Magic Link →'}
            </button>

            <div style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.25)',
              textAlign: 'center',
              lineHeight: 1.7,
              marginTop: 8,
            }}>
              Access by invitation only.
              <br />
              Contact your administrator for access.
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }} className="animate-fade-up">
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(34,197,94,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: 28,
              color: '#4ADE80',
            }}>
              ✓
            </div>
            <div style={{
              fontSize: 22,
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              color: '#fff',
              marginBottom: 10,
            }}>
              Check your inbox
            </div>
            <div style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.8,
              marginBottom: 28,
            }}>
              We sent a magic link to
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
                borderRadius: 'var(--radius-sm)',
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
    </div>
  )
}
