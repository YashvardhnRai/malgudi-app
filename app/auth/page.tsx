'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle2, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client'
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
      router.push('/dashboard')
      return
    }

    try {
      const supabase = createClient()
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
    <main className="auth-page">
      <section className="auth-brand-panel" aria-label="Malgudi operations preview">
        <div className="auth-brand-top">
          <MalgudiLogo size={48} />
          <div>
            <strong>MALGUDI</strong>
            <span>Operations command</span>
          </div>
        </div>

        <div className="auth-brand-copy">
          <div className="auth-kicker">
            <Sparkles size={15} />
            Invitation only
          </div>
          <h1>Every outlet, every shift, under control.</h1>
          <p>
            Magic-link access for owners and managers. No passwords, no shared
            logins, just a direct path into the operations dashboard.
          </p>
        </div>

        <div className="auth-preview-grid">
          <div>
            <span>Live outlets</span>
            <strong>13</strong>
          </div>
          <div>
            <span>Compliance</span>
            <strong>96%</strong>
          </div>
          <div>
            <span>Alerts</span>
            <strong>Instant</strong>
          </div>
        </div>
      </section>

      <section className="auth-form-panel">
        {!sent ? (
          <>
            <div className="auth-form-head">
              <div className="auth-form-icon">
                <ShieldCheck size={22} />
              </div>
              <span>Secure CEO and manager access</span>
              <h2>Sign in with magic link</h2>
              <p>Enter your invited email and we will send a one-click sign-in link.</p>
            </div>

            <label className="auth-label" htmlFor="email">
              Email address
            </label>
            <div className="auth-input-wrap">
              <Mail size={18} />
              <input
                id="email"
                suppressHydrationWarning
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onInput={e => setEmail(e.currentTarget.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="you@example.com"
              />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button
              type="button"
              onClick={handleLogin}
              disabled={loading || !email.trim()}
              className="auth-submit"
            >
              {loading ? 'Sending link...' : 'Send magic link'}
              <ArrowRight size={18} />
            </button>

            <p className="auth-footnote">
              Access is limited to approved Malgudi operators.
            </p>
          </>
        ) : (
          <div className="auth-sent">
            <div className="auth-form-icon success">
              <CheckCircle2 size={26} />
            </div>
            <h2>Check your inbox</h2>
            <p>
              Magic link sent to <strong>{email}</strong>. Click it to enter
              the dashboard instantly.
            </p>
            <button
              type="button"
              onClick={() => {
                setSent(false)
                setEmail('')
              }}
            >
              Use a different email
            </button>
          </div>
        )}
      </section>
    </main>
  )
}
