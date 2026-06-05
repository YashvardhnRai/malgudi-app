'use client'
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  CookingPot,
  Home,
  ImageUp,
  Leaf,
  Loader2,
  Moon,
  Send,
  SprayCan,
  UploadCloud,
  Utensils,
  X,
  type LucideIcon,
} from 'lucide-react'
import StatusBadge from '@/app/components/StatusBadge'
import type { Outlet } from '@/lib/types'

type Category =
  | 'FOOD_QUALITY'
  | 'BANMARIE'
  | 'CLEANLINESS'
  | 'RAW_MATERIAL'
  | 'CLOSING'
  | 'DISH_AUDIT'

type UploadState = 'idle' | 'uploading' | 'done' | 'error'

interface UploadResult {
  url: string
  aiStatus: 'APPROVED' | 'FLAGGED' | 'PENDING'
  aiNotes: string
}

const CATEGORIES: {
  id: Category
  label: string
  Icon: LucideIcon
}[] = [
  { id: 'FOOD_QUALITY', label: 'Food', Icon: Camera },
  { id: 'BANMARIE', label: 'Banmarie', Icon: CookingPot },
  { id: 'CLEANLINESS', label: 'Clean', Icon: SprayCan },
  { id: 'RAW_MATERIAL', label: 'Raw', Icon: Leaf },
  { id: 'CLOSING', label: 'Closing', Icon: Moon },
  { id: 'DISH_AUDIT', label: 'Dish audit', Icon: Utensils },
]

export default function UploadPage() {
  const [category, setCategory] = useState<Category>('FOOD_QUALITY')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [state, setState] = useState<UploadState>('idle')
  const [result, setResult] = useState<UploadResult | null>(null)
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [selectedOutletId, setSelectedOutletId] = useState('')
  const [loadingOutlets, setLoadingOutlets] = useState(true)

  useEffect(() => {
    let mounted = true
    fetch('/api/outlets')
      .then((response) => response.json())
      .then((data: { outlets?: Outlet[] }) => {
        if (!mounted) return
        const nextOutlets = data.outlets ?? []
        setOutlets(nextOutlets)
        setSelectedOutletId((current) => current || nextOutlets[0]?.id || '')
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoadingOutlets(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => [...prev, ...accepted].slice(0, 5))
    const newPreviews = accepted.map((file) => URL.createObjectURL(file))
    setPreviews((prev) => [...prev, ...newPreviews].slice(0, 5))
    setResult(null)
    setState('idle')
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 5,
  })

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index))
    setPreviews((current) => {
      URL.revokeObjectURL(current[index])
      return current.filter((_, i) => i !== index)
    })
  }

  async function handleSubmit() {
    if (files.length === 0 || !selectedOutletId) return
    setState('uploading')

    const formData = new FormData()
    files.forEach((file) => formData.append('photos', file))
    formData.append('category', category)
    formData.append('caption', caption)
    formData.append('outlet_id', selectedOutletId)

    try {
      const response = await fetch('/api/photos', { method: 'POST', body: formData })
      const data = (await response.json()) as UploadResult
      setResult(data)
      setState('done')
    } catch {
      setState('error')
    }
  }

  function reset() {
    previews.forEach((preview) => URL.revokeObjectURL(preview))
    setFiles([])
    setPreviews([])
    setCaption('')
    setState('idle')
    setResult(null)
  }

  const selectedOutlet = outlets.find((outlet) => outlet.id === selectedOutletId)
  const submitDisabled = files.length === 0 || state === 'uploading' || !selectedOutletId

  return (
    <main className="upload-page">
      <section className="upload-shell">
        <header className="upload-hero">
          <Link href="/manager" className="upload-home" aria-label="Back to manager home">
            <Home size={17} />
          </Link>
          <div>
            <span>
              <UploadCloud size={14} />
              Photo proof
            </span>
            <h1>Upload inspection photos</h1>
            <p>
              Send fresh visual proof to the operations desk with outlet context and
              AI review in one clean flow.
            </p>
          </div>
        </header>

        <section className="upload-panel">
          {state === 'done' && result ? (
            <div className="upload-result">
              <div className={result.aiStatus === 'FLAGGED' ? 'flagged' : 'approved'}>
                {result.aiStatus === 'FLAGGED' ? (
                  <AlertTriangle size={30} />
                ) : (
                  <CheckCircle2 size={30} />
                )}
              </div>
              <h2>
                {result.aiStatus === 'FLAGGED'
                  ? 'Photo needs review'
                  : result.aiStatus === 'APPROVED'
                  ? 'Upload approved'
                  : 'Upload sent'}
              </h2>
              <StatusBadge status={result.aiStatus} />
              {result.aiNotes && (
                <p className="upload-ai-note">AI note: {result.aiNotes}</p>
              )}
              <button type="button" onClick={reset} className="upload-submit">
                <ImageUp size={18} />
                Upload another
              </button>
            </div>
          ) : (
            <>
              <label className="upload-field">
                <span>Outlet</span>
                <select
                  value={selectedOutletId}
                  onChange={(event) => setSelectedOutletId(event.target.value)}
                  disabled={loadingOutlets || outlets.length === 0}
                  className="upload-outlet-select"
                >
                  {loadingOutlets && <option>Loading outlets...</option>}
                  {!loadingOutlets && outlets.length === 0 && <option>No outlets found</option>}
                  {outlets.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name} - {outlet.city}
                    </option>
                  ))}
                </select>
              </label>

              <div className="upload-field">
                <span>Category</span>
                <div className="upload-category-grid">
                  {CATEGORIES.map((item) => {
                    const Icon = item.Icon
                    const selected = category === item.id
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setCategory(item.id)}
                        className={`upload-category ${selected ? 'selected' : ''}`}
                      >
                        <Icon size={17} />
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="upload-field">
                <span>Photos</span>
                <div
                  {...getRootProps()}
                  className={`upload-dropzone ${isDragActive ? 'dragging' : ''} ${
                    previews.length > 0 ? 'has-files' : ''
                  }`}
                >
                  <input {...getInputProps()} capture="environment" />
                  {previews.length === 0 ? (
                    <>
                      <div>
                        <ImageUp size={30} />
                      </div>
                      <strong>{isDragActive ? 'Drop photos here' : 'Take or choose photos'}</strong>
                      <small>Up to 5 photos for {selectedOutlet?.name || 'the selected outlet'}</small>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={24} />
                      <strong>{previews.length} photo{previews.length > 1 ? 's' : ''} selected</strong>
                      <small>Tap again to add more proof</small>
                    </>
                  )}
                </div>
              </div>

              {previews.length > 0 && (
                <div className="upload-preview-grid">
                  {previews.map((src, index) => (
                    <div key={src} className="upload-preview">
                      <img src={src} alt={`Selected upload ${index + 1}`} />
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="upload-remove"
                        aria-label={`Remove photo ${index + 1}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <label className="upload-field">
                <span>Caption</span>
                <textarea
                  className="upload-textarea"
                  rows={3}
                  placeholder="What should the CEO know about these photos?"
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                />
              </label>

              {state === 'error' && (
                <div className="upload-error">
                  <AlertTriangle size={16} />
                  Upload failed. Please try again.
                </div>
              )}

              <button
                type="button"
                className="upload-submit"
                disabled={submitDisabled}
                onClick={handleSubmit}
              >
                {state === 'uploading' ? (
                  <>
                    <Loader2 size={18} className="spin" />
                    Uploading and analysing
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Submit {files.length ? `${files.length} photo${files.length > 1 ? 's' : ''}` : 'photos'}
                  </>
                )}
              </button>
            </>
          )}
        </section>

        <nav className="upload-route-links" aria-label="Upload page navigation">
          <Link href="/manager">Manager</Link>
          <Link href="/upload" aria-current="page">Upload</Link>
          <Link href="/complaints">Complaints</Link>
        </nav>
      </section>
    </main>
  )
}
