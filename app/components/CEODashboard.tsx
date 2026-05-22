'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import NavHeader from '@/app/components/NavHeader'
import type { DashboardSummary, OutletWithStatus } from '@/lib/types'

const isMobile = () =>
  typeof window !== 'undefined' && window.innerWidth < 768

function formatINR(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n}`
}

function getISTGreeting() {
  const ist = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
  )
  const h = ist.getHours()
  return {
    greeting: h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening',
    emoji: h < 12 ? '🌅' : h < 17 ? '☀️' : '🌙',
    date: ist.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    }),
  }
}

const STATUS_COLOR: Record<OutletWithStatus['status'], string> = {
  GREEN: '#22C55E',
  AMBER: '#F59E0B',
  RED: '#EF4444',
}
const STATUS_LABEL: Record<OutletWithStatus['status'], string> = {
  GREEN: 'Operational',
  AMBER: 'Needs attention',
  RED: 'Alert',
}

export default function CEODashboard({ userName }: { userName: string }) {
  const router = useRouter()
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobile, setMobile] = useState(false)
  const { greeting, emoji, date } = getISTGreeting()

  useEffect(() => {
    const check = () => setMobile(isMobile())
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    fetch('/api/outlets')
      .then((r) => r.json())
      .then((d: DashboardSummary) => setData(d))
      .finally(() => setLoading(false))
  }, [])

  const statCards = data
    ? [
        {
          label: 'Sales Today',
          value: formatINR(data.total_sales),
          icon: '💰',
          color: '#F05A28',
          desc: 'Across all outlets',
          delay: 0,
        },
        {
          label: 'Open Complaints',
          value: String(data.total_complaints),
          icon: '⚠️',
          color: data.total_complaints > 0 ? '#EF4444' : '#22C55E',
          desc: data.total_complaints > 0 ? 'Need attention' : 'All clear',
          delay: 80,
        },
        {
          label: 'Compliance',
          value: `${data.compliance_rate}%`,
          icon: '✅',
          color:
            data.compliance_rate >= 90
              ? '#22C55E'
              : data.compliance_rate >= 75
              ? '#F59E0B'
              : '#EF4444',
          desc: 'Checklists completed',
          delay: 160,
        },
        {
          label: 'Photos Uploaded',
          value: String(data.photos_uploaded ?? 0),
          icon: '📸',
          color: '#2B2F77',
          desc: 'Today',
          delay: 240,
        },
      ]
    : null

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--warm-white)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <NavHeader userName={userName} />

      {/* ── HERO ─────────────────────────────── */}
      <div
        className="hero-padding"
        style={{
          background:
            'linear-gradient(135deg, #1E2260 0%, #2B2F77 60%, #363B8F 100%)',
          padding: 'clamp(32px, 6vw, 56px) clamp(16px, 4vw, 48px) clamp(72px, 12vw, 96px)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Animated background orbs */}
        <div
          style={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 500,
            height: 500,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(240,90,40,0.12) 0%, transparent 70%)',
            animation: 'float 6s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            left: '30%',
            width: 300,
            height: 300,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(240,90,40,0.06) 0%, transparent 70%)',
            animation: 'float 8s ease-in-out infinite reverse',
            pointerEvents: 'none',
          }}
        />

        {/* Grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(240,90,40,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(240,90,40,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            pointerEvents: 'none',
          }}
        />

        {/* Date */}
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: 'rgba(240,90,40,0.6)',
            marginBottom: 16,
            animation: 'fadeUp 0.6s var(--ease-out-expo) 0.1s both',
          }}
        >
          {date}
        </div>

        {/* Greeting */}
        <h1
          className="hero-title"
          style={{
            fontSize: 'clamp(28px, 6vw, 48px)',
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            color: '#fff',
            marginBottom: 12,
            lineHeight: 1.1,
            letterSpacing: -1,
            animation: 'fadeUp 0.7s var(--ease-out-expo) 0.2s both',
          }}
        >
          {greeting}, Malgudi Team{' '}
          <span
            style={{
              display: 'inline-block',
              animation: 'float 3s ease-in-out infinite',
            }}
          >
            {emoji}
          </span>
        </h1>

        {/* Live badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            animation: 'fadeUp 0.7s var(--ease-out-expo) 0.3s both',
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#22C55E',
              animation: 'pulse-orange 2s infinite',
            }}
          />
          <span
            style={{
              fontSize: 14,
              color: '#F05A28',
              fontWeight: 500,
              letterSpacing: 0.5,
            }}
          >
            {loading
              ? 'Loading…'
              : `${data?.outlets.length ?? 0} outlet${
                  (data?.outlets.length ?? 0) !== 1 ? 's' : ''
                } · Mumbai · Live`}
          </span>
        </div>
      </div>

      {/* ── FLOATING STAT CARDS ───────────────── */}
      <div
        className="dashboard-padding"
        style={{
          padding: '0 clamp(16px, 4vw, 48px)',
          marginTop: -48,
          marginBottom: 48,
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div className="stats-grid">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="skeleton"
                  style={{ height: 140, borderRadius: 20 }}
                />
              ))
            : statCards!.map((card, i) => (
                <div
                  key={card.label}
                  style={{
                    background: '#fff',
                    borderRadius: 20,
                    padding: '24px 28px',
                    boxShadow: '0 8px 40px rgba(43,47,119,0.12)',
                    animation: `fadeUp 0.6s var(--ease-out-expo) ${0.4 + i * 0.08}s both`,
                    border: '1px solid rgba(43,47,119,0.06)',
                    transition:
                      'transform 0.3s var(--ease-spring), box-shadow 0.3s var(--ease-smooth)',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement
                    el.style.transform = 'translateY(-4px)'
                    el.style.boxShadow = '0 16px 48px rgba(43,47,119,0.18)'
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement
                    el.style.transform = 'none'
                    el.style.boxShadow = '0 8px 40px rgba(43,47,119,0.12)'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: 1.5,
                        textTransform: 'uppercase',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {card.label}
                    </div>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: `${card.color}18`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                      }}
                    >
                      {card.icon}
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 36,
                      fontFamily: 'var(--font-display)',
                      fontWeight: 800,
                      color: card.color,
                      lineHeight: 1,
                      marginBottom: 8,
                      letterSpacing: -1,
                    }}
                  >
                    {card.value}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      fontWeight: 500,
                    }}
                  >
                    {card.desc}
                  </div>

                  {/* Bottom accent line */}
                  <div
                    style={{
                      marginTop: 16,
                      height: 2,
                      borderRadius: 100,
                      background: `linear-gradient(90deg, ${card.color}, transparent)`,
                      opacity: 0.3,
                    }}
                  />
                </div>
              ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ─────────────────────── */}
      <div style={{ padding: '0 clamp(16px, 4vw, 48px) 64px' }}>

        {/* Alerts */}
        {data && data.alerts.length > 0 && (
          <div
            style={{
              background: 'linear-gradient(135deg, #FFF5F5, #FFF8F8)',
              border: '1px solid #FECACA',
              borderLeft: '4px solid #EF4444',
              borderRadius: 16,
              padding: '20px 24px',
              marginBottom: 40,
              animation: 'fadeUp 0.6s var(--ease-out-expo) 0.6s both',
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#B91C1C',
                marginBottom: 10,
                letterSpacing: 0.5,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 14 }}>⚠</span>
              {data.alerts.length} alert{data.alerts.length > 1 ? 's' : ''} require
              your attention
            </div>
            {data.alerts.map((a, i) => (
              <div
                key={a.id ?? i}
                style={{
                  fontSize: 13,
                  color: '#DC2626',
                  marginTop: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: '#DC2626',
                    flexShrink: 0,
                  }}
                />
                {a.message}
              </div>
            ))}
          </div>
        )}

        {/* Section header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
            animation: 'fadeUp 0.6s var(--ease-out-expo) 0.5s both',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 28,
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                color: 'var(--navy)',
                letterSpacing: -0.5,
                marginBottom: 4,
              }}
            >
              Outlets
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {loading
                ? '…'
                : `${data?.outlets.length ?? 0} location${
                    (data?.outlets.length ?? 0) !== 1 ? 's' : ''
                  } · Mumbai`}
            </p>
          </div>
        </div>

        {/* Outlet cards */}
        {loading ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 20,
            }}
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="skeleton"
                style={{ height: 240, borderRadius: 20 }}
              />
            ))}
          </div>
        ) : data && data.outlets.length > 0 ? (
          <div
            className="outlets-grid"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            }}
          >
            {data.outlets.map((outlet, i) => {
              const color = STATUS_COLOR[outlet.status]
              const label = STATUS_LABEL[outlet.status]

              return (
                <div
                  key={outlet.id}
                  onClick={() => router.push(`/outlet/${outlet.id}`)}
                  style={{
                    background: '#fff',
                    borderRadius: 20,
                    padding: 28,
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    animation: `fadeUp 0.6s var(--ease-out-expo) ${0.6 + i * 0.1}s both`,
                    transition: 'all 0.3s var(--ease-spring)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement
                    el.style.transform = 'translateY(-4px) scale(1.01)'
                    el.style.boxShadow = '0 20px 60px rgba(43,47,119,0.15)'
                    el.style.borderColor = `${color}40`
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement
                    el.style.transform = 'none'
                    el.style.boxShadow = 'none'
                    el.style.borderColor = 'var(--border)'
                  }}
                >
                  {/* Color accent top bar */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: `linear-gradient(90deg, ${color}, transparent)`,
                      borderRadius: '20px 20px 0 0',
                    }}
                  />

                  {/* Header */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 24,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 20,
                          fontFamily: 'var(--font-display)',
                          fontWeight: 800,
                          color: 'var(--navy)',
                          marginBottom: 4,
                          letterSpacing: -0.3,
                        }}
                      >
                        {outlet.name}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: color,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 11,
                            color,
                            fontWeight: 600,
                            letterSpacing: 0.3,
                          }}
                        >
                          {label}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '6px 12px',
                        background: `${color}12`,
                        borderRadius: 100,
                        fontSize: 11,
                        fontWeight: 700,
                        color,
                        letterSpacing: 0.5,
                        flexShrink: 0,
                      }}
                    >
                      {outlet.city}
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 12,
                      marginBottom: 20,
                    }}
                  >
                    {[
                      {
                        label: 'Sales',
                        value:
                          outlet.today_sales > 0
                            ? formatINR(outlet.today_sales)
                            : '₹0',
                        color: '#F05A28',
                      },
                      {
                        label: 'Complaints',
                        value:
                          outlet.complaint_count > 0
                            ? String(outlet.complaint_count)
                            : 'None',
                        color:
                          outlet.complaint_count > 0 ? '#EF4444' : '#22C55E',
                      },
                      {
                        label: 'Checklists',
                        value: `${outlet.checklists_done}/${outlet.checklists_total}`,
                        color: 'var(--text-muted)',
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        style={{
                          background: 'var(--warm-white)',
                          borderRadius: 12,
                          padding: 12,
                          textAlign: 'center',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 800,
                            color: item.color,
                            fontFamily: 'var(--font-display)',
                            lineHeight: 1,
                            marginBottom: 4,
                          }}
                        >
                          {item.value}
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            fontWeight: 600,
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                          }}
                        >
                          {item.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: 16,
                      borderTop: '1px solid var(--border)',
                    }}
                  >
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {outlet.last_update ? 'Updated recently' : 'No updates today'}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--orange)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      View details →
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 0',
              color: 'var(--text-muted)',
              fontSize: 14,
            }}
          >
            No outlet data available
          </div>
        )}
      </div>
    </div>
  )
}
