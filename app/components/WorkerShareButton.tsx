'use client'

import { useState } from 'react'
import { Check, Share2 } from 'lucide-react'

export default function WorkerShareButton() {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const url = `${window.location.origin}/worker`

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Malgudi worker app',
          text: 'Open the Malgudi worker app for shift checks and photo proof.',
          url,
        })
      } else {
        await navigator.clipboard.writeText(url)
      }

      navigator.vibrate?.(12)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      className={`worker-share ${copied ? 'is-copied' : ''}`}
      onClick={handleShare}
    >
      {copied ? <Check size={16} /> : <Share2 size={16} />}
      {copied ? 'Copied' : 'Share'}
    </button>
  )
}
