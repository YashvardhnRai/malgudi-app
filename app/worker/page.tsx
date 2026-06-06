'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  MapPin,
  MessageSquareWarning,
  PhoneCall,
  ShieldCheck,
  Store,
} from 'lucide-react'
import ConnectionStatus from '@/app/components/ConnectionStatus'
import MalgudiLogo from '@/app/components/MalgudiLogo'
import PWAInstallButton from '@/app/components/PWAInstallButton'
import WorkerDock from '@/app/components/WorkerDock'
import WorkerShareButton from '@/app/components/WorkerShareButton'
import type { Outlet } from '@/lib/types'

const OUTLET_STORAGE_KEY = 'malgudi-worker-outlet'
const OUTLET_DATA_STORAGE_KEY = 'malgudi-worker-outlet-data'

export default function WorkerPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [selectedOutletId, setSelectedOutletId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    fetch('/api/outlets/directory')
      .then((response) => response.json())
      .then((data: { outlets?: Outlet[] }) => {
        if (!mounted) return

        const nextOutlets = data.outlets ?? []
        const savedOutletId = window.localStorage.getItem(OUTLET_STORAGE_KEY) ?? ''
        const preferredOutlet =
          nextOutlets.find((outlet) => outlet.id === savedOutletId) ??
          nextOutlets[0]

        setOutlets(nextOutlets)
        setSelectedOutletId(preferredOutlet?.id ?? '')
        if (preferredOutlet) {
          window.localStorage.setItem(
            OUTLET_DATA_STORAGE_KEY,
            JSON.stringify(preferredOutlet)
          )
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    fetch('/api/me')
      .then(async (response) => {
        if (!response.ok) return null
        return response.json() as Promise<{
          user?: { outlet_id?: string | null }
        }>
      })
      .then(async (session) => {
        const assignedOutletId = session?.user?.outlet_id
        if (!mounted || !assignedOutletId) return

        const response = await fetch(`/api/outlets/${assignedOutletId}`)
        if (!response.ok) return
        const detail = (await response.json()) as { outlet?: Outlet }
        if (!mounted || !detail.outlet) return

        setOutlets((current) => {
          const others = current.filter((outlet) => outlet.id !== detail.outlet!.id)
          return [detail.outlet!, ...others]
        })
        setSelectedOutletId(detail.outlet.id)
        window.localStorage.setItem(OUTLET_STORAGE_KEY, detail.outlet.id)
        window.localStorage.setItem(
          OUTLET_DATA_STORAGE_KEY,
          JSON.stringify(detail.outlet)
        )
      })
      .catch(() => {})

    return () => {
      mounted = false
    }
  }, [])

  const selectedOutlet = useMemo(
    () => outlets.find((outlet) => outlet.id === selectedOutletId) ?? null,
    [outlets, selectedOutletId]
  )

  function selectOutlet(outletId: string) {
    const outlet = outlets.find((item) => item.id === outletId)
    setSelectedOutletId(outletId)
    window.localStorage.setItem(OUTLET_STORAGE_KEY, outletId)
    if (outlet) {
      window.localStorage.setItem(OUTLET_DATA_STORAGE_KEY, JSON.stringify(outlet))
    }
  }

  const managerHref = selectedOutlet ? `/manager/${selectedOutlet.id}` : '/manager'
  const uploadHref = selectedOutlet
    ? { pathname: '/upload', query: { outlet: selectedOutlet.id } }
    : '/upload'

  return (
    <main className="worker-page">
      <section className="worker-shell">
        <header className="worker-hero">
          <div className="worker-topbar">
            <div className="worker-brand">
              <MalgudiLogo size={38} />
              <span>
                <strong>MALGUDI</strong>
                <small>Worker app</small>
              </span>
            </div>
            <div className="worker-top-actions">
              <ConnectionStatus />
              <WorkerShareButton />
              <PWAInstallButton />
            </div>
          </div>

          <div className="worker-hero-copy">
            <span className="worker-kicker">
              <ShieldCheck size={14} />
              Shift ready
            </span>
            <h1>{selectedOutlet?.name ?? 'Choose outlet'}</h1>
            <p>
              {selectedOutlet
                ? `${selectedOutlet.city} staff console`
                : 'Select the restaurant for this phone.'}
            </p>
          </div>
        </header>

        <section className="worker-action-grid" aria-label="Worker actions">
          <Link href={managerHref} className="worker-primary-action" prefetch={false}>
            <span>
              <ClipboardCheck size={20} />
            </span>
            <strong>Open shift board</strong>
            <ArrowRight size={18} />
          </Link>

          <Link href={uploadHref} className="worker-action" prefetch={false}>
            <Camera size={19} />
            <span>Upload proof</span>
          </Link>

          <Link href="/complaints" className="worker-action" prefetch={false}>
            <MessageSquareWarning size={19} />
            <span>Issues</span>
          </Link>

          {selectedOutlet?.manager_phone ? (
            <a href={`tel:${selectedOutlet.manager_phone}`} className="worker-action">
              <PhoneCall size={19} />
              <span>Call manager</span>
            </a>
          ) : (
            <span className="worker-action is-disabled">
              <PhoneCall size={19} />
              <span>No phone</span>
            </span>
          )}
        </section>

        <section className="worker-panel">
          <div className="worker-section-head">
            <div>
              <span>Outlet</span>
              <h2>Select restaurant</h2>
            </div>
            {loading ? <Loader2 size={19} className="spin" /> : <Store size={19} />}
          </div>

          {loading ? (
            <div className="worker-outlet-list">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="worker-outlet-skeleton" />
              ))}
            </div>
          ) : outlets.length === 0 ? (
            <div className="worker-empty">
              <Store size={24} />
              <strong>No outlets found</strong>
              <span>Check Supabase outlet data before handing this phone to staff.</span>
            </div>
          ) : (
            <div className="worker-outlet-list">
              {outlets.map((outlet) => {
                const selected = outlet.id === selectedOutletId
                return (
                  <button
                    type="button"
                    key={outlet.id}
                    className={`worker-outlet ${selected ? 'is-selected' : ''}`}
                    onClick={() => selectOutlet(outlet.id)}
                  >
                    <span>
                      <strong>{outlet.name}</strong>
                      <small>
                        <MapPin size={12} />
                        {outlet.city}
                      </small>
                    </span>
                    {selected && <CheckCircle2 size={20} />}
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <div className="worker-footer-links">
          <Link href="/launch">Launch kit</Link>
          <Link href="/auth">CEO sign in</Link>
          <Link href="/dashboard">Dashboard</Link>
        </div>

        <div className="worker-dock-spacer" />
      </section>

      <WorkerDock
        outletId={selectedOutlet?.id}
        managerPhone={selectedOutlet?.manager_phone}
      />
    </main>
  )
}
