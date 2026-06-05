'use client'
/* eslint-disable @next/next/no-img-element */

import { useState } from 'react'
import type { PhotoUpload } from '@/lib/types'

interface Props {
  photos: PhotoUpload[]
  outletName?: (outletId: string) => string
}

const CATEGORY_COLORS: Record<string, string> = {
  FOOD_QUALITY: 'bg-orange-100',
  BANMARIE: 'bg-amber-100',
  CLEANLINESS: 'bg-blue-100',
  RAW_MATERIAL: 'bg-green-100',
  CLOSING: 'bg-purple-100',
  DISH_AUDIT: 'bg-pink-100',
}

const CATEGORY_EMOJIS: Record<string, string> = {
  FOOD_QUALITY: '🍛',
  BANMARIE: '🥘',
  CLEANLINESS: '✨',
  RAW_MATERIAL: '🥬',
  CLOSING: '🔒',
  DISH_AUDIT: '🍽️',
}

function timeStr(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

interface PhotoModalProps {
  photo: PhotoUpload
  outletLabel: string
  onClose: () => void
}

function PhotoModal({ photo, outletLabel, onClose }: PhotoModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm slide-up overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className={`h-56 flex items-center justify-center text-6xl ${CATEGORY_COLORS[photo.category] ?? 'bg-gray-100'}`}>
          {photo.photo_url
            ? <img src={photo.photo_url} alt={photo.caption ?? ''} className="w-full h-full object-cover" />
            : CATEGORY_EMOJIS[photo.category] ?? '📷'
          }
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {photo.category.replace('_', ' ')}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              photo.ai_status === 'APPROVED' ? 'bg-green-100 text-green-700' :
              photo.ai_status === 'FLAGGED' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {photo.ai_status === 'APPROVED' ? '✓ Approved' : photo.ai_status === 'FLAGGED' ? '⚠ Flagged' : 'Pending'}
            </span>
          </div>
          <p className="font-medium text-gray-900 text-sm mb-1">{outletLabel}</p>
          {photo.caption && <p className="text-sm text-gray-600 mb-2">{photo.caption}</p>}
          {photo.ai_notes && (
            <p className={`text-xs p-2 rounded-lg ${photo.ai_status === 'FLAGGED' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'}`}>
              AI: {photo.ai_notes}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-2">{timeStr(photo.created_at)}</p>
        </div>
        <div className="px-4 pb-4">
          <button onClick={onClose} className="w-full py-3 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PhotoGrid({ photos, outletName }: Props) {
  const [selected, setSelected] = useState<PhotoUpload | null>(null)

  if (photos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-2xl mb-2">📷</p>
        <p className="text-sm">No photos yet</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-1.5">
        {photos.map(photo => (
          <button
            key={photo.id}
            className={`photo-item aspect-square rounded-xl overflow-hidden relative ${
              CATEGORY_COLORS[photo.category] ?? 'bg-gray-100'
            } ${photo.ai_status === 'FLAGGED' ? 'ring-2 ring-red-500' : ''}`}
            onClick={() => setSelected(photo)}
          >
            {photo.photo_url ? (
              <img src={photo.photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <span className="text-2xl">{CATEGORY_EMOJIS[photo.category] ?? '📷'}</span>
              </div>
            )}
            {photo.ai_status === 'FLAGGED' && (
              <div className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">!</span>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent p-1.5">
              <p className="text-white text-[9px] font-medium truncate">{timeStr(photo.created_at)}</p>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <PhotoModal
          photo={selected}
          outletLabel={outletName ? outletName(selected.outlet_id) : selected.outlet_id}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
