'use client'

import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="system-state-page">
      <AlertTriangle size={36} />
      <span>Connection interrupted</span>
      <h1>The operations view could not load.</h1>
      <p>Your saved restaurant data is not changed. Retry the current view.</p>
      <button type="button" onClick={reset}>
        <RotateCcw size={17} />
        Retry
      </button>
    </main>
  )
}
