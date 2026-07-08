'use client'

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Banknote,
  Camera,
  CheckCircle2,
  ChevronDown,
  FileText,
  Loader2,
  RefreshCw,
  Save,
  WalletCards,
} from 'lucide-react'
import { compressPhotoForUpload } from '@/lib/photo-upload-client'
import type { CashClosing, OutletWithStatus } from '@/lib/types'

const EDIT_FIELDS = [
  ['opening_cash_balance', 'Opening cash'],
  ['cash_sales_as_per_pos', 'POS cash sales'],
  ['upi_sales', 'UPI sales'],
  ['card_sales', 'Card sales'],
  ['aggregator_sales', 'Aggregator sales'],
  ['cash_expenses', 'Cash expenses'],
  ['cash_deposited_or_handed_over', 'Deposited / handed'],
  ['physical_cash_counted', 'Physical counted'],
] as const

const STATUS_LABEL = {
  balanced: 'Balanced',
  shortage: 'Shortage',
  excess: 'Excess',
  needs_review: 'Needs review',
} as const

function istDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function money(value: number) {
  return `Rs ${Math.abs(Number(value)).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function time(value: string) {
  return new Date(value).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  })
}

function CashClosingEditor({
  closing,
  onSaved,
}: {
  closing: CashClosing
  onSaved: (closing: CashClosing) => void
}) {
  const [values, setValues] = useState(() => Object.fromEntries(
    EDIT_FIELDS.map(([key]) => [key, String(closing[key])])
  ) as Record<(typeof EDIT_FIELDS)[number][0], string>)
  const [countedBy, setCountedBy] = useState(closing.counted_by)
  const [verifiedBy, setVerifiedBy] = useState(closing.verified_by ?? '')
  const [notes, setNotes] = useState(closing.notes ?? '')
  const [proofPhoto, setProofPhoto] = useState<File | null>(null)
  const [posPhoto, setPosPhoto] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setSaving(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('id', closing.id)
      for (const [key] of EDIT_FIELDS) formData.append(key, values[key])
      formData.append('counted_by', countedBy)
      formData.append('verified_by', verifiedBy)
      formData.append('notes', notes)
      if (proofPhoto) formData.append('proof_photo', await compressPhotoForUpload(proofPhoto))
      if (posPhoto) {
        formData.append('pos_closing_report_photo', await compressPhotoForUpload(posPhoto))
      }
      const response = await fetch('/api/cash-closings', { method: 'PATCH', body: formData })
      const payload = (await response.json()) as { closing?: CashClosing; error?: string }
      if (!response.ok || !payload.closing) throw new Error(payload.error || 'Review could not be saved')
      onSaved(payload.closing)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Review could not be saved')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="cash-admin-editor">
      <div className="cash-admin-edit-grid">
        {EDIT_FIELDS.map(([key, label]) => (
          <label key={key}><span>{label}</span><div><b>Rs</b><input type="number" min="0" step="0.01" inputMode="decimal" value={values[key]} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} /></div></label>
        ))}
      </div>
      <div className="cash-admin-people-edit">
        <label><span>Counted by</span><input value={countedBy} onChange={(event) => setCountedBy(event.target.value)} /></label>
        <label><span>Verified by</span><input value={verifiedBy} onChange={(event) => setVerifiedBy(event.target.value)} placeholder="Enter verifier name" /></label>
      </div>
      <label className="cash-admin-note"><span>Review notes</span><textarea rows={2} maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      <div className="cash-admin-replace-proofs">
        <label><input type="file" accept="image/*" onChange={(event) => setProofPhoto(event.target.files?.[0] ?? null)} /><Camera size={15} />{proofPhoto?.name || 'Replace cash proof'}</label>
        <label><input type="file" accept="image/*" onChange={(event) => setPosPhoto(event.target.files?.[0] ?? null)} /><FileText size={15} />{posPhoto?.name || 'Replace POS report'}</label>
      </div>
      {error && <div className="cash-admin-error"><AlertTriangle size={16} />{error}</div>}
      <button type="button" className="cash-admin-save" disabled={saving} onClick={() => void save()}>
        {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
        {saving ? 'Saving review' : 'Save review'}
      </button>
    </div>
  )
}

export default function CashClosingOverview({ outlets }: { outlets: OutletWithStatus[] }) {
  const [closings, setClosings] = useState<CashClosing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/cash-closings?date=${istDate()}`, { cache: 'no-store' })
      const payload = (await response.json()) as { closings?: CashClosing[]; error?: string }
      if (!response.ok) throw new Error(payload.error || 'Cash closings are unavailable')
      setClosings(payload.closings ?? [])
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Cash closings are unavailable')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => void load())
  }, [load])

  const summary = useMemo(() => ({
    submitted: closings.length,
    balanced: closings.filter((closing) => closing.status === 'balanced').length,
    attention: closings.filter((closing) => closing.status !== 'balanced').length,
  }), [closings])

  return (
    <section className="cash-admin-section" aria-labelledby="cash-admin-title">
      <header className="cash-admin-head">
        <div>
          <span><WalletCards size={15} /> End-of-day cash control</span>
          <h2 id="cash-admin-title">Daily cash closing</h2>
          <p>Expected drawer cash, physical count, variance, proof, and verification for every outlet.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} aria-label="Refresh cash closings">
          <RefreshCw size={17} className={loading ? 'spin' : ''} />
        </button>
      </header>

      <div className="cash-admin-summary">
        <div><span>Submitted</span><strong>{summary.submitted}/{outlets.length}</strong></div>
        <div><span>Balanced</span><strong>{summary.balanced}</strong></div>
        <div><span>Needs attention</span><strong>{summary.attention + Math.max(0, outlets.length - summary.submitted)}</strong></div>
      </div>

      {error && <div className="cash-admin-error"><AlertTriangle size={17} />{error}</div>}

      <div className="cash-admin-list">
        {outlets.map((outlet) => {
          const closing = closings.find((item) => item.outlet_id === outlet.id)
          const open = closing?.id === openId
          return (
            <article className={`cash-admin-row ${closing ? `is-${closing.status}` : 'is-missing'}`} key={outlet.id}>
              <div className="cash-admin-row-main">
                <div className="cash-admin-outlet">
                  <Banknote size={18} />
                  <span><strong>{outlet.name}</strong><small>{outlet.city}</small></span>
                </div>
                {closing ? (
                  <>
                    <div><span>Expected</span><strong>{money(closing.expected_cash)}</strong></div>
                    <div><span>Counted</span><strong>{money(closing.physical_cash_counted)}</strong></div>
                    <div><span>Difference</span><strong className={Number(closing.difference_amount) === 0 ? 'is-zero' : 'is-variance'}>{Number(closing.difference_amount) > 0 ? '+' : Number(closing.difference_amount) < 0 ? '-' : ''}{money(closing.difference_amount)}</strong></div>
                    <span className={`cash-close-status is-${closing.status}`}>{STATUS_LABEL[closing.status]}</span>
                    <button type="button" className="cash-admin-review" onClick={() => setOpenId(open ? null : closing.id)} aria-expanded={open}>
                      Review <ChevronDown size={15} />
                    </button>
                  </>
                ) : (
                  <div className="cash-admin-missing"><AlertTriangle size={16} /><strong>Not submitted</strong></div>
                )}
              </div>
              {closing && (
                <div className="cash-admin-meta">
                  <span>Counted by <strong>{closing.counted_by}</strong></span>
                  <span>Verified by <strong>{closing.verified_by || 'Missing'}</strong></span>
                  <span>Submitted <strong>{time(closing.submitted_at)}</strong></span>
                  <div className="cash-admin-proofs">
                    {closing.proof_photo_url ? <a href={closing.proof_photo_url} target="_blank" rel="noreferrer"><img src={closing.proof_photo_url} alt={`${outlet.name} cash proof`} />Cash proof</a> : <span><Camera size={14} />Cash proof missing</span>}
                    {closing.pos_closing_report_photo_url ? <a href={closing.pos_closing_report_photo_url} target="_blank" rel="noreferrer"><img src={closing.pos_closing_report_photo_url} alt={`${outlet.name} POS closing report`} />POS report</a> : <span><FileText size={14} />POS report missing</span>}
                  </div>
                </div>
              )}
              {closing && open && <CashClosingEditor closing={closing} onSaved={(updated) => {
                setClosings((current) => current.map((item) => item.id === updated.id ? updated : item))
                setOpenId(null)
              }} />}
            </article>
          )
        })}
        {!loading && outlets.length === 0 && (
          <div className="cash-admin-empty"><CheckCircle2 size={20} />No active outlets.</div>
        )}
      </div>
    </section>
  )
}
