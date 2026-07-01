'use client'

import { useEffect, useMemo, useState } from 'react'
import { Radio, Wifi } from 'lucide-react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import {
  MANAGER_DEVICE_STORAGE_KEY,
  MANAGER_PRESENCE_CHANNEL,
  type ManagerPresencePayload,
} from '@/lib/presence'

type PresenceState = 'idle' | 'connecting' | 'online' | 'offline'

type Props = {
  enabled?: boolean
  outletId: string
  outletName?: string | null
  outletCity?: string | null
  managerName?: string | null
  managerPhone?: string | null
  userEmail?: string | null
}

function getManagerDeviceId() {
  const saved = window.localStorage.getItem(MANAGER_DEVICE_STORAGE_KEY)
  if (saved) return saved

  const next =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`

  window.localStorage.setItem(MANAGER_DEVICE_STORAGE_KEY, next)
  return next
}

export default function ManagerPresenceHeartbeat({
  enabled = true,
  outletId,
  outletName,
  outletCity,
  managerName,
  managerPhone,
  userEmail,
}: Props) {
  const [state, setState] = useState<PresenceState>(
    isSupabaseConfigured && enabled ? 'connecting' : 'offline'
  )

  const displayState = useMemo(() => {
    if (!isSupabaseConfigured) return 'Database unavailable'
    if (state === 'online') return 'CEO sees online'
    if (state === 'connecting') return 'Going online'
    return 'Presence offline'
  }, [state])

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured || !outletId) return

    let closed = false
    let intervalId: number | null = null
    const supabase = createClient()
    const deviceId = getManagerDeviceId()
    const onlineAt = new Date().toISOString()
    const presenceKey = `${outletId}:${deviceId}`

    const channel = supabase.channel(MANAGER_PRESENCE_CHANNEL, {
      config: {
        presence: {
          enabled: true,
          key: presenceKey,
        },
      },
    })

    async function trackPresence() {
      if (closed) return

      const {
        data: { user },
      } = await supabase.auth.getUser()

      const payload: ManagerPresencePayload = {
        outlet_id: outletId,
        outlet_name: outletName || 'Outlet',
        outlet_city: outletCity || '',
        manager_name: managerName || userEmail || user?.email || 'Manager',
        manager_phone: managerPhone || null,
        user_email: userEmail || user?.email || null,
        device_id: deviceId,
        route: window.location.pathname,
        online_at: onlineAt,
        last_seen_at: new Date().toISOString(),
      }

      const result = await channel.track(payload)
      if (!closed) setState(result === 'ok' ? 'online' : 'offline')
    }

    function startHeartbeat() {
      void trackPresence()
      if (intervalId !== null) return
      intervalId = window.setInterval(() => {
        void trackPresence()
      }, 30_000)
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') void trackPresence()
    }

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') startHeartbeat()
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        setState('offline')
      }
    })

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      closed = true
      if (intervalId !== null) window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      void channel.untrack()
      void supabase.removeChannel(channel)
    }
  }, [
    enabled,
    managerName,
    managerPhone,
    outletCity,
    outletId,
    outletName,
    userEmail,
  ])

  if (!enabled) return null

  return (
    <div className={`manager-presence-pill is-${state}`}>
      {state === 'online' ? <Wifi size={13} /> : <Radio size={13} />}
      <strong>{displayState}</strong>
    </div>
  )
}
