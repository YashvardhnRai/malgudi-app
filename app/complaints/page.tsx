'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Filter,
  MapPin,
  MessageSquareWarning,
  PhoneCall,
  ShieldCheck,
  Store,
} from 'lucide-react'
import NavHeader from '@/app/components/NavHeader'
import WorkerDock from '@/app/components/WorkerDock'
import type { Complaint, Outlet } from '@/lib/types'

type FilterStatus = 'ALL' | 'OPEN' | 'RESOLVED' | 'HIGH'
type FilterCity = 'ALL' | 'Mumbai' | 'Delhi' | 'Dubai'

interface ComplaintWithMeta extends Complaint {
  outlet_name: string
  city: string
  manager_name: string | null
  manager_phone: string | null
}

const SEVERITY_META = {
  HIGH: {
    label: 'High priority',
    tone: 'danger',
    Icon: AlertTriangle,
  },
  MEDIUM: {
    label: 'Medium',
    tone: 'warning',
    Icon: CircleAlert,
  },
  LOW: {
    label: 'Low',
    tone: 'neutral',
    Icon: MessageSquareWarning,
  },
} as const

function timeAgo(dateStr: string): string {
  const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (!Number.isFinite(minutes) || minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hr ago`
  return `${Math.floor(minutes / 1440)} days ago`
}

function ComplaintCard({
  complaint,
  onResolve,
}: {
  complaint: ComplaintWithMeta
  onResolve: () => void
}) {
  const [resolving, setResolving] = useState(false)
  const severity = SEVERITY_META[complaint.severity]
  const SeverityIcon = severity.Icon

  async function handleResolve() {
    setResolving(true)
    await fetch(`/api/complaints/${complaint.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'RESOLVED' }),
    }).catch(() => {})
    setResolving(false)
    onResolve()
  }

  return (
    <article className={`complaint-card-premium ${severity.tone}`}>
      <div className="complaint-top">
        <span className={`complaint-severity ${severity.tone}`}>
          <SeverityIcon size={14} />
          {severity.label}
        </span>
        <span>{complaint.source} - {timeAgo(complaint.reported_at)}</span>
      </div>

      <h3 className="complaint-location">
        <MapPin size={18} />
        {complaint.outlet_name}{complaint.city ? `, ${complaint.city}` : ''}
      </h3>

      <p className="complaint-text">&ldquo;{complaint.complaint_text}&rdquo;</p>

      <div className="complaint-meta">
        <div className="complaint-manager">
          <span>Outlet manager</span>
          <strong>{complaint.manager_name || 'Not assigned'}</strong>
          {complaint.manager_phone && <small>{complaint.manager_phone}</small>}
        </div>

        <div className="complaint-actions">
          {complaint.manager_phone && complaint.status !== 'RESOLVED' && (
            <a href={`tel:${complaint.manager_phone}`} className="complaint-call">
              <PhoneCall size={15} />
              Call
            </a>
          )}
          {complaint.status !== 'RESOLVED' ? (
            <button
              type="button"
              onClick={handleResolve}
              disabled={resolving}
              className="complaint-resolve"
            >
              <CheckCircle2 size={15} />
              {resolving ? 'Resolving' : 'Resolve'}
            </button>
          ) : (
            <span className="complaint-resolved">
              <CheckCircle2 size={15} />
              Resolved
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<ComplaintWithMeta[]>([])
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL')
  const [filterCity, setFilterCity] = useState<FilterCity>('ALL')
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const [complaintsResponse, outletsResponse] = await Promise.all([
        fetch('/api/complaints').then((r) => r.json()),
        fetch('/api/outlets').then((r) => r.json()),
      ])
      const outletMap = Object.fromEntries(
        ((outletsResponse.outlets ?? []) as Outlet[]).map((outlet) => [outlet.id, outlet])
      )
      setComplaints(
        (complaintsResponse as Complaint[]).map((complaint) => ({
          ...complaint,
          outlet_name: outletMap[complaint.outlet_id]?.name ?? complaint.outlet_id,
          city: outletMap[complaint.outlet_id]?.city ?? '',
          manager_name: outletMap[complaint.outlet_id]?.manager_name ?? null,
          manager_phone: outletMap[complaint.outlet_id]?.manager_phone ?? null,
        }))
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void load()
    })
  }, [])

  const filtered = complaints.filter((complaint) => {
    if (filterStatus === 'OPEN' && complaint.status !== 'OPEN') return false
    if (filterStatus === 'RESOLVED' && complaint.status !== 'RESOLVED') return false
    if (filterStatus === 'HIGH' && complaint.severity !== 'HIGH') return false
    if (filterCity !== 'ALL' && complaint.city !== filterCity) return false
    return true
  })

  const openCount = complaints.filter((complaint) => complaint.status === 'OPEN').length
  const highCount = complaints.filter(
    (complaint) => complaint.severity === 'HIGH' && complaint.status === 'OPEN'
  ).length
  const resolvedCount = complaints.filter((complaint) => complaint.status === 'RESOLVED').length

  const cities = useMemo(() => {
    const known = new Set<FilterCity>(['Mumbai', 'Delhi', 'Dubai'])
    complaints.forEach((complaint) => {
      if (known.has(complaint.city as FilterCity)) known.add(complaint.city as FilterCity)
    })
    return ['ALL', ...Array.from(known)] as FilterCity[]
  }, [complaints])

  const statusFilters: { key: FilterStatus; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'OPEN', label: 'Open' },
    { key: 'RESOLVED', label: 'Resolved' },
    { key: 'HIGH', label: 'High priority' },
  ]

  return (
    <div className="complaints-page">
      <NavHeader userName="CEO" />

      <main className="complaints-main">
        <section className="complaints-hero">
          <div>
            <span className="complaints-kicker">
              <MessageSquareWarning size={14} />
              Guest recovery
            </span>
            <h1>Complaints command desk</h1>
            <p>
              Track open issues, call the right manager, and close the loop before
              customer pressure turns into operational noise.
            </p>
          </div>

          <div className="complaints-stat-grid">
            <div className="complaints-stat danger">
              <span>Open</span>
              <strong>{openCount}</strong>
            </div>
            <div className="complaints-stat warning">
              <span>High</span>
              <strong>{highCount}</strong>
            </div>
            <div className="complaints-stat success">
              <span>Resolved</span>
              <strong>{resolvedCount}</strong>
            </div>
          </div>
        </section>

        <section className="complaints-filter-panel">
          <div className="complaints-filter-title">
            <Filter size={16} />
            Filters
          </div>

          <div className="complaints-filter-row">
            {statusFilters.map((filter) => (
              <button
                type="button"
                key={filter.key}
                onClick={() => setFilterStatus(filter.key)}
                className={`complaints-filter ${filterStatus === filter.key ? 'selected' : ''}`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="complaints-filter-row">
            {cities.map((city) => (
              <button
                type="button"
                key={city}
                onClick={() => setFilterCity(city)}
                className={`complaints-filter city ${filterCity === city ? 'selected' : ''}`}
              >
                {city === 'ALL' ? 'All cities' : city}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <section className="complaint-list">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="complaints-skeleton" />
            ))}
          </section>
        ) : filtered.length === 0 ? (
          <section className="complaints-empty">
            <ShieldCheck size={34} />
            <strong>No complaints in this view</strong>
            <span>Try a different filter or enjoy the quiet while it lasts.</span>
          </section>
        ) : (
          <section className="complaint-list">
            {filtered.map((complaint) => (
              <ComplaintCard
                key={complaint.id}
                complaint={complaint}
                onResolve={load}
              />
            ))}
          </section>
        )}

        {!loading && complaints.length === 0 && (
          <section className="complaints-empty secondary">
            <Store size={30} />
            <strong>All outlets are calm</strong>
            <span>New Swiggy, Zomato, direct, and Google complaints will appear here.</span>
          </section>
        )}
        <div className="worker-dock-spacer" />
      </main>

      <WorkerDock />
    </div>
  )
}
