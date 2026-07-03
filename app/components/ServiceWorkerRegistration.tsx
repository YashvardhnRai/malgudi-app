'use client'

import { useEffect } from 'react'

const DIRTY_CHECK_RETRY_MS = 4000

function hasUnsavedFormInput() {
  const fields = document.querySelectorAll('input, textarea')
  for (const field of Array.from(fields)) {
    if (field instanceof HTMLInputElement) {
      if (field.type === 'checkbox' || field.type === 'radio' || field.type === 'file') continue
      if (field.value.trim().length > 0) return true
    } else if (field instanceof HTMLTextAreaElement) {
      if (field.value.trim().length > 0) return true
    }
  }
  return false
}

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' ||
      !('serviceWorker' in navigator)
    ) {
      return
    }

    let reloading = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    // A new deploy shouldn't wipe an in-progress form (sales, inventory,
    // counter-round notes, etc.) mid-shift — wait for the form to clear
    // (submitted, reset, or the user navigated to a page without one)
    // before reloading to pick up the new service worker.
    const reloadWhenSafe = () => {
      if (reloading) return
      if (hasUnsavedFormInput()) {
        retryTimer = setTimeout(reloadWhenSafe, DIRTY_CHECK_RETRY_MS)
        return
      }
      reloading = true
      window.location.reload()
    }

    const handleControllerChange = () => {
      reloadWhenSafe()
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    navigator.serviceWorker
      .register('/sw.js?v=20260630', { updateViaCache: 'none' })
      .then((registration) => {
        void registration.update()
        if (registration.waiting) registration.waiting.postMessage('SKIP_WAITING')
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              worker.postMessage('SKIP_WAITING')
            }
          })
        })
      })
      .catch(() => {})

    return () => {
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange
      )
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [])

  return null
}
