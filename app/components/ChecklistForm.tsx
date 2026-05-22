'use client'

import { useState, useRef } from 'react'

interface CheckItem {
  id: string
  label: string
}

interface FoodItem {
  name: string
  checks: CheckItem[]
}

interface Props {
  title: string
  items: FoodItem[]
  onSubmit: (data: SubmissionData) => Promise<void>
  onClose: () => void
}

export interface SubmissionData {
  items: { name: string; photo: File | null; checks: string[]; notes: string }[]
  overallNotes: string
}

function ItemCard({
  item,
  onPhotoChange,
  onChecksChange,
  onNotesChange,
}: {
  item: FoodItem
  onPhotoChange: (photo: File | null) => void
  onChecksChange: (checks: string[]) => void
  onNotesChange: (notes: string) => void
}) {
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [checks, setChecks] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setPhoto(file)
    if (file) {
      const url = URL.createObjectURL(file)
      setPreview(url)
      onPhotoChange(file)
    }
  }

  function toggleCheck(checkId: string) {
    const next = checks.includes(checkId)
      ? checks.filter(c => c !== checkId)
      : [...checks, checkId]
    setChecks(next)
    onChecksChange(next)
  }

  return (
    <div className="bg-gray-50 rounded-2xl p-4 mb-4">
      <p className="font-semibold text-gray-900 mb-3">{item.name}</p>

      <button
        type="button"
        className={`w-full h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors mb-3 ${
          preview ? 'border-green-300 bg-green-50' : 'border-orange-300 bg-white hover:bg-orange-50'
        }`}
        onClick={() => fileRef.current?.click()}
      >
        {preview ? (
          <img src={preview} alt="" className="w-full h-full object-cover rounded-xl" />
        ) : (
          <>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-orange-600">Tap to take photo</span>
          </>
        )}
      </button>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />

      <div className="space-y-2 mb-3">
        {item.checks.map(check => (
          <label key={check.id} className="flex items-center gap-3 cursor-pointer py-1">
            <div
              className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors shrink-0 ${
                checks.includes(check.id)
                  ? 'bg-orange-500 border-orange-500'
                  : 'border-gray-300 bg-white'
              }`}
              onClick={() => toggleCheck(check.id)}
            >
              {checks.includes(check.id) && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-sm text-gray-700">{check.label}</span>
          </label>
        ))}
      </div>

      <textarea
        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
        rows={2}
        placeholder="Notes (optional)..."
        value={notes}
        onChange={e => { setNotes(e.target.value); onNotesChange(e.target.value) }}
      />
    </div>
  )
}

export default function ChecklistForm({ title, items, onSubmit, onClose }: Props) {
  const [itemData, setItemData] = useState<SubmissionData['items']>(
    items.map(item => ({ name: item.name, photo: null, checks: [], notes: '' }))
  )
  const [overallNotes, setOverallNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const allHavePhotos = itemData.every(d => d.photo !== null)

  async function handleSubmit() {
    if (!allHavePhotos) return
    setSubmitting(true)
    try {
      await onSubmit({ items: itemData, overallNotes })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-app-bg overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 pb-28">
        {/* Header */}
        <div className="sticky top-0 bg-app-bg pt-safe-top z-10 pb-4">
          <div className="flex items-center gap-3 py-4">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-gray-900">{title}</h1>
          </div>
        </div>

        {items.map((item, idx) => (
          <ItemCard
            key={item.name}
            item={item}
            onPhotoChange={photo => {
              const next = [...itemData]
              next[idx] = { ...next[idx], photo }
              setItemData(next)
            }}
            onChecksChange={checks => {
              const next = [...itemData]
              next[idx] = { ...next[idx], checks }
              setItemData(next)
            }}
            onNotesChange={notes => {
              const next = [...itemData]
              next[idx] = { ...next[idx], notes }
              setItemData(next)
            }}
          />
        ))}

        <textarea
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white mb-4"
          rows={3}
          placeholder="Overall notes for this update..."
          value={overallNotes}
          onChange={e => setOverallNotes(e.target.value)}
        />

        {!allHavePhotos && (
          <p className="text-xs text-center text-amber-600 mb-3">
            ⚠ Please upload a photo for each item before submitting
          </p>
        )}
      </div>

      {/* Fixed submit button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-lg">
        <div className="max-w-lg mx-auto">
          <button
            className="btn-primary"
            disabled={!allHavePhotos || submitting}
            onClick={handleSubmit}
          >
            {submitting ? 'Submitting...' : 'Submit Update ✓'}
          </button>
        </div>
      </div>
    </div>
  )
}
