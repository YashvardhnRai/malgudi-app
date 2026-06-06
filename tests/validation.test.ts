import { describe, expect, it } from 'vitest'
import { cleanText, isEmail, isUuid, PHOTO_CATEGORIES } from '../lib/validation'

describe('API validation helpers', () => {
  it('accepts UUIDs and rejects lookalikes', () => {
    expect(isUuid('085814b0-d324-4021-a148-f730ab877085')).toBe(true)
    expect(isUuid('not-a-uuid')).toBe(false)
  })

  it('normalizes bounded text without coercing other types', () => {
    expect(cleanText('  kitchen ready  ', 20)).toBe('kitchen ready')
    expect(cleanText('abcdefgh', 4)).toBe('abcd')
    expect(cleanText(42, 10)).toBe('')
  })

  it('validates operational email and photo category inputs', () => {
    expect(isEmail('manager@malgudi.com')).toBe(true)
    expect(isEmail('manager@malgudi')).toBe(false)
    expect(PHOTO_CATEGORIES.has('BANMARIE')).toBe(true)
  })
})
