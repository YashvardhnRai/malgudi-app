'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import NavBar from '@/app/components/NavBar'
import PhotoGrid from '@/app/components/PhotoGrid'
import SalesWidget from '@/app/components/SalesWidget'
import ComplianceBar from '@/app/components/ComplianceBar'
import StatusBadge from '@/app/components/StatusBadge'
import type { OutletDetail, ChecklistSubmission } from '@/lib/types'

interface Props { id: string }

type Tab = 'overview' | 'photos' | 'checklists' | 'complaints' | 'sales'

const CHECKLIST_LABELS: Record<string, string> = {
  OPENING: 'Opening', BANMARIE: 'Banmarie', CLEANLINESS: 'Cleanliness', CLOSING: 'Closing',
}

const CHECKLIST_ICONS: Record<string, string> = {
  OPENING: '🌅', BANMARIE: '🥘', CLEANLINESS: '✨', CLOSING: '🔒',
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (diff < 60) return `${diff} min ago`
  if (diff < 1440) return `${Math.floor(diff / 60)} hr ago`
  return `${Math.floor(diff / 1440)} days ago`
}

function formatSales(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n}`
}

function MiniStatCard({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 12,
      padding: '14px 10px',
      textAlign: 'center',
      boxShadow: '0 2px 8px rgba(27,43,94,0.08)',
    }}>
      <p style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1.2 }}>{value}</p>
      <p style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>{label}</p>
    </div>
  )
}

function OverviewTab({ data }: { data: OutletDetail }) {
  const { checklists, photos, sales, complaints } = data

  const submitted = checklists.filter(c => c.status === 'SUBMITTED').length
  const compliance = checklists.length > 0 ? Math.round((submitted / checklists.length) * 100) : 0

  return (
    <div>
      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <MiniStatCard
          value={sales ? formatSales(sales.total_sales) : '—'}
          label="Sales Today"
          color="#F4A623"
        />
        <MiniStatCard
          value={String(complaints.length)}
          label="Complaints"
          color={complaints.length > 0 ? '#EF4444' : '#22C55E'}
        />
        <MiniStatCard
          value={`${compliance}%`}
          label="Compliance"
          color={compliance >= 90 ? '#22C55E' : compliance >= 75 ? '#F59E0B' : '#EF4444'}
        />
        <MiniStatCard value={String(photos.length)} label="Photos" color="#1B2B5E" />
      </div>

      {/* Checklist status */}
      <h3 style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        Checklist Status
      </h3>
      <div className="grid grid-cols-4 gap-2 mb-6">
        {(['OPENING', 'BANMARIE', 'CLEANLINESS', 'CLOSING'] as const).map(type => {
          const related = checklists.filter(s => s.checklist_type === type)
          const latest = [...related].sort((a, b) => b.submission_time.localeCompare(a.submission_time))[0]
          const status = latest?.status ?? null
          const timeLabel = latest
            ? new Date(latest.submission_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
            : 'Not submitted'
          const statusIcon = status === 'SUBMITTED' ? '✅' : status === 'LATE' ? '⏳' : status === 'MISSED' ? '❌' : '⏳'
          const borderColor = status === 'SUBMITTED' ? '#86EFAC' : status === 'LATE' ? '#FDE68A' : status === 'MISSED' ? '#FCA5A5' : '#E5E7EB'

          return (
            <div key={type} style={{ background: 'white', borderRadius: 12, padding: '12px 8px', textAlign: 'center', border: `2px solid ${borderColor}` }}>
              <p style={{ fontSize: 20, marginBottom: 4 }}>{CHECKLIST_ICONS[type]}</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{CHECKLIST_LABELS[type]}</p>
              <p style={{ fontSize: 18, margin: '4px 0' }}>{statusIcon}</p>
              <p style={{ fontSize: 10, color: '#9CA3AF' }}>{timeLabel}</p>
              {related.length > 1 && (
                <p style={{ fontSize: 10, color: '#9CA3AF' }}>{related.length} updates</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Recent activity */}
      <h3 style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
        Recent Activity
      </h3>
      <div style={{ background: 'white', borderRadius: 12, padding: '0 16px', boxShadow: '0 2px 8px rgba(27,43,94,0.08)' }}>
        {checklists.length === 0 ? (
          <p style={{ padding: '16px 0', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>No activity yet today</p>
        ) : (
          [...checklists]
            .sort((a, b) => b.submission_time.localeCompare(a.submission_time))
            .slice(0, 6)
            .map((c, i, arr) => (
              <div key={c.id} style={{ padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid #F3F4F6' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 18 }}>{CHECKLIST_ICONS[c.checklist_type] ?? '📋'}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                    {CHECKLIST_LABELS[c.checklist_type] ?? c.checklist_type} {c.status === 'SUBMITTED' ? 'completed' : c.status.toLowerCase()}
                  </p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                    {new Date(c.submission_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </p>
                </div>
                <StatusBadge status={c.status} className="text-[10px]" />
              </div>
            ))
        )}
      </div>
    </div>
  )
}

function PhotosTab({ photos }: { photos: OutletDetail['photos'] }) {
  const byCategory = photos.reduce<Record<string, typeof photos>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {})

  if (photos.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '56px 0' }}>
        <p style={{ fontSize: 40, marginBottom: 12 }}>📷</p>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#1B2B5E' }}>No photos today</p>
        <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>Photos uploaded by the manager will appear here</p>
      </div>
    )
  }

  return (
    <div>
      {Object.entries(byCategory).map(([cat, catPhotos]) => (
        <div key={cat} style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>
            {cat.replace(/_/g, ' ')}
          </p>
          <PhotoGrid photos={catPhotos} />
        </div>
      ))}
    </div>
  )
}

function ChecklistsTab({ checklists }: { checklists: ChecklistSubmission[] }) {
  const byType: Record<string, ChecklistSubmission[]> = {
    OPENING: [], BANMARIE: [], CLEANLINESS: [], CLOSING: [],
  }
  checklists.forEach(c => {
    if (byType[c.checklist_type]) byType[c.checklist_type].push(c)
  })

  return (
    <div>
      {(Object.entries(byType) as [string, ChecklistSubmission[]][]).map(([type, items]) => (
        <div key={type} style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>{CHECKLIST_ICONS[type]}</span>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1B2B5E' }}>{CHECKLIST_LABELS[type]}</h3>
          </div>
          {items.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 10, padding: '12px 16px', border: '1px solid #E5E7EB' }}>
              <p style={{ fontSize: 13, color: '#9CA3AF' }}>Not submitted today</p>
            </div>
          ) : (
            [...items]
              .sort((a, b) => b.submission_time.localeCompare(a.submission_time))
              .map((item, i) => (
                <div
                  key={item.id}
                  style={{
                    background: 'white',
                    borderRadius: 10,
                    padding: '12px 16px',
                    border: '1px solid #E5E7EB',
                    marginBottom: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                      Update {items.length - i}
                    </p>
                    <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                      {new Date(item.submission_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                    {item.notes && (
                      <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4, fontStyle: 'italic' }}>{item.notes}</p>
                    )}
                  </div>
                  <StatusBadge status={item.status} className="text-[10px]" />
                </div>
              ))
          )}
        </div>
      ))}
    </div>
  )
}

function ComplaintsTab({ complaints, managerPhone }: { complaints: OutletDetail['complaints']; managerPhone: string | null }) {
  const SEVERITY_COLOR: Record<string, string> = {
    HIGH: '#EF4444', MEDIUM: '#F59E0B', LOW: '#E5E7EB',
  }

  if (complaints.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '56px 0' }}>
        <p style={{ fontSize: 40, marginBottom: 12 }}>🎉</p>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#1B2B5E' }}>No complaints</p>
        <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>This outlet is running smoothly!</p>
      </div>
    )
  }

  return (
    <div>
      {complaints.map((c, i) => (
        <div
          key={c.id ?? i}
          style={{
            background: 'white',
            borderRadius: 12,
            padding: '16px 20px',
            borderLeft: `4px solid ${SEVERITY_COLOR[c.severity] ?? '#E5E7EB'}`,
            boxShadow: '0 2px 8px rgba(27,43,94,0.08)',
            marginBottom: 12,
            border: '1px solid #E5E7EB',
            borderLeftWidth: 4,
            borderLeftColor: SEVERITY_COLOR[c.severity] ?? '#E5E7EB',
            borderLeftStyle: 'solid',
          }}
        >
          <span style={{
            background: c.severity === 'HIGH' ? '#FEF2F2' : '#FFFBEB',
            color: c.severity === 'HIGH' ? '#DC2626' : '#D97706',
            padding: '2px 10px',
            borderRadius: 100,
            fontSize: 11,
            fontWeight: 700,
          }}>
            {c.severity} PRIORITY
          </span>
          <p style={{ fontSize: 14, color: '#374151', marginTop: 10, marginBottom: 8, fontStyle: 'italic', lineHeight: 1.5 }}>
            &ldquo;{c.complaint_text}&rdquo;
          </p>
          <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>
            via {c.source} · {timeAgo(c.reported_at)}
          </p>

          {managerPhone && c.status !== 'RESOLVED' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <a
                href={`tel:${managerPhone}`}
                style={{
                  background: '#1B2B5E',
                  color: '#F4A623',
                  padding: '8px 16px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                📞 Call Manager
              </a>
              <StatusBadge status={c.status as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'} className="text-[10px]" />
            </div>
          )}
          {c.status === 'RESOLVED' && (
            <span style={{ fontSize: 12, color: '#22C55E', fontWeight: 600 }}>✓ Resolved</span>
          )}
        </div>
      ))}
    </div>
  )
}

function SalesTab({ sales, complianceHistory }: { sales: OutletDetail['sales']; complianceHistory: OutletDetail['compliance_history'] }) {
  if (!sales) {
    return (
      <div style={{ textAlign: 'center', padding: '56px 0' }}>
        <p style={{ fontSize: 40, marginBottom: 12 }}>📊</p>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#1B2B5E' }}>No sales data today</p>
      </div>
    )
  }

  return (
    <div>
      <SalesWidget
        totalSales={sales.total_sales}
        dineIn={sales.dine_in_orders * 300}
        swiggy={sales.swiggy_orders * 250}
        zomato={sales.zomato_orders * 250}
        coversCount={sales.covers_count}
      />
      <div style={{ marginTop: 20 }}>
        <ComplianceBar data={complianceHistory} />
      </div>
    </div>
  )
}

export default function OutletDetailClient({ id }: Props) {
  const [data, setData] = useState<OutletDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  useEffect(() => {
    fetch(`/api/outlets/${id}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [id])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'photos', label: 'Photos' },
    { key: 'checklists', label: 'Checklists' },
    { key: 'complaints', label: 'Complaints' },
    { key: 'sales', label: 'Sales' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F0EDE8' }}>
        <NavBar role="CEO" />
        <div style={{ background: 'linear-gradient(135deg, #1B2B5E 0%, #243870 100%)', height: 160 }} />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-20 animate-pulse border border-gray-100" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F0EDE8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🏪</p>
          <p style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>Outlet not found</p>
          <Link href="/" style={{ color: '#F4A623', fontSize: 14, fontWeight: 500, display: 'block', marginTop: 8 }}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const { outlet, checklists, photos, sales, complaints, compliance_history } = data

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F0EDE8' }}>
      <NavBar role="CEO" />

      {/* Navy header */}
      <div style={{
        background: 'linear-gradient(135deg, #1B2B5E 0%, #243870 100%)',
        padding: '24px 0 0',
      }}>
        <div className="max-w-2xl mx-auto px-4">
          {/* Back link */}
          <Link
            href="/"
            style={{
              color: 'rgba(255,255,255,0.65)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 13,
              textDecoration: 'none',
              marginBottom: 14,
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All Outlets
          </Link>

          {/* Outlet name */}
          <h1 style={{
            color: '#F4A623',
            fontSize: 28,
            fontWeight: 900,
            letterSpacing: 1,
            textTransform: 'uppercase',
            lineHeight: 1.1,
          }}>
            {outlet.name}
          </h1>

          {/* Sub info */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 20 }}>
            <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>
              {outlet.city}
            </span>
            {outlet.manager_name && (
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>
                Manager: {outlet.manager_name}
              </span>
            )}
            {outlet.manager_phone && (
              <a
                href={`tel:${outlet.manager_phone}`}
                style={{ color: '#F4A623', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}
              >
                📞 {outlet.manager_phone}
              </a>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0 }}>
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: activeTab === tab.key ? 700 : 500,
                  color: activeTab === tab.key ? '#F4A623' : 'rgba(255,255,255,0.55)',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab.key ? '2px solid #F4A623' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <main className="max-w-2xl mx-auto px-4 py-6 pb-10">
        {activeTab === 'overview' && <OverviewTab data={data} />}
        {activeTab === 'photos' && <PhotosTab photos={photos} />}
        {activeTab === 'checklists' && <ChecklistsTab checklists={checklists} />}
        {activeTab === 'complaints' && (
          <ComplaintsTab
            complaints={complaints}
            managerPhone={outlet.manager_phone ?? null}
          />
        )}
        {activeTab === 'sales' && (
          <SalesTab sales={sales} complianceHistory={compliance_history} />
        )}
      </main>
    </div>
  )
}
