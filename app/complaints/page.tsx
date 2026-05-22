'use client'

import { useState, useEffect } from 'react'
import NavBar from '@/app/components/NavBar'
import type { Complaint, Outlet } from '@/lib/types'

type FilterStatus = 'ALL' | 'OPEN' | 'RESOLVED' | 'HIGH'
type FilterCity = 'ALL' | 'Mumbai' | 'Delhi' | 'Dubai'

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (diff < 60) return `${diff} min ago`
  if (diff < 1440) return `${Math.floor(diff / 60)} hr ago`
  return `${Math.floor(diff / 1440)} days ago`
}

const SOURCE_ICONS: Record<string, string> = {
  SWIGGY: '🧡',
  ZOMATO: '❤️',
  DIRECT: '📞',
  GOOGLE: '⭐',
}

const SEVERITY_LEFT_COLOR: Record<string, string> = {
  HIGH: '#EF4444',
  MEDIUM: '#F59E0B',
  LOW: '#E5E7EB',
}

const SEVERITY_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  HIGH: { bg: '#FEF2F2', text: '#991B1B', label: '🔴 HIGH PRIORITY' },
  MEDIUM: { bg: '#FFFBEB', text: '#92400E', label: '🟡 MEDIUM' },
  LOW: { bg: '#F9FAFB', text: '#6B7280', label: '⚪ LOW' },
}

interface ComplaintWithMeta extends Complaint {
  outlet_name: string
  city: string
  manager_name: string | null
  manager_phone: string | null
}

function ComplaintCard({
  complaint,
  onResolve,
}: {
  complaint: ComplaintWithMeta
  onResolve: () => void
}) {
  const [resolving, setResolving] = useState(false)
  const borderColor = SEVERITY_LEFT_COLOR[complaint.severity] ?? '#E5E7EB'
  const badge = SEVERITY_BADGE[complaint.severity] ?? SEVERITY_BADGE.LOW

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
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 12,
        padding: '20px 24px',
        borderLeft: `4px solid ${borderColor}`,
        boxShadow: '0 2px 8px rgba(27,43,94,0.08)',
        marginBottom: 12,
        border: '1px solid #E5E7EB',
        borderLeftWidth: 4,
        borderLeftColor: borderColor,
        borderLeftStyle: 'solid',
      }}
    >
      {/* Severity badge */}
      <span
        style={{
          background: badge.bg,
          color: badge.text,
          padding: '2px 10px',
          borderRadius: 100,
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        {badge.label}
      </span>

      {/* Outlet name */}
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: '#1B2B5E',
          marginTop: 10,
          marginBottom: 4,
        }}
      >
        📍 {complaint.outlet_name}, {complaint.city}
      </div>

      {/* Complaint text */}
      <div
        style={{
          fontSize: 15,
          color: '#374151',
          marginBottom: 10,
          fontStyle: 'italic',
          lineHeight: 1.5,
        }}
      >
        &ldquo;{complaint.complaint_text}&rdquo;
      </div>

      {/* Source and time */}
      <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 14 }}>
        {SOURCE_ICONS[complaint.source] ?? '📝'} via {complaint.source} · {timeAgo(complaint.reported_at)}
        {complaint.status === 'RESOLVED' && (
          <span style={{ color: '#22C55E', marginLeft: 8, fontWeight: 600 }}>· Resolved</span>
        )}
      </div>

      {/* Manager section */}
      {(complaint.manager_name || complaint.manager_phone) && (
        <div
          style={{
            background: '#F8F7F4',
            borderRadius: 8,
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                color: '#9CA3AF',
                textTransform: 'uppercase',
                letterSpacing: 1,
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              OUTLET MANAGER
            </div>
            {complaint.manager_name && (
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1B2B5E' }}>
                👤 {complaint.manager_name}
              </div>
            )}
            {complaint.manager_phone && (
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                {complaint.manager_phone}
              </div>
            )}
          </div>

          {complaint.status !== 'RESOLVED' && (
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {complaint.manager_phone && (
                <a
                  href={`tel:${complaint.manager_phone}`}
                  style={{
                    background: '#1B2B5E',
                    color: '#F4A623',
                    padding: '10px 16px',
                    borderRadius: 8,
                    textDecoration: 'none',
                    fontSize: 13,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  📞 Call
                </a>
              )}
              <button
                onClick={handleResolve}
                disabled={resolving}
                style={{
                  background: '#F0FDF4',
                  color: '#16A34A',
                  border: '1px solid #86EFAC',
                  padding: '10px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  opacity: resolving ? 0.5 : 1,
                }}
              >
                {resolving ? '...' : '✓ Resolved'}
              </button>
            </div>
          )}
        </div>
      )}

      {complaint.resolved_at && (
        <p className="text-xs mt-2" style={{ color: '#22C55E' }}>
          Resolved {timeAgo(complaint.resolved_at)}
        </p>
      )}
    </div>
  )
}

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<ComplaintWithMeta[]>([])
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL')
  const [filterCity, setFilterCity] = useState<FilterCity>('ALL')
  const [loading, setLoading] = useState(true)

  async function load() {
    const [cr, or] = await Promise.all([
      fetch('/api/complaints').then(r => r.json()),
      fetch('/api/outlets').then(r => r.json()),
    ])
    const outletMap = Object.fromEntries((or.outlets as Outlet[]).map((o: Outlet) => [o.id, o]))
    setComplaints((cr as Complaint[]).map(c => ({
      ...c,
      outlet_name: outletMap[c.outlet_id]?.name ?? c.outlet_id,
      city: outletMap[c.outlet_id]?.city ?? '',
      manager_name: outletMap[c.outlet_id]?.manager_name ?? null,
      manager_phone: outletMap[c.outlet_id]?.manager_phone ?? null,
    })))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = complaints.filter(c => {
    if (filterStatus === 'OPEN' && c.status !== 'OPEN') return false
    if (filterStatus === 'RESOLVED' && c.status !== 'RESOLVED') return false
    if (filterStatus === 'HIGH' && c.severity !== 'HIGH') return false
    if (filterCity !== 'ALL' && c.city !== filterCity) return false
    return true
  })

  const openCount = complaints.filter(c => c.status === 'OPEN').length
  const highCount = complaints.filter(c => c.severity === 'HIGH' && c.status === 'OPEN').length

  const statusFilters: { key: FilterStatus; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'OPEN', label: 'Open' },
    { key: 'RESOLVED', label: 'Resolved' },
    { key: 'HIGH', label: '🔴 High Priority' },
  ]

  const cityFilters: { key: FilterCity; label: string }[] = [
    { key: 'ALL', label: 'All Cities' },
    { key: 'Mumbai', label: 'Mumbai' },
    { key: 'Delhi', label: 'Delhi' },
    { key: 'Dubai', label: 'Dubai' },
  ]

  return (
    <div className="min-h-screen bg-app-bg">
      <NavBar role="CEO" alertCount={highCount} />

      <main className="max-w-2xl mx-auto px-4 py-5 pb-10">
        <div className="mb-5">
          <h1 className="text-2xl font-bold" style={{ color: '#1B2B5E' }}>Complaints</h1>
          <p className="text-sm text-gray-500 mt-1">
            {openCount} open · {complaints.length} total
          </p>
        </div>

        {/* Status filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-4 px-4 scrollbar-hide">
          {statusFilters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className="shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors"
              style={
                filterStatus === f.key
                  ? { backgroundColor: '#1B2B5E', color: '#FFFFFF' }
                  : { backgroundColor: '#FFFFFF', color: '#6B7280', border: '1px solid #E5E7EB' }
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* City filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-4 px-4 scrollbar-hide">
          {cityFilters.map(c => (
            <button
              key={c.key}
              onClick={() => setFilterCity(c.key)}
              className="shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors"
              style={
                filterCity === c.key
                  ? { backgroundColor: '#F4A623', color: '#1B2B5E' }
                  : { backgroundColor: '#FFFFFF', color: '#6B7280', border: '1px solid #E5E7EB' }
              }
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl h-48 animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-lg font-semibold" style={{ color: '#1B2B5E' }}>No complaints</p>
            <p className="text-sm text-gray-500 mt-1">All outlets are running smoothly!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(complaint => (
              <ComplaintCard
                key={complaint.id}
                complaint={complaint}
                onResolve={load}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
