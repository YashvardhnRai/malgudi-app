import { describe, expect, it } from 'vitest'
import {
  decodeChecklistNotes,
  encodeChecklistNotes,
  getIstDateRange,
  getSlotByKey,
  getSlotWindow,
  inferLegacySlotKey,
  OPERATIONS_SLOTS,
} from '../lib/operations'

describe('operations schedule', () => {
  it('contains the eight canonical restaurant checks', () => {
    expect(OPERATIONS_SLOTS).toHaveLength(8)
    expect(new Set(OPERATIONS_SLOTS.map((slot) => slot.key)).size).toBe(8)
    expect(OPERATIONS_SLOTS.map((slot) => slot.hour)).toEqual([
      8, 10, 12, 14, 16, 18, 20, 22,
    ])
  })

  it('round-trips slot metadata through checklist notes', () => {
    const encoded = encodeChecklistNotes('banmarie-12', 'Counter replenished')
    expect(decodeChecklistNotes(encoded)).toEqual({
      slotKey: 'banmarie-12',
      note: 'Counter replenished',
    })
  })

  it('keeps legacy plain-text notes readable', () => {
    expect(decodeChecklistNotes('All surfaces cleaned')).toEqual({
      slotKey: null,
      note: 'All surfaces cleaned',
    })
  })

  it('infers only a nearby legacy slot of the same checklist type', () => {
    expect(
      inferLegacySlotKey({
        checklist_type: 'BANMARIE',
        submission_time: '2026-06-06T06:35:00.000Z',
      })
    ).toBe('banmarie-12')
    expect(
      inferLegacySlotKey({
        checklist_type: 'OPENING',
        submission_time: '2026-06-06T10:30:00.000Z',
      })
    ).toBeNull()
  })

  it('creates IST day and slot boundaries', () => {
    const date = new Date('2026-06-06T07:00:00.000Z')
    expect(getIstDateRange(date)).toEqual({
      date: '2026-06-06',
      start: '2026-06-05T18:30:00.000Z',
      end: '2026-06-06T18:29:59.999Z',
    })

    const slot = getSlotByKey('banmarie-12')
    expect(slot).not.toBeNull()
    expect(getSlotWindow(slot!, date)).toEqual({
      start: '2026-06-06T06:30:00.000Z',
      end: '2026-06-06T08:30:00.000Z',
    })
  })
})
