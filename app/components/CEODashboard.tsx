'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowUpRight,
  BellRing,
  Camera,
  ClipboardCheck,
  IndianRupee,
  LayoutDashboard,
  MapPin,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Store,
  type LucideIcon,
} from 'lucide-react'
import NavHeader from '@/app/components/NavHeader'
import PhotoUpload from '@/app/components/PhotoUpload'
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client'
import type { DashboardSummary, OutletWithStatus } from '@/lib/types'

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
}: {
  outlet: OutletWithStatus
  onOpen: () => void
  onUpload: () => void
  onReview: () => void
  reviewOpen: boolean
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
        <span>{outlet.last_update || 'Awaiting next update'}</span>
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
  const [reviewOutletId, setReviewOutletId] = useState<string | null>(null)
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

  useEffect(() => {
    fetch('/api/outlets')
      .then((r) => r.json())
      .then((d: DashboardSummary) => setData(d))
      .finally(() => setLoading(false))
  }, [])

  const urgentOutlets = useMemo(
    () => data?.outlets.filter((outlet) => outlet.status === 'RED') ?? [],
    [data]
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
                    <span>{outlet ? `${outlet.name}: ` : ''}{alert.message}</span>
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
