import type { ChecklistSubmission, PhotoUpload } from '@/lib/types'

export type OperationsSlot = {
  key: string
  hour: number
  label: string
  checklistType: ChecklistSubmission['checklist_type']
  category: PhotoUpload['category']
}

export const OPERATIONS_SLOTS: OperationsSlot[] = [
  {
    key: 'opening-08',
    hour: 8,
    label: 'Opening Checklist',
    checklistType: 'OPENING',
    category: 'FOOD_QUALITY',
  },
  {
    key: 'cleanliness-16',
    hour: 16,
    label: 'Afternoon Clean',
    checklistType: 'CLEANLINESS',
    category: 'CLEANLINESS',
  },
  {
    key: 'cleanliness-20',
    hour: 20,
    label: 'Evening Clean',
    checklistType: 'CLEANLINESS',
    category: 'CLEANLINESS',
  },
  {
    key: 'closing-22',
    hour: 22,
    label: 'Closing Checklist',
    checklistType: 'CLOSING',
    category: 'CLOSING',
  },
]

export function getIstParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  }
}

export function getIstDateRange(date = new Date()) {
  const { date: dateString } = getIstParts(date)
  const start = new Date(`${dateString}T00:00:00+05:30`)
  const end = new Date(`${dateString}T23:59:59.999+05:30`)
  return {
    date: dateString,
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

export function getSlotByKey(slotKey: string | null | undefined) {
  return OPERATIONS_SLOTS.find((slot) => slot.key === slotKey) ?? null
}

export function getSlotWindow(slot: OperationsSlot, date = new Date()) {
  const { date: dateString } = getIstParts(date)
  const nextSlot = OPERATIONS_SLOTS.find((candidate) => candidate.hour > slot.hour)
  const start = new Date(
    `${dateString}T${String(slot.hour).padStart(2, '0')}:00:00+05:30`
  )
  const endHour = nextSlot?.hour ?? 24
  const end =
    endHour === 24
      ? new Date(new Date(`${dateString}T00:00:00+05:30`).getTime() + 24 * 60 * 60 * 1000)
      : new Date(
          `${dateString}T${String(endHour).padStart(2, '0')}:00:00+05:30`
        )

  return { start: start.toISOString(), end: end.toISOString() }
}

export function encodeChecklistNotes(slotKey: string, note?: string | null) {
  return JSON.stringify({
    slot_key: slotKey,
    note: note?.trim() || null,
  })
}

export function decodeChecklistNotes(notes: string | null | undefined): {
  slotKey: string | null
  note: string | null
} {
  if (!notes) return { slotKey: null, note: null }

  try {
    const parsed = JSON.parse(notes) as { slot_key?: unknown; note?: unknown }
    return {
      slotKey: typeof parsed.slot_key === 'string' ? parsed.slot_key : null,
      note: typeof parsed.note === 'string' ? parsed.note : null,
    }
  } catch {
    return { slotKey: null, note: notes }
  }
}

export function inferLegacySlotKey(
  submission: Pick<ChecklistSubmission, 'checklist_type' | 'submission_time'>
) {
  const submitted = getIstParts(new Date(submission.submission_time))
  const matching = OPERATIONS_SLOTS.filter(
    (slot) => slot.checklistType === submission.checklist_type
  )
  const closest = matching
    .map((slot) => ({ slot, distance: Math.abs(slot.hour - submitted.hour) }))
    .sort((a, b) => a.distance - b.distance)[0]

  return closest && closest.distance <= 1 ? closest.slot.key : null
}
