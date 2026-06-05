'use client'
/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from 'react'

interface Issue {
  category: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  description: string
}

interface AnalysisResult {
  status: 'PASS' | 'FAIL'
  score: number
  issues: Issue[]
  summary: string
  recommendation: string
}

interface Props {
  outletId: string
  outletName?: string | null
  managerName?: string | null
  managerPhone?: string | null
}

const SEVERITY_ICON: Record<string, string> = { HIGH: '🔴', MEDIUM: '🟡', LOW: '🟢' }

export default function PhotoUpload({ outletId, outletName, managerName, managerPhone }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)
    setResult(null)

    const reader = new FileReader()
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string
      setPreview(dataUrl)

      const base64 = dataUrl.split(',')[1]
      const mediaType = file.type || 'image/jpeg'

      setLoading(true)
      try {
        const res = await fetch('/api/analyze-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, outlet_id: outletId, media_type: mediaType }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setResult(data)
      } catch {
        setError('Analysis failed. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const isPass = result?.status === 'PASS'

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />

      <button
        onClick={() => inputRef.current?.click()}
        className="btn-primary"
        style={{ width: '100%', marginTop: 12, minHeight: 44 }}
      >
        🔍 AI Photo Review
      </button>

      {preview && (
        <div style={{ marginTop: 12, borderRadius: 12, overflow: 'hidden', maxHeight: 200 }}>
          <img
            src={preview}
            alt="Upload preview"
            style={{ width: '100%', objectFit: 'cover', maxHeight: 200, display: 'block' }}
          />
        </div>
      )}

      {loading && (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          🔍 AI is analyzing...
        </div>
      )}

      {result && !loading && (
        <div
          style={{
            marginTop: 12,
            borderRadius: 16,
            border: `1px solid ${isPass ? '#86EFAC' : '#FECACA'}`,
            background: isPass ? '#F0FDF4' : '#FFF5F5',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: isPass ? 'none' : '1px solid #FECACA' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: isPass ? '#16A34A' : '#DC2626' }}>
              {isPass ? '✅' : '⚠️'} AI Review: {result.status} ({result.score}/10)
            </div>
            <div style={{ fontSize: 13, color: '#374151', marginTop: 4 }}>{result.summary}</div>
          </div>

          {!isPass && (
            <div style={{ padding: '16px 20px' }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#6B7280',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Issues found:
              </div>
              {result.issues.map((issue, i) => (
                <div key={i} style={{ fontSize: 13, color: '#374151', marginBottom: 6, lineHeight: 1.4 }}>
                  {SEVERITY_ICON[issue.severity] ?? '⚪'} {issue.category}: {issue.description}
                </div>
              ))}

              <div
                style={{
                  marginTop: 16,
                  padding: '12px 16px',
                  background: '#fff',
                  borderRadius: 10,
                  border: '1px solid #FECACA',
                }}
              >
                {outletName && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                    📍 {outletName}
                  </div>
                )}
                {managerName && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                    👤 {managerName}
                  </div>
                )}
                {managerPhone ? (
                  <a
                    href={`tel:${managerPhone}`}
                    className="btn-primary"
                    style={{
                      width: '100%',
                      textAlign: 'center',
                      display: 'block',
                      textDecoration: 'none',
                      minHeight: 44,
                      lineHeight: '44px',
                      borderRadius: 8,
                    }}
                  >
                    📞 Call Manager Now
                  </a>
                ) : (
                  <div style={{ fontSize: 12, color: '#EF4444' }}>No manager phone on file</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ marginTop: 8, fontSize: 13, color: '#EF4444' }}>{error}</div>
      )}
    </div>
  )
}
