'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  CalendarDays,
  Camera,
  Download,
  IndianRupee,
  Printer,
  RefreshCw,
  ShieldCheck,
  Store,
  Trash2,
  Users,
} from 'lucide-react'

type DailyOutletReport = {
  outlet_id: string
  outlet_name: string
  city: string
  manager_name: string | null
  manager_phone: string | null
  sales: number
  covers: number
  compliance_rate: number
  checks_done: number
  checks_expected: number
  counter_rounds_done: number
  counter_rounds_expected: number
  latest_temperatures: string[]
  photos: number
  flagged_photos: number
  complaints: number
  high_complaints: number
  unread_alerts: number
  attendance_checked_in: number
  attendance_checked_out: number
  wastage_qty: number
  top_wastage_items: string[]
  status: 'GREEN' | 'AMBER' | 'RED'
}

type DailyReport = {
  date: string
  generated_at: string
  pending_migration: string[]
  totals: {
    outlets: number
    sales: number
    covers: number
    compliance_rate: number
    photos: number
    complaints: number
    high_complaints: number
    unread_alerts: number
    managers_checked_in: number
    wastage_qty: number
  }
  outlets: DailyOutletReport[]
}

function istDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return `${year}-${month}-${day}`
}

function formatMoney(value: number) {
  if (value >= 100000) return `Rs ${(value / 100000).toFixed(1)}L`
  if (value >= 1000) return `Rs ${(value / 1000).toFixed(0)}K`
  return `Rs ${Math.round(value)}`
}

function statusLabel(status: DailyOutletReport['status']) {
  if (status === 'GREEN') return 'Stable'
  if (status === 'AMBER') return 'Watch'
  return 'Action'
}

export default function DailyReportClient({ userName }: { userName: string }) {
  const [date, setDate] = useState(istDate)
  const [report, setReport] = useState<DailyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const csvUrl = useMemo(
    () => `/api/reports/daily?date=${encodeURIComponent(date)}&format=csv`,
    [date]
  )

  const loadReport = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/reports/daily?date=${encodeURIComponent(date)}`, {
        cache: 'no-store',
      })
      const payload = (await response.json()) as DailyReport & { error?: string }
      if (!response.ok) throw new Error(payload.error || 'Unable to load report')
      setReport(payload)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load report')
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    queueMicrotask(() => void loadReport())
  }, [loadReport])

  const topIssues = report?.outlets
    .filter((outlet) => outlet.status !== 'GREEN')
    .sort((a, b) => {
      const rank = { RED: 2, AMBER: 1, GREEN: 0 }
      return rank[b.status] - rank[a.status]
    })
    .slice(0, 4)

  return (
    <main className="daily-report-page">
      <section className="daily-report-shell">
        <header className="daily-report-hero">
          <div>
            <Link href="/dashboard" className="daily-report-back">
              Back to dashboard
            </Link>
            <span>
              <CalendarDays size={14} />
              Owner daily report
            </span>
            <h1>{userName}, this is the day sheet.</h1>
            <p>
              Sales, proof checks, attendance, complaints, and wastage in one
              printable report for restaurant review.
            </p>
          </div>

          <div className="daily-report-actions no-print">
            <label>
              <span>Date</span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <button type="button" onClick={() => void loadReport()} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'spin' : ''} />
              Refresh
            </button>
            <a href={csvUrl} download={`malgudi-daily-${date}.csv`}>
              <Download size={16} />
              Download Excel
            </a>
            <button type="button" onClick={() => window.print()}>
              <Printer size={16} />
              Save PDF
            </button>
          </div>
        </header>

        {error && (
          <section className="daily-report-error" role="alert">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </section>
        )}

        {report?.pending_migration.length ? (
          <section className="daily-report-warning">
            <AlertTriangle size={18} />
            <span>
              Attendance/inventory tables are pending migration:{' '}
              {report.pending_migration.join(', ')}.
            </span>
          </section>
        ) : null}

        <section className="daily-report-metrics">
          <div>
            <IndianRupee size={18} />
            <span>Sales</span>
            <strong>{loading ? '-' : formatMoney(report?.totals.sales ?? 0)}</strong>
          </div>
          <div>
            <ShieldCheck size={18} />
            <span>Compliance</span>
            <strong>{loading ? '-' : `${report?.totals.compliance_rate ?? 0}%`}</strong>
          </div>
          <div>
            <Camera size={18} />
            <span>Photos</span>
            <strong>{loading ? '-' : report?.totals.photos ?? 0}</strong>
          </div>
          <div>
            <Users size={18} />
            <span>Checked in</span>
            <strong>{loading ? '-' : report?.totals.managers_checked_in ?? 0}</strong>
          </div>
          <div>
            <Trash2 size={18} />
            <span>Wastage</span>
            <strong>{loading ? '-' : report?.totals.wastage_qty ?? 0}</strong>
          </div>
        </section>

        {topIssues && topIssues.length > 0 && (
          <section className="daily-report-issues">
            <div className="daily-report-section-head">
              <span>Owner attention</span>
              <h2>What needs follow-up</h2>
            </div>
            <div className="daily-report-issue-list">
              {topIssues.map((outlet) => (
                <article key={outlet.outlet_id}>
                  <strong>{outlet.outlet_name}</strong>
                  <span className={`daily-report-status ${outlet.status.toLowerCase()}`}>
                    {statusLabel(outlet.status)}
                  </span>
                  <p>
                    {outlet.compliance_rate}% compliance, {outlet.complaints} complaints,{' '}
                    {outlet.unread_alerts} unread alerts.
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="daily-report-table-wrap">
          <div className="daily-report-section-head">
            <span>Outlets</span>
            <h2>Daily operating table</h2>
          </div>

          <div className="daily-report-table">
            <div className="daily-report-row head">
              <span>Outlet</span>
              <span>Status</span>
              <span>Sales</span>
              <span>Checks</span>
              <span>Photos</span>
              <span>Issues</span>
              <span>Attendance</span>
              <span>Wastage</span>
            </div>
            {loading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <div className="daily-report-row skeleton" key={index} />
                ))
              : report?.outlets.map((outlet) => (
                  <div className="daily-report-row" key={outlet.outlet_id}>
                    <span>
                      <strong>{outlet.outlet_name}</strong>
                      <small>
                        <Store size={12} />
                        {outlet.city}
                      </small>
                    </span>
                    <span className={`daily-report-status ${outlet.status.toLowerCase()}`}>
                      {statusLabel(outlet.status)}
                    </span>
                    <span>{formatMoney(outlet.sales)}</span>
                    <span>
                      {outlet.checks_done}/{outlet.checks_expected} ({outlet.compliance_rate}%)
                      <small>
                        Counter {outlet.counter_rounds_done}/{outlet.counter_rounds_expected}
                      </small>
                    </span>
                    <span>
                      {outlet.photos}
                      {outlet.flagged_photos ? ` / ${outlet.flagged_photos} flagged` : ''}
                    </span>
                    <span>
                      {outlet.complaints}
                      {outlet.high_complaints ? ` / ${outlet.high_complaints} high` : ''}
                    </span>
                    <span>
                      {outlet.attendance_checked_in} in / {outlet.attendance_checked_out} out
                    </span>
                    <span>
                      {outlet.wastage_qty}
                      {outlet.latest_temperatures.length ? (
                        <small>{outlet.latest_temperatures.join(', ')}</small>
                      ) : null}
                      {outlet.top_wastage_items.length ? (
                        <small>{outlet.top_wastage_items.join(', ')}</small>
                      ) : null}
                    </span>
                  </div>
                ))}
          </div>
        </section>
      </section>
    </main>
  )
}
