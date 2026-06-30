import 'server-only'

import { getSupabaseServerClient } from '@/lib/supabase'

const PUBLIC_PHOTO_MARKER = '/storage/v1/object/public/photos/'
const SIGNED_URL_SECONDS = 6 * 60 * 60

function getPhotoPath(value: string | null | undefined) {
  if (!value) return null
  if (!value.startsWith('http://') && !value.startsWith('https://')) {
    return value.replace(/^\/+/, '')
  }

  try {
    const url = new URL(value)
    const markerIndex = url.pathname.indexOf(PUBLIC_PHOTO_MARKER)
    if (markerIndex < 0) return null
    return decodeURIComponent(
      url.pathname.slice(markerIndex + PUBLIC_PHOTO_MARKER.length)
    )
  } catch {
    return null
  }
}

export async function signPhotoRows<T extends { photo_url: string | null }>(rows: T[]) {
  if (!rows.length) return rows
  const supabase = getSupabaseServerClient()

  return Promise.all(
    rows.map(async (row) => {
      const path = getPhotoPath(row.photo_url)
      if (!path) return row
      const { data, error } = await supabase.storage
        .from('photos')
        .createSignedUrl(path, SIGNED_URL_SECONDS)
      return {
        ...row,
        photo_url: error ? null : data.signedUrl,
      }
    })
  )
}
