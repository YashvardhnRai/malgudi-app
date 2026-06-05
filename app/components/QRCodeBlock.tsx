'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

interface Props {
  title: string
  description: string
  url: string
}

export default function QRCodeBlock({ title, description, url }: Props) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    let mounted = true

    QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 360,
      color: {
        dark: '#12172B',
        light: '#FFFAF3',
      },
    })
      .then((dataUrl) => {
        if (mounted) setSrc(dataUrl)
      })
      .catch(() => {
        if (mounted) setSrc('')
      })

    return () => {
      mounted = false
    }
  }, [url])

  return (
    <article className="qr-card">
      <div className="qr-image-wrap">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={`${title} QR code`} />
        ) : (
          <div className="qr-placeholder">QR</div>
        )}
      </div>
      <div className="qr-copy">
        <span>{title}</span>
        <p>{description}</p>
        <code>{url}</code>
      </div>
    </article>
  )
}
