'use client'

import { useEffect, useState } from 'react'
import { CloudOff, CloudUpload } from 'lucide-react'
import {
  flushPendingPhotoUploads,
  getPendingUploadCount,
} from '@/lib/photo-upload-client'

export default function OfflineUploadSync() {
  const [pending, setPending] = useState(0)
  const [sent, setSent] = useState(0)

  useEffect(() => {
    let mounted = true

    const refresh = async () => {
      const count = await getPendingUploadCount()
      if (mounted) setPending(count)
    }
    const sync = async () => {
      const result = await flushPendingPhotoUploads()
      if (!mounted) return
      setPending(result.remaining)
      if (result.sent) {
        setSent(result.sent)
        window.setTimeout(() => setSent(0), 4000)
      }
    }

    void refresh()
    if (navigator.onLine) void sync()

    window.addEventListener('online', sync)
    window.addEventListener('malgudi-upload-queued', refresh)
    window.addEventListener('malgudi-upload-sync', refresh)
    return () => {
      mounted = false
      window.removeEventListener('online', sync)
      window.removeEventListener('malgudi-upload-queued', refresh)
      window.removeEventListener('malgudi-upload-sync', refresh)
    }
  }, [])

  if (!pending && !sent) return null

  return (
    <div className={`offline-upload-status ${pending ? 'pending' : 'sent'}`} role="status">
      {pending ? <CloudOff size={16} /> : <CloudUpload size={16} />}
      <span>
        {pending
          ? `${pending} photo upload${pending === 1 ? '' : 's'} waiting for connection`
          : `${sent} queued upload${sent === 1 ? '' : 's'} sent`}
      </span>
    </div>
  )
}
