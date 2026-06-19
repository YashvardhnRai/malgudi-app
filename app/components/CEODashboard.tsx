'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowUpRight,
  BellRing,
  Camera,
  CalendarDays,
  ClipboardCheck,
  Download,
  IndianRupee,
  LayoutDashboard,
  MapPin,
  PhoneCall,
  Radio,
  ShieldCheck,
  Sparkles,
  Store,
  Wifi,
  type LucideIcon,
} from 'lucide-react'
import NavHeader from '@/app/components/NavHeader'
import PhotoUpload from '@/app/components/PhotoUpload'
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client'
import type { DashboardSummary, OutletWithStatus } from '@/lib/types'
import {
  MANAGER_PRESENCE_CHANNEL,
  isFreshManagerPresence,
  type ManagerPresencePayload,
  type ManagerPresenceSummary,
} from '@/lib/presence'

function formatINR(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n}`
}

function getGreeting() {
  const ist = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
  )
  const h = ist.getHours()
  const text =
    h >= 5 && h < 12 ? 'Good morning' :
    h >= 12 && h < 17 ? 'Good afternoon' :
    h >= 17 && h < 21 ? 'Good evening' :
    'Good night'
  const date = ist.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Kolkata',
  })
  return { text, date }
}

function timeAgo(value: string | null) {
  if (!value) return 'Awaiting next update'
  const milliseconds = new Date(value).getTime()
  if (!Number.isFinite(milliseconds)) return value
  const minutes = Math.max(0, Math.floor((Date.now() - milliseconds) / 60_000))
  if (minutes < 1) return 'Updated just now'
  if (minutes < 60) return `Updated ${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Updated ${hours}h ago`
  return `Updated ${Math.floor(hours / 24)}d ago`
}

function cleanOperationalMessage(message: string) {
  return message.replace(/\s*\[slot:[^\]]+\]\[date:[^\]]+\]\s*$/, '')
}

const STATUS_STYLE: Record<
  OutletWithStatus['status'],
  { label: string; color: string; bg: string; border: string }
> = {
  GREEN: {
    label: 'Operational',
    color: '#087F5B',
    bg: '#E8F7EF',
    border: '#A7E3C1',
  },
  AMBER: {
    label: 'Watch closely',
    color: '#9A5B00',
    bg: '#FFF4D8',
    border: '#F6D58A',
  },
  RED: {
    label: 'Needs action',
    color: '#B42318',
    bg: '#FFF0EF',
    border: '#FFB4AD',
  },
}

type PresenceStateMap = Record<string, (ManagerPresencePayload & { presence_ref?: string })[]>

function getPresenceByOutlet(state: PresenceStateMap): Record<string, ManagerPresenceSummary> {
  const now = Date.now()
  const next: Record<string, ManagerPresenceSummary> = {}

  Object.values(state).flat().forEach((presence) => {
    if (!presence.outlet_id || !isFreshManagerPresence(presence, now)) return

    const existing = next[presence.outlet_id]
    const existingSeen = existing ? new Date(existing.last_seen_at).getTime() : 0
    const nextSeen = new Date(presence.last_seen_at).getTime()

    if (!existing || nextSeen >= existingSeen) {
      next[presence.outlet_id] = {
        ...presence,
        connections: (existing?.connections ?? 0) + 1,
      }
      return
    }

    existing.connections += 1
  })

  return next
}

type Metric = {
  label: string
  value: string
  detail: string
  icon: LucideIcon
  color: string
  tint: string
}

function MetricCard({ metric, index }: { metric: Metric; index: number }) {
  const Icon = metric.icon

  return (
    <div
      className="ops-metric"
      style={{
        animationDelay: `${90 + index * 70}ms`,
        borderColor: `${metric.color}24`,
      }}
    >
      <div className="ops-metric-top">
        <div
          className="ops-metric-icon"
          style={{ background: metric.tint, color: metric.color }}
        >
          <Icon size={18} strokeWidth={2.2} />
        </div>
        <span style={{ color: metric.color }}>{metric.label}</span>
      </div>
      <div className="ops-metric-value" style={{ color: metric.color }}>
        {metric.value}
      </div>
      <div className="ops-metric-detail">{metric.detail}</div>
    </div>
  )
}

function OutletCard({
  outlet,
  onOpen,
  onUpload,
  onReview,
  reviewOpen,
  presence,
}: {
  outlet: OutletWithStatus
  onOpen: () => void
  onUpload: () => void
  onReview: () => void
  reviewOpen: boolean
  presence?: ManagerPresenceSummary
}) {
  const status = STATUS_STYLE[outlet.status]

  return (
    <article
      className="ops-outlet"
      onClick={onOpen}
      style={{
        borderColor: status.border,
        boxShadow:
          outlet.status === 'RED'
            ? '0 18px 42px rgba(180, 35, 24, 0.12)'
            : '0 16px 36px rgba(28, 35, 66, 0.08)',
      }}
    >
      <div className="ops-outlet-status-bar" style={{ background: status.color }} />

      <div className="ops-outlet-header">
        <div>
          <div className="ops-outlet-name">{outlet.name}</div>
          <div className="ops-outlet-place">
            <MapPin size={13} />
            {outlet.city}
          </div>
          <div className={`ops-manager-presence ${presence ? 'online' : 'offline'}`}>
            <span />
            <strong>{presence ? `${presence.manager_name} online` : 'Manager offline'}</strong>
            <small>
              {presence
                ? presence.connections > 1
                  ? `${presence.connections} devices live`
                  : 'Live on app'
                : 'Not on manager app'}
            </small>
          </div>
        </div>
        <span
          className="ops-status-pill"
          style={{ background: status.bg, color: status.color, borderColor: status.border }}
        >
          {status.label}
        </span>
      </div>

      <div className="ops-outlet-grid">
        <div>
          <span>Sales</span>
          <strong style={{ color: '#E0522D' }}>
            {outlet.today_sales > 0 ? formatINR(outlet.today_sales) : '₹0'}
          </strong>
        </div>
        <div>
          <span>Complaints</span>
          <strong style={{ color: outlet.complaint_count > 0 ? '#B42318' : '#087F5B' }}>
            {outlet.complaint_count || 'None'}
          </strong>
        </div>
        <div>
          <span>Tasks</span>
          <strong>
            {outlet.checklists_done}/{outlet.checklists_total}
          </strong>
        </div>
      </div>

      <div className="ops-outlet-footer">
        <span>{timeAgo(outlet.last_update)}</span>
        <div className="ops-outlet-actions">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onUpload()
            }}
            aria-label={`Open upload for ${outlet.name}`}
          >
            <Camera size={15} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onReview()
            }}
            aria-label={`Toggle AI review for ${outlet.name}`}
          >
            <Sparkles size={15} />
          </button>
          <ArrowUpRight size={16} style={{ color: '#E0522D' }} />
        </div>
      </div>

      {reviewOpen && (
        <div className="ops-inline-review" onClick={(event) => event.stopPropagation()}>
          <PhotoUpload
            outletId={outlet.id}
            outletName={outlet.name}
            managerName={outlet.manager_name}
            managerPhone={outlet.manager_phone}
          />
        </div>
      )}
    </article>
  )
}

export default function CEODashboard({ userName }: { userName: string }) {
  const router = useRouter()
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reviewOutletId, setReviewOutletId] = useState<string | null>(null)
  const [presenceByOutlet, setPresenceByOutlet] = useState<Record<string, ManagerPresenceSummary>>({})
  const { text: greeting, date } = getGreeting()

  useEffect(() => {
    if (!isSupabaseConfigured) return
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: unknown, session: unknown) => {
        if (!session) router.push('/auth')
      }
    )
    return () => subscription.unsubscribe()
  }, [router])

  const loadDashboard = useCallback(async () => {
    try {
      const response = await fetch('/api/outlets', { cache: 'no-store' })
      const payload = (await response.json()) as DashboardSummary & { error?: string }
      if (!response.ok) throw new Error(payload.error || 'Operations data is unavailable')
      setData(payload)
      setLoadError('')
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Operations data is unavailable')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => void loadDashboard())
    const interval = window.setInterval(() => void loadDashboard(), 60_000)
    return () => window.clearInterval(interval)
  }, [loadDashboard])

  useEffect(() => {
    const runReminderCheck = async () => {
      if (document.visibilityState !== 'visible') return
      const response = await fetch('/api/check-uploads', { cache: 'no-store' }).catch(
        () => null
      )
      if (response?.ok) {
        const result = (await response.json()) as { reminders?: number }
        if (result.reminders) void loadDashboard()
      }
    }

    queueMicrotask(() => void runReminderCheck())
    const interval = window.setInterval(() => void runReminderCheck(), 10 * 60_000)
    return () => window.clearInterval(interval)
  }, [loadDashboard])

  useEffect(() => {
    if (!isSupabaseConfigured) return

    const supabase = createClient()
    const channel = supabase.channel(MANAGER_PRESENCE_CHANNEL, {
      config: {
        presence: {
          enabled: true,
        },
      },
    })

    function syncPresence() {
      setPresenceByOutlet(
        getPresenceByOutlet(channel.presenceState() as PresenceStateMap)
      )
    }

    channel
      .on('presence', { event: 'sync' }, syncPresence)
      .on('presence', { event: 'join' }, syncPresence)
      .on('presence', { event: 'leave' }, syncPresence)
      .subscribe()

    const intervalId = window.setInterval(syncPresence, 30_000)

    return () => {
      window.clearInterval(intervalId)
      void supabase.removeChannel(channel)
    }
  }, [])

  const urgentOutlets = useMemo(
    () => data?.outlets.filter((outlet) => outlet.status === 'RED') ?? [],
    [data]
  )
  const onlineManagers = useMemo(
    () => Object.values(presenceByOutlet).sort((a, b) => a.outlet_name.localeCompare(b.outlet_name)),
    [presenceByOutlet]
  )

  const metrics: Metric[] | null = data
    ? [
        {
          label: 'Sales Today',
          value: formatINR(data.total_sales),
          detail: 'Across every live outlet',
          icon: IndianRupee,
          color: '#E0522D',
          tint: '#FFF0E8',
        },
        {
          label: 'Open Issues',
          value: String(data.total_complaints),
          detail: data.total_complaints ? 'Needs owner attention' : 'No open complaints',
          icon: AlertTriangle,
          color: data.total_complaints ? '#B42318' : '#087F5B',
          tint: data.total_complaints ? '#FFF0EF' : '#E8F7EF',
        },
        {
          label: 'Compliance',
          value: `${data.compliance_rate}%`,
          detail: 'Scheduled checks completed',
          icon: ShieldCheck,
          color:
            data.compliance_rate >= 90
              ? '#087F5B'
              : data.compliance_rate >= 75
              ? '#9A5B00'
              : '#B42318',
          tint:
            data.compliance_rate >= 90
              ? '#E8F7EF'
              : data.compliance_rate >= 75
              ? '#FFF4D8'
              : '#FFF0EF',
        },
        {
          label: 'Photo Proof',
          value: String(data.photos_uploaded ?? 0),
          detail: 'Manager uploads today',
          icon: Camera,
          color: '#2B5F75',
          tint: '#E7F4F8',
        },
      ]
    : null

  return (
    <div className="ops-page">
      <NavHeader userName={userName} />

      <main className="ops-main">
        <section className="ops-hero">
          <div className="ops-hero-copy">
            <div className="ops-eyebrow">
              <LayoutDashboard size={14} />
              CEO command center
            </div>
            <h1>
              {greeting}, {userName}
            </h1>
            <p>
              {date} · Live view of sales, compliance, photo proof, and complaint
              pressure across Malgudi operations.
            </p>
            <div className="ops-hero-actions">
              <Link href="/reports/daily">
                <CalendarDays size={16} />
                Daily report
              </Link>
              <a href="/api/reports/daily?format=csv">
                <Download size={16} />
                Excel export
              </a>
            </div>
          </div>

          <div className="ops-hero-panel">
            <div className="ops-hero-panel-row">
              <span>Operational pulse</span>
              <strong>{loading ? 'Loading' : urgentOutlets.length ? 'Action needed' : 'Stable'}</strong>
            </div>
            <div className="ops-pulse-ring">
              <span>{loading ? '-' : data?.outlets.length ?? 0}</span>
              <small>outlets</small>
            </div>
            <div className="ops-hero-panel-row">
              <span>Critical locations</span>
              <strong>{loading ? '-' : urgentOutlets.length}</strong>
            </div>
            <div className="ops-hero-panel-row">
              <span>Managers online</span>
              <strong>{onlineManagers.length}</strong>
            </div>
          </div>
        </section>

        <section className="ops-metrics-grid" aria-label="Operations metrics">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="ops-metric skeleton" style={{ minHeight: 158 }} />
              ))
            : metrics?.map((metric, index) => (
                <MetricCard key={metric.label} metric={metric} index={index} />
              ))}
        </section>

        {loadError && (
          <section className="ops-data-error" role="alert">
            <AlertTriangle size={18} />
            <div>
              <strong>Live operations data is unavailable</strong>
              <span>{loadError}</span>
            </div>
            <button type="button" onClick={() => void loadDashboard()}>
              Retry
            </button>
          </section>
        )}

        <section className={`ops-live-strip ${onlineManagers.length ? 'has-online' : ''}`}>
          <div className="ops-live-heading">
            <span>
              {onlineManagers.length ? <Wifi size={17} /> : <Radio size={17} />}
              Manager presence
            </span>
            <strong>
              {onlineManagers.length
                ? `${onlineManagers.length} online now`
                : 'No managers online'}
            </strong>
          </div>

          {onlineManagers.length ? (
            <div className="ops-live-list">
              {onlineManagers.slice(0, 6).map((presence) => (
                <div key={presence.outlet_id} className="ops-live-card">
                  <span />
                  <div>
                    <strong>{presence.manager_name}</strong>
                    <small>{presence.outlet_name} - {presence.outlet_city || 'Outlet'}</small>
                  </div>
                  {presence.manager_phone && (
                    <a href={`tel:${presence.manager_phone}`} onClick={(event) => event.stopPropagation()}>
                      <PhoneCall size={14} />
                      Call
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p>Managers appear here the moment they open their shift board.</p>
          )}
        </section>

        {data && data.alerts.length > 0 && (
          <section className="ops-alert-strip">
            <div className="ops-alert-heading">
              <BellRing size={18} />
              <span>{data.alerts.length} alert{data.alerts.length > 1 ? 's' : ''} require attention</span>
            </div>
            <div className="ops-alert-list">
              {data.alerts.slice(0, 4).map((alert) => {
                const outlet = alert.outlet_id
                  ? data.outlets.find((item) => item.id === alert.outlet_id)
                  : null
                return (
                  <div key={alert.id} className="ops-alert-item">
                    <span>
                      {outlet ? `${outlet.name}: ` : ''}
                      {cleanOperationalMessage(alert.message)}
                    </span>
                    {outlet?.manager_phone && (
                      <a href={`tel:${outlet.manager_phone}`} aria-label={`Call ${outlet.name} manager`}>
                        <PhoneCall size={14} />
                        Call
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <section className="ops-section-head">
          <div>
            <span>Outlet Control</span>
            <h2>Every location, ranked by attention</h2>
          </div>
          <div className="ops-section-summary">
            <Store size={16} />
            {loading ? 'Loading outlets' : `${data?.outlets.length ?? 0} active outlets`}
          </div>
        </section>

        {loading ? (
          <section className="ops-outlet-grid-wrap">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="ops-outlet skeleton" style={{ minHeight: 258 }} />
            ))}
          </section>
        ) : data && data.outlets.length > 0 ? (
          <section className="ops-outlet-grid-wrap">
            {data.outlets.map((outlet) => (
              <OutletCard
                key={outlet.id}
                outlet={outlet}
                presence={presenceByOutlet[outlet.id]}
                reviewOpen={reviewOutletId === outlet.id}
                onOpen={() => router.push(`/outlet/${outlet.id}`)}
                onUpload={() => router.push(`/manager/${outlet.id}`)}
                onReview={() =>
                  setReviewOutletId(reviewOutletId === outlet.id ? null : outlet.id)
                }
              />
            ))}
          </section>
        ) : (
          <div className="ops-empty">
            <ClipboardCheck size={28} />
            <strong>No outlet data available</strong>
            <span>Connect Supabase seed data or use demo fallback data.</span>
          </div>
        )}
      </main>
    </div>
  )
}
