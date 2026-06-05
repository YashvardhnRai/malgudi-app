export const MANAGER_PRESENCE_CHANNEL = 'malgudi-manager-presence'
export const MANAGER_DEVICE_STORAGE_KEY = 'malgudi-manager-device-id'
export const MANAGER_PRESENCE_STALE_MS = 90_000

export type ManagerPresencePayload = {
  outlet_id: string
  outlet_name: string
  outlet_city: string
  manager_name: string
  manager_phone: string | null
  user_email: string | null
  device_id: string
  route: string
  online_at: string
  last_seen_at: string
}

export type ManagerPresenceSummary = ManagerPresencePayload & {
  connections: number
}

export function isFreshManagerPresence(
  presence: Pick<ManagerPresencePayload, 'last_seen_at'>,
  now = Date.now()
) {
  const lastSeen = new Date(presence.last_seen_at).getTime()
  return Number.isFinite(lastSeen) && now - lastSeen <= MANAGER_PRESENCE_STALE_MS
}
