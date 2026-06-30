import { getIstParts } from './operations'

export type CounterRoundItemKey =
  | 'BATTER'
  | 'COCONUT_CHUTNEY'
  | 'RED_CHUTNEY'
  | 'SAMBAR'
  | 'COUNTER'

export type CounterRoundItemDefinition = {
  key: CounterRoundItemKey
  label: string
  shortLabel: string
  instruction: string
  temperatureRequired: boolean
}

export type CounterRoundSlot = {
  key: string
  hour: number
  minute: number
  label: string
}

export const COUNTER_ROUND_ITEMS: CounterRoundItemDefinition[] = [
  {
    key: 'BATTER',
    label: 'All batter types',
    shortLabel: 'Batters',
    instruction: 'Show every batter container and the thermometer reading.',
    temperatureRequired: true,
  },
  {
    key: 'COCONUT_CHUTNEY',
    label: 'Coconut chutney',
    shortLabel: 'Coconut',
    instruction: 'Show the coconut chutney and thermometer reading.',
    temperatureRequired: true,
  },
  {
    key: 'RED_CHUTNEY',
    label: 'Red chutney',
    shortLabel: 'Red chutney',
    instruction: 'Show the red chutney and thermometer reading.',
    temperatureRequired: true,
  },
  {
    key: 'SAMBAR',
    label: 'Sambar',
    shortLabel: 'Sambar',
    instruction: 'Show the sambar and thermometer reading.',
    temperatureRequired: true,
  },
  {
    key: 'COUNTER',
    label: 'Full kitchen counter',
    shortLabel: 'Counter',
    instruction: 'Take one wide photo showing the complete service counter.',
    temperatureRequired: false,
  },
]

export const COUNTER_ROUND_SLOTS: CounterRoundSlot[] = [
  7, 9, 11, 13, 15, 17, 19, 21,
].map((hour) => ({
  key: `counter-${String(hour).padStart(2, '0')}30`,
  hour,
  minute: 30,
  label: `${formatCounterRoundTime(hour, 30)} counter round`,
}))

export function counterRoundMinutes(slot: Pick<CounterRoundSlot, 'hour' | 'minute'>) {
  return slot.hour * 60 + slot.minute
}

export function formatCounterRoundTime(hour: number, minute: number) {
  const displayHour = hour % 12 || 12
  return `${displayHour}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`
}

export function getCounterRoundSlot(slotKey: string | null | undefined) {
  return COUNTER_ROUND_SLOTS.find((slot) => slot.key === slotKey) ?? null
}

export function getCounterRoundWindow(slot: CounterRoundSlot, date = new Date()) {
  const { date: dateString } = getIstParts(date)
  const start = new Date(
    `${dateString}T${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}:00+05:30`
  )
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
  return { start: start.toISOString(), end: end.toISOString() }
}

export function getDueCounterRoundSlots(date = new Date(), graceMinutes = 0) {
  const ist = getIstParts(date)
  const nowMinutes = ist.hour * 60 + ist.minute
  return COUNTER_ROUND_SLOTS.filter(
    (slot) => nowMinutes >= counterRoundMinutes(slot) + graceMinutes
  )
}

export function getCurrentCounterRoundSlot(date = new Date()) {
  return getDueCounterRoundSlots(date).at(-1) ?? null
}

export function isCounterRoundLate(slot: CounterRoundSlot, date = new Date()) {
  const ist = getIstParts(date)
  return ist.hour * 60 + ist.minute > counterRoundMinutes(slot) + 30
}
