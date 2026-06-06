import type { AppRole } from '@/lib/auth-server'
import type { PhotoUpload } from '@/lib/types'

export const PHOTO_CATEGORIES = new Set<PhotoUpload['category']>([
  'FOOD_QUALITY',
  'BANMARIE',
  'CLEANLINESS',
  'RAW_MATERIAL',
  'CLOSING',
  'DISH_AUDIT',
])

export const USER_ROLES = new Set<AppRole>(['CEO', 'MANAGER', 'STAFF'])

export function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  )
}

export function isEmail(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  )
}

export function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}
