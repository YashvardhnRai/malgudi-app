'use client'

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  Clock3,
  Gauge,
  ImageUp,
  Loader2,
  Send,
  Thermometer,
} from 'lucide-react'
import {
  COUNTER_ROUND_ITEMS,
  COUNTER_ROUND_SLOTS,
  counterRoundMinutes,
  formatCounterRoundTime,
  getDueCounterRoundSlots,
  type CounterRoundItemKey,
} from '@/lib/counter-rounds'
import { submitCounterRound } from '@/lib/photo-upload-client'
import type { CounterTemperatureRound } from '@/lib/types'

type ItemDraft = {
  file: File | null
  preview: string | null
  temperature: string
}

type ItemDrafts = Record<CounterRoundItemKey, ItemDraft>

function emptyDrafts(): ItemDrafts {
  return Object.fromEntries(
    COUNTER_ROUND_ITEMS.map((item) => [
      item.key,
      { file: null, preview: null, temperature: '' },
    ])
  ) as ItemDrafts
}

function currentIstMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return Number(values.hour) * 60 + Number(values.minute)
}

function readingLabel(round: CounterTemperatureRound) {
  return round.readings
    .filter((reading) => reading.temperature_c !== null)
    .map((reading) => {
      const item = COUNTER_ROUND_ITEMS.find((candidate) => candidate.key === reading.item_key)
      return `${item?.shortLabel ?? reading.item_key} ${reading.temperature_c} C`
    })
    .join(' / ')
}

export default function CounterTemperatureRoundPanel({
  outletId,
  onSummaryChange,
}: {
  outletId: string
  onSummaryChange?: (summary: { completed: number; expected: number }) => void
}) {
  const [now, setNow] = useState(() => new Date())
  const [rounds, setRounds] = useState<CounterTemperatureRound[]>([])
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<ItemDrafts>(emptyDrafts)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [queuedSlots, setQueuedSlots] = useState<Set<string>>(new Set())

  const completedSlots = useMemo(
    () => new Set([...rounds.map((round) => round.slot_key), ...queuedSlots]),
    [rounds, queuedSlots]
  )
  const dueSlots = useMemo(() => getDueCounterRoundSlots(now), [now])
  const defaultSlotKey =
    [...dueSlots].reverse().find((slot) => !completedSlots.has(slot.key))?.key ??
    dueSlots.at(-1)?.key ??
    null
  const activeSlotKey = selectedSlotKey ?? defaultSlotKey
  const selectedSlot = COUNTER_ROUND_SLOTS.find((slot) => slot.key === activeSlotKey) ?? null
  const selectedRound = rounds.find((round) => round.slot_key === activeSlotKey) ?? null
  const nowMinutes = currentIstMinutes(now)

  async function loadRounds() {
    try {
      const response = await fetch(`/api/counter-rounds?outlet_id=${outletId}`, {
        cache: 'no-store',
      })
      const payload = (await response.json()) as {
        rounds?: CounterTemperatureRound[]
        error?: string
      }
      if (!response.ok) throw new Error(payload.error || 'Unable to load counter rounds')
      setRounds(payload.rounds ?? [])
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load counter rounds')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => void loadRounds())
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outletId])

  useEffect(() => {
    onSummaryChange?.({
      completed: completedSlots.size,
      expected: COUNTER_ROUND_SLOTS.length,
    })
  }, [completedSlots, onSummaryChange])

  function updateFile(itemKey: CounterRoundItemKey, file: File | null) {
    setDrafts((current) => {
      const previous = current[itemKey]
      if (previous.preview) URL.revokeObjectURL(previous.preview)
      return {
        ...current,
        [itemKey]: {
          ...previous,
          file,
          preview: file ? URL.createObjectURL(file) : null,
        },
      }
    })
    setError('')
  }

  function resetDrafts() {
    Object.values(drafts).forEach((draft) => {
      if (draft.preview) URL.revokeObjectURL(draft.preview)
    })
    setDrafts(emptyDrafts())
    setNote('')
  }

  const formComplete = COUNTER_ROUND_ITEMS.every((item) => {
    const draft = drafts[item.key]
    if (!draft.file) return false
    if (!item.temperatureRequired) return true
    const temperature = Number(draft.temperature)
    return Number.isFinite(temperature) && draft.temperature.trim() !== ''
  })

  async function submit() {
    if (!selectedSlot || !formComplete || submitting) return
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const result = await submitCounterRound({
        outletId,
        slotKey: selectedSlot.key,
        note,
        items: COUNTER_ROUND_ITEMS.map((item) => ({
          itemKey: item.key,
          temperatureC: item.temperatureRequired
            ? Number(drafts[item.key].temperature)
            : null,
          file: drafts[item.key].file!,
        })),
      })
      if (result.queued) {
        setQueuedSlots((current) => new Set(current).add(selectedSlot.key))
        setSuccess('Round saved on this phone. It will upload when the connection returns.')
      } else {
        setSuccess(`${selectedSlot.label} submitted to the CEO.`)
        await loadRounds()
      }
      resetDrafts()
      const nextIncomplete = dueSlots.find(
        (slot) => slot.key !== selectedSlot.key && !completedSlots.has(slot.key)
      )
      setSelectedSlotKey(nextIncomplete?.key ?? selectedSlot.key)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Counter round failed')
    } finally {
      setSubmitting(false)
    }
  }

  const upcomingSlot = COUNTER_ROUND_SLOTS.find(
    (slot) => counterRoundMinutes(slot) > nowMinutes
  )

  return (
    <section className="counter-round-panel" aria-labelledby="counter-round-title">
      <header className="counter-round-head">
        <div>
          <span>
            <Thermometer size={14} />
            Every two hours from 7:30 AM
          </span>
          <h2 id="counter-round-title">Counter temperature round</h2>
          <p>Five fresh photos. Four thermometer readings. One complete round.</p>
        </div>
        <div className="counter-round-score" aria-label={`${completedSlots.size} of 8 rounds complete`}>
          <strong>{completedSlots.size}/8</strong>
          <small>today</small>
        </div>
      </header>

      <div className="counter-slot-strip" aria-label="Counter round schedule">
        {COUNTER_ROUND_SLOTS.map((slot) => {
          const complete = completedSlots.has(slot.key)
          const due = counterRoundMinutes(slot) <= nowMinutes
          const selected = slot.key === activeSlotKey
          return (
            <button
              type="button"
              key={slot.key}
              className={`${complete ? 'is-complete' : due ? 'is-due' : 'is-upcoming'} ${selected ? 'is-selected' : ''}`}
              disabled={!due}
              onClick={() => {
                setSelectedSlotKey(slot.key)
                setSuccess('')
              }}
              aria-pressed={selected}
            >
              <span>{formatCounterRoundTime(slot.hour, slot.minute)}</span>
              {complete ? <Check size={13} /> : <Clock3 size={13} />}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="counter-round-loading">
          <Loader2 size={20} className="spin" />
          Loading today&apos;s rounds
        </div>
      ) : selectedRound ? (
        <div className="counter-round-complete">
          <CheckCircle2 size={24} />
          <div>
            <strong>{selectedSlot?.label} complete</strong>
            <p>{readingLabel(selectedRound)}</p>
            <small>
              Submitted {new Date(selectedRound.submitted_at).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
                timeZone: 'Asia/Kolkata',
              })}
              {selectedRound.status === 'LATE' ? ' / Late' : ''}
            </small>
          </div>
        </div>
      ) : selectedSlot ? (
        <>
          <div className="counter-round-active">
            <div>
              <Gauge size={18} />
              <span>
                <small>{nowMinutes > counterRoundMinutes(selectedSlot) + 30 ? 'Overdue round' : 'Current round'}</small>
                <strong>{selectedSlot.label}</strong>
              </span>
            </div>
            <span>{COUNTER_ROUND_ITEMS.filter((item) => drafts[item.key].file).length}/5 photos</span>
          </div>

          <div className="counter-proof-list">
            {COUNTER_ROUND_ITEMS.map((item, index) => {
              const draft = drafts[item.key]
              return (
                <article className={draft.file ? 'is-ready' : ''} key={item.key}>
                  <div className="counter-proof-index">{draft.file ? <Check size={15} /> : index + 1}</div>
                  <div className="counter-proof-copy">
                    <strong>{item.label}</strong>
                    <span>{item.instruction}</span>
                    {item.temperatureRequired && (
                      <label>
                        <Thermometer size={16} />
                        <input
                          type="number"
                          inputMode="decimal"
                          min="-20"
                          max="120"
                          step="0.1"
                          value={draft.temperature}
                          onChange={(event) =>
                            setDrafts((current) => ({
                              ...current,
                              [item.key]: {
                                ...current[item.key],
                                temperature: event.target.value,
                              },
                            }))
                          }
                          placeholder="0.0"
                          aria-label={`${item.label} temperature in Celsius`}
                        />
                        <b>C</b>
                      </label>
                    )}
                  </div>
                  <label className={`counter-proof-camera ${draft.preview ? 'has-photo' : ''}`}>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(event) => updateFile(item.key, event.target.files?.[0] ?? null)}
                    />
                    {draft.preview ? (
                      <img src={draft.preview} alt={`${item.label} preview`} />
                    ) : (
                      <>
                        <Camera size={20} />
                        <span>Photo</span>
                      </>
                    )}
                  </label>
                </article>
              )
            })}
          </div>

          <label className="counter-round-note">
            <span>Round note <small>optional</small></span>
            <textarea
              rows={2}
              value={note}
              maxLength={300}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Anything the CEO should know?"
            />
          </label>

          {error && (
            <div className="counter-round-message error" role="alert">
              <AlertTriangle size={17} />
              {error}
            </div>
          )}
          {success && (
            <div className="counter-round-message success">
              <CheckCircle2 size={17} />
              {success}
            </div>
          )}

          <button
            type="button"
            className="counter-round-submit"
            onClick={() => void submit()}
            disabled={!formComplete || submitting}
          >
            {submitting ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
            {submitting ? 'Submitting round' : 'Submit all 5 proofs'}
          </button>
        </>
      ) : (
        <div className="counter-round-waiting">
          <ImageUp size={23} />
          <div>
            <strong>First round starts at 7:30 AM</strong>
            <span>
              {upcomingSlot
                ? `Next: ${formatCounterRoundTime(upcomingSlot.hour, upcomingSlot.minute)}`
                : 'All scheduled rounds are complete for today.'}
            </span>
          </div>
        </div>
      )}
    </section>
  )
}
