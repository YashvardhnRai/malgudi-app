'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Banknote,
  Camera,
  FileText,
  Loader2,
  Send,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'
import {
  calculateCashClosing,
  deriveCashClosingStatus,
  type CashClosingAmounts,
  type CashClosingStatus,
} from '@/lib/cash-closing'
import { compressPhotoForUpload } from '@/lib/photo-upload-client'
import type { CashClosing } from '@/lib/types'

const AMOUNT_FIELDS: Array<{
  key: keyof CashClosingAmounts
  label: string
  short: string
}> = [
  { key: 'opening_cash_balance', label: 'Opening cash balance', short: 'Opening cash' },
  { key: 'cash_sales_as_per_pos', label: 'Cash sales as per POS', short: 'POS cash sales' },
  { key: 'upi_sales', label: 'UPI sales', short: 'UPI sales' },
  { key: 'card_sales', label: 'Card sales', short: 'Card sales' },
  { key: 'aggregator_sales', label: 'Aggregator sales', short: 'Aggregator' },
  { key: 'cash_expenses', label: 'Cash expenses', short: 'Cash expenses' },
  {
    key: 'cash_deposited_or_handed_over',
    label: 'Cash deposited or handed over',
    short: 'Deposited / handed',
  },
  { key: 'physical_cash_counted', label: 'Physical cash counted', short: 'Physical count' },
]

const EMPTY_AMOUNTS = Object.fromEntries(
  AMOUNT_FIELDS.map((field) => [field.key, ''])
) as Record<keyof CashClosingAmounts, string>

const STATUS_LABEL: Record<CashClosingStatus, string> = {
  balanced: 'Balanced',
  shortage: 'Shortage',
  excess: 'Excess',
  needs_review: 'Needs review',
}

function istDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function money(value: number) {
  return `Rs ${Math.abs(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export default function CashClosingPanel({
  outletId,
  actorName,
}: {
  outletId: string
  actorName: string
}) {
  const [closing, setClosing] = useState<CashClosing | null>(null)
  const [amounts, setAmounts] = useState(EMPTY_AMOUNTS)
  const [countedBy, setCountedBy] = useState(actorName)
  const [verifiedBy, setVerifiedBy] = useState('')
  const [notes, setNotes] = useState('')
  const [proofPhoto, setProofPhoto] = useState<File | null>(null)
  const [posPhoto, setPosPhoto] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetch(`/api/cash-closings?outlet_id=${encodeURIComponent(outletId)}&date=${istDate()}`, {
      cache: 'no-store',
    })
      .then(async (response) => {
        const payload = (await response.json()) as { closings?: CashClosing[]; error?: string }
        if (!response.ok) throw new Error(payload.error || 'Unable to load cash closing')
        if (active) setClosing(payload.closings?.[0] ?? null)
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load cash closing')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [outletId])

  const allAmountsEntered = AMOUNT_FIELDS.every((field) => amounts[field.key].trim() !== '')
  const calculation = useMemo(() => {
    const values = Object.fromEntries(
      AMOUNT_FIELDS.map((field) => [field.key, Number(amounts[field.key] || 0)])
    ) as CashClosingAmounts
    return calculateCashClosing(values)
  }, [amounts])
  const previewStatus = deriveCashClosingStatus({
    differenceAmount: calculation.differenceAmount,
    proofPhotoUrl: proofPhoto?.name,
    posClosingReportPhotoUrl: posPhoto?.name,
    verifiedBy,
  })

  async function submit() {
    if (!allAmountsEntered || !countedBy.trim() || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('outlet_id', outletId)
      formData.append('business_date', istDate())
      for (const field of AMOUNT_FIELDS) formData.append(field.key, amounts[field.key])
      formData.append('counted_by', countedBy)
      formData.append('verified_by', verifiedBy)
      formData.append('notes', notes)
      if (proofPhoto) formData.append('proof_photo', await compressPhotoForUpload(proofPhoto))
      if (posPhoto) {
        formData.append('pos_closing_report_photo', await compressPhotoForUpload(posPhoto))
      }

      const response = await fetch('/api/cash-closings', { method: 'POST', body: formData })
      const payload = (await response.json()) as { closing?: CashClosing; error?: string }
      if (!response.ok || !payload.closing) {
        throw new Error(payload.error || 'Cash closing could not be submitted')
      }
      setClosing(payload.closing)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Cash closing could not be submitted')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <section className="cash-close-panel is-loading">
        <Loader2 className="spin" size={20} />
        Loading cash closing
      </section>
    )
  }

  if (closing) {
    return (
      <section className={`cash-close-panel is-${closing.status}`}>
        <header className="cash-close-head">
          <div>
            <span><WalletCards size={15} /> End-of-day control</span>
            <h2>Cash closing submitted</h2>
            <p>{closing.business_date}</p>
          </div>
          <strong className={`cash-close-status is-${closing.status}`}>
            {STATUS_LABEL[closing.status]}
          </strong>
        </header>
        <div className="cash-close-result-grid">
          <div><span>Expected</span><strong>{money(Number(closing.expected_cash))}</strong></div>
          <div><span>Counted</span><strong>{money(Number(closing.physical_cash_counted))}</strong></div>
          <div className={Number(closing.difference_amount) === 0 ? 'is-zero' : 'is-variance'}>
            <span>Difference</span>
            <strong>{Number(closing.difference_amount) > 0 ? '+' : Number(closing.difference_amount) < 0 ? '-' : ''}{money(Number(closing.difference_amount))}</strong>
          </div>
        </div>
        <div className="cash-close-people">
          <span>Counted by <strong>{closing.counted_by}</strong></span>
          <span>Verified by <strong>{closing.verified_by || 'Pending'}</strong></span>
        </div>
        <p className="cash-close-lock-note">
          <ShieldCheck size={15} /> Submitted closings can only be changed by the CEO.
        </p>
      </section>
    )
  }

  return (
    <section className="cash-close-panel">
      <header className="cash-close-head">
        <div>
          <span><WalletCards size={15} /> End-of-day control</span>
          <h2>Cash closing</h2>
          <p>Count the drawer, reconcile POS cash, and attach both proofs.</p>
        </div>
        <Banknote size={24} />
      </header>

      <div className="cash-close-fields">
        {AMOUNT_FIELDS.map((field) => (
          <label key={field.key}>
            <span>{field.short}</span>
            <div><b>Rs</b><input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amounts[field.key]}
              onChange={(event) => setAmounts((current) => ({
                ...current,
                [field.key]: event.target.value,
              }))}
              aria-label={field.label}
              placeholder="0.00"
            /></div>
          </label>
        ))}
      </div>

      <div className="cash-close-live-calc">
        <div><span>Expected cash</span><strong>{money(calculation.expectedCash)}</strong></div>
        <div><span>Difference</span><strong>{calculation.differenceAmount >= 0 ? '+' : '-'}{money(calculation.differenceAmount)}</strong></div>
        <span className={`cash-close-status is-${previewStatus}`}>{STATUS_LABEL[previewStatus]}</span>
      </div>

      <div className="cash-close-people-fields">
        <label><span>Counted by</span><input value={countedBy} onChange={(event) => setCountedBy(event.target.value)} maxLength={120} /></label>
        <label><span>Verified by <small>required to balance</small></span><input value={verifiedBy} onChange={(event) => setVerifiedBy(event.target.value)} maxLength={120} placeholder="Manager name" /></label>
      </div>

      <div className="cash-close-proof-grid">
        <label className={proofPhoto ? 'has-file' : ''}>
          <input type="file" accept="image/*" capture="environment" onChange={(event) => setProofPhoto(event.target.files?.[0] ?? null)} />
          <Camera size={20} />
          <strong>{proofPhoto ? 'Cash proof added' : 'Cash count proof'}</strong>
          <span>{proofPhoto?.name || 'Photo of counted cash / handover'}</span>
        </label>
        <label className={posPhoto ? 'has-file' : ''}>
          <input type="file" accept="image/*" capture="environment" onChange={(event) => setPosPhoto(event.target.files?.[0] ?? null)} />
          <FileText size={20} />
          <strong>{posPhoto ? 'POS report added' : 'POS closing report'}</strong>
          <span>{posPhoto?.name || 'Photo of the POS day-end report'}</span>
        </label>
      </div>

      <label className="cash-close-notes">
        <span>Notes <small>optional</small></span>
        <textarea rows={2} maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Explain expenses, handover, or any difference" />
      </label>

      {error && <div className="cash-close-message error"><AlertTriangle size={17} />{error}</div>}
      {previewStatus === 'needs_review' && allAmountsEntered && (
        <div className="cash-close-message warning">
          <AlertTriangle size={17} /> Add both photos and a verifier to complete the closing without review.
        </div>
      )}

      <button className="cash-close-submit" type="button" disabled={!allAmountsEntered || !countedBy.trim() || submitting} onClick={() => void submit()}>
        {submitting ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
        {submitting ? 'Submitting cash closing' : 'Submit cash closing'}
      </button>
    </section>
  )
}
