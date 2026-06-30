import { describe, expect, it } from 'vitest'
import {
  COUNTER_ROUND_ITEMS,
  COUNTER_ROUND_SLOTS,
  getCounterRoundSlot,
  getCounterRoundWindow,
} from '../lib/counter-rounds'
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
  it('keeps non-counter checks separate from temperature rounds', () => {
    expect(OPERATIONS_SLOTS).toHaveLength(4)
    expect(new Set(OPERATIONS_SLOTS.map((slot) => slot.key)).size).toBe(4)
    expect(OPERATIONS_SLOTS.map((slot) => slot.hour)).toEqual([8, 16, 20, 22])
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
        checklist_type: 'CLEANLINESS',
        submission_time: '2026-06-06T10:35:00.000Z',
      })
    ).toBe('cleanliness-16')
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

    const slot = getSlotByKey('cleanliness-16')
    expect(slot).not.toBeNull()
    expect(getSlotWindow(slot!, date)).toEqual({
      start: '2026-06-06T10:30:00.000Z',
      end: '2026-06-06T14:30:00.000Z',
    })
  })
})

describe('counter temperature rounds', () => {
  it('requires five proofs every two hours from 7:30 AM through 9:30 PM', () => {
    expect(COUNTER_ROUND_ITEMS).toHaveLength(5)
    expect(COUNTER_ROUND_ITEMS.filter((item) => item.temperatureRequired)).toHaveLength(4)
    expect(COUNTER_ROUND_SLOTS).toHaveLength(8)
    expect(COUNTER_ROUND_SLOTS.map((slot) => `${slot.hour}:${slot.minute}`)).toEqual([
      '7:30',
      '9:30',
      '11:30',
      '13:30',
      '15:30',
      '17:30',
      '19:30',
      '21:30',
    ])
  })

  it('creates a two-hour IST window for each round', () => {
    const slot = getCounterRoundSlot('counter-1130')
    expect(slot).not.toBeNull()
    expect(getCounterRoundWindow(slot!, new Date('2026-06-06T07:00:00.000Z'))).toEqual({
      start: '2026-06-06T06:00:00.000Z',
      end: '2026-06-06T08:00:00.000Z',
    })
  })
})
