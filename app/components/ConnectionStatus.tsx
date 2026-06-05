'use client'

import { useSyncExternalStore } from 'react'
import { Wifi, WifiOff } from 'lucide-react'

function subscribe(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)

  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function getSnapshot() {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

export default function ConnectionStatus() {
  const online = useSyncExternalStore(subscribe, getSnapshot, () => true)
  const Icon = online ? Wifi : WifiOff

  return (
    <span className={`connection-status ${online ? 'online' : 'offline'}`}>
      <Icon size={14} />
      {online ? 'Online' : 'Offline'}
    </span>
  )
}
