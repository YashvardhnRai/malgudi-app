'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MessageSquareWarning,
  Send,
} from 'lucide-react'
import WorkerDock from '@/app/components/WorkerDock'
import type { Outlet } from '@/lib/types'

type AppRole = 'CEO' | 'MANAGER' | 'STAFF'
type Severity = 'LOW' | 'MEDIUM' | 'HIGH'
type Source = 'DIRECT' | 'SWIGGY' | 'ZOMATO' | 'GOOGLE'

export default function ReportIssueClient({
  actorRole,
  assignedOutletId,
}: {
  actorRole: AppRole
  assignedOutletId: string | null
}) {
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [outletId, setOutletId] = useState(assignedOutletId ?? '')
  const [source, setSource] = useState<Source>('DIRECT')
  const [severity, setSeverity] = useState<Severity>('MEDIUM')
  const [complaint, setComplaint] = useState('')
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/outlets')
      .then((response) => response.json())
      .then((payload: { outlets?: Outlet[] }) => {
        const nextOutlets = payload.outlets ?? []
        setOutlets(nextOutlets)
        if (!outletId && nextOutlets[0]) setOutletId(nextOutlets[0].id)
      })
      .catch(() => setError('Unable to load outlet access.'))
  }, [outletId])

  async function submit() {
    if (!outletId || complaint.trim().length < 5) return
    setState('saving')
    setError('')
    try {
      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: outletId,
          source,
          severity,
          complaint_text: complaint,
        }),
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(payload.error || 'Unable to save issue')
      setState('done')
      setComplaint('')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save issue')
      setState('error')
    }
  }

  const selectedOutlet = outlets.find((outlet) => outlet.id === outletId)

  return (
    <main className="report-page">
      <section className="report-shell">
        <header className="report-head">
          <Link href="/worker" aria-label="Back to worker home">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <span>
              <MessageSquareWarning size={14} />
              Restaurant issue
            </span>
            <h1>Report what needs attention</h1>
            <p>Record a guest complaint or operational issue while the details are fresh.</p>
          </div>
        </header>

        {state === 'done' ? (
          <section className="report-success">
            <CheckCircle2 size={34} />
            <h2>Issue recorded</h2>
            <p>The CEO desk can see it now. High-priority issues also create an alert.</p>
            <button type="button" onClick={() => setState('idle')}>
              Report another
            </button>
          </section>
        ) : (
          <section className="report-form">
            <label>
              <span>Outlet</span>
              <select
                value={outletId}
                onChange={(event) => setOutletId(event.target.value)}
                disabled={actorRole !== 'CEO'}
              >
                {outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name} - {outlet.city}
                  </option>
                ))}
              </select>
            </label>

            <div className="report-field">
              <span>Source</span>
              <div className="report-segments">
                {(['DIRECT', 'SWIGGY', 'ZOMATO', 'GOOGLE'] as Source[]).map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={source === item ? 'selected' : ''}
                    onClick={() => setSource(item)}
                  >
                    {item === 'DIRECT' ? 'Guest' : item[0] + item.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="report-field">
              <span>Priority</span>
              <div className="report-segments severity">
                {(['LOW', 'MEDIUM', 'HIGH'] as Severity[]).map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={`${severity === item ? 'selected' : ''} ${item.toLowerCase()}`}
                    onClick={() => setSeverity(item)}
                  >
                    {item[0] + item.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <label>
              <span>What happened?</span>
              <textarea
                rows={6}
                maxLength={1500}
                value={complaint}
                onChange={(event) => setComplaint(event.target.value)}
                placeholder="Write the guest feedback or operational problem..."
              />
              <small>{complaint.length}/1500</small>
            </label>

            {error && (
              <div className="report-error">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            <button
              type="button"
              className="report-submit"
              onClick={submit}
              disabled={!outletId || complaint.trim().length < 5 || state === 'saving'}
            >
              {state === 'saving' ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
              {state === 'saving' ? 'Saving issue' : 'Send to operations desk'}
            </button>
          </section>
        )}

        <div className="worker-dock-spacer" />
      </section>

      <WorkerDock
        outletId={outletId}
        managerPhone={selectedOutlet?.manager_phone}
      />
    </main>
  )
}
