'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import BottomNav from '@/app/components/BottomNav'
import StatusBadge from '@/app/components/StatusBadge'

type Category = 'FOOD_QUALITY' | 'BANMARIE' | 'CLEANLINESS' | 'RAW_MATERIAL' | 'CLOSING' | 'DISH_AUDIT'

const CATEGORIES: { id: Category; label: string; icon: string; color: string }[] = [
  { id: 'FOOD_QUALITY',  label: 'Food Quality', icon: '🍛', color: 'bg-orange-50 border-orange-200' },
  { id: 'BANMARIE',      label: 'Banmarie',     icon: '🥘', color: 'bg-amber-50 border-amber-200' },
  { id: 'CLEANLINESS',   label: 'Cleanliness',  icon: '✨', color: 'bg-blue-50 border-blue-200' },
  { id: 'RAW_MATERIAL',  label: 'Raw Material', icon: '🥬', color: 'bg-green-50 border-green-200' },
  { id: 'CLOSING',       label: 'Closing',      icon: '🔒', color: 'bg-purple-50 border-purple-200' },
  { id: 'DISH_AUDIT',    label: 'Dish Audit',   icon: '🍽️', color: 'bg-pink-50 border-pink-200' },
]

type UploadState = 'idle' | 'uploading' | 'done' | 'error'

interface UploadResult {
  url: string
  aiStatus: 'APPROVED' | 'FLAGGED' | 'PENDING'
  aiNotes: string
}

export default function UploadPage() {
  const [category, setCategory] = useState<Category>('FOOD_QUALITY')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [state, setState] = useState<UploadState>('idle')
  const [result, setResult] = useState<UploadResult | null>(null)

  const onDrop = useCallback((accepted: File[]) => {
    setFiles(prev => [...prev, ...accepted].slice(0, 5))
    const newPreviews = accepted.map(f => URL.createObjectURL(f))
    setPreviews(prev => [...prev, ...newPreviews].slice(0, 5))
    setResult(null)
    setState('idle')
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 5,
  })

  function removeFile(idx: number) {
    setFiles(f => f.filter((_, i) => i !== idx))
    setPreviews(p => {
      URL.revokeObjectURL(p[idx])
      return p.filter((_, i) => i !== idx)
    })
  }

  async function handleSubmit() {
    if (files.length === 0) return
    setState('uploading')

    const formData = new FormData()
    files.forEach(f => formData.append('photos', f))
    formData.append('category', category)
    formData.append('caption', caption)
    formData.append('outlet_id', 'outlet-bandra')

    try {
      const res = await fetch('/api/photos', { method: 'POST', body: formData })
      const data = await res.json()
      setResult(data)
      setState('done')
    } catch {
      setState('error')
    }
  }

  function reset() {
    previews.forEach(p => URL.revokeObjectURL(p))
    setFiles([])
    setPreviews([])
    setCaption('')
    setState('idle')
    setResult(null)
  }

  return (
    <div className="min-h-screen bg-app-bg pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-40 shadow-sm">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-bold text-gray-900">Upload Photo</h1>
          <p className="text-sm text-gray-500 mt-0.5">Quick ad-hoc photo upload</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">
        {state === 'done' && result ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">{result.aiStatus === 'APPROVED' ? '✅' : result.aiStatus === 'FLAGGED' ? '⚠️' : '📤'}</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {result.aiStatus === 'APPROVED' ? 'Upload Successful!' : result.aiStatus === 'FLAGGED' ? 'Photo Flagged' : 'Upload Sent'}
            </h2>
            <div className="mb-4">
              <StatusBadge status={result.aiStatus} />
            </div>
            {result.aiNotes && (
              <p className={`text-sm p-3 rounded-xl mx-auto max-w-xs ${
                result.aiStatus === 'FLAGGED' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'
              }`}>
                AI: {result.aiNotes}
              </p>
            )}
            <button onClick={reset} className="btn-primary mt-6 max-w-xs mx-auto">
              Upload Another
            </button>
          </div>
        ) : (
          <>
            {/* Category Selector */}
            <div className="mb-5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Category</p>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                      category === cat.id
                        ? 'border-orange-500 bg-orange-50'
                        : `${cat.color} hover:border-orange-200`
                    }`}
                  >
                    <span className="text-xl">{cat.icon}</span>
                    <span className={`text-[11px] font-semibold ${category === cat.id ? 'text-orange-700' : 'text-gray-600'}`}>
                      {cat.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Drop Zone */}
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Photos</p>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragActive
                    ? 'border-orange-400 bg-orange-50'
                    : previews.length > 0
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300 hover:border-orange-300 hover:bg-orange-50/30'
                }`}
              >
                <input {...getInputProps()} capture="environment" />
                {previews.length === 0 ? (
                  <div>
                    <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-7 h-7 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">
                      {isDragActive ? 'Drop here!' : 'Tap to take photo'}
                    </p>
                    <p className="text-xs text-gray-400">or drag & drop · up to 5 photos</p>
                  </div>
                ) : (
                  <p className="text-sm text-green-700 font-medium">{previews.length} photo{previews.length > 1 ? 's' : ''} selected · Tap to add more</p>
                )}
              </div>
            </div>

            {/* Preview Grid */}
            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {previews.map((src, i) => (
                  <div key={i} className="relative aspect-square">
                    <img src={src} alt="" className="w-full h-full object-cover rounded-xl" />
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center shadow"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Caption */}
            <div className="mb-5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Caption</p>
              <textarea
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                rows={2}
                placeholder="Describe what&apos;s in the photo..."
                value={caption}
                onChange={e => setCaption(e.target.value)}
              />
            </div>

            {state === 'error' && (
              <p className="text-sm text-red-600 text-center mb-3">Upload failed. Please try again.</p>
            )}

            <button
              className="btn-primary"
              disabled={files.length === 0 || state === 'uploading'}
              onClick={handleSubmit}
            >
              {state === 'uploading' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Uploading & analysing...
                </span>
              ) : `Submit ${files.length > 0 ? `${files.length} Photo${files.length > 1 ? 's' : ''}` : ''} →`}
            </button>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
