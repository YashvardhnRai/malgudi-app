'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  ClipboardCheck,
  Download,
  ExternalLink,
  Loader2,
  MapPin,
  Printer,
  ShieldCheck,
  Smartphone,
  Store,
  UsersRound,
} from 'lucide-react'
import MalgudiLogo from '@/app/components/MalgudiLogo'
import QRCodeBlock from '@/app/components/QRCodeBlock'
import type { Outlet } from '@/lib/types'

const OUTLET_STORAGE_KEY = 'malgudi-worker-outlet'
const OUTLET_DATA_STORAGE_KEY = 'malgudi-worker-outlet-data'
const APP_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://malgudi-app.vercel.app').replace(
  /\/$/,
  ''
)

const CHECKS = [
  'Open this launch kit on the manager phone.',
  'Select the restaurant outlet below.',
  'Scan Worker Home QR on every staff phone.',
  'Tap Install or Add to Home Screen.',
  'Open Shift Board and upload the first photo proof.',
  'CEO verifies the upload on dashboard.',
]

export default function LaunchPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [selectedOutletId, setSelectedOutletId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    fetch('/api/outlets')
      .then((response) => response.json())
      .then((data: { outlets?: Outlet[] }) => {
        if (!mounted) return
        const nextOutlets = data.outlets ?? []
        const savedOutletId = window.localStorage.getItem(OUTLET_STORAGE_KEY) ?? ''
        const preferredOutlet =
          nextOutlets.find((outlet) => outlet.id === savedOutletId) ?? nextOutlets[0]

        setOutlets(nextOutlets)
        setSelectedOutletId(preferredOutlet?.id ?? '')
        if (preferredOutlet) {
          window.localStorage.setItem(OUTLET_STORAGE_KEY, preferredOutlet.id)
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

  const workerUrl = `${APP_ORIGIN}/worker`
  const shiftUrl = selectedOutlet
    ? `${APP_ORIGIN}/manager/${selectedOutlet.id}`
    : workerUrl
  const uploadUrl = selectedOutlet
    ? `${APP_ORIGIN}/upload?outlet=${selectedOutlet.id}`
    : `${APP_ORIGIN}/upload`

  async function shareLaunch() {
    const url = workerUrl
    try {
      if (!navigator.share) {
        await navigator.clipboard?.writeText(url)
        return
      }

      await navigator.share({
        title: 'Malgudi worker app',
        text: 'Scan or open this to start Malgudi shift checks.',
        url,
      })
    } catch {
      // Sharing and clipboard permissions vary heavily on staff phones.
    }
  }

  return (
    <main className="launch-page">
      <section className="launch-shell">
        <header className="launch-hero">
          <div className="launch-topbar">
            <Link href="/worker" className="launch-brand" aria-label="Open worker app">
              <MalgudiLogo size={42} />
              <span>
                <strong>MALGUDI</strong>
                <small>Restaurant launch kit</small>
              </span>
            </Link>

            <div className="launch-actions no-print">
              <button type="button" onClick={shareLaunch}>
                <Download size={16} />
                Share
              </button>
              <button type="button" onClick={() => window.print()}>
                <Printer size={16} />
                Print
              </button>
            </div>
          </div>

          <div className="launch-hero-grid">
            <div>
              <span className="launch-kicker">
                <BadgeCheck size={14} />
                Day one setup
              </span>
              <h1>Start Malgudi at the restaurant.</h1>
              <p>
                Scan, install, select outlet, and begin photo proof checks from any
                staff phone in under two minutes.
              </p>
            </div>

            <div className="launch-outlet-panel">
              <span>Selected outlet</span>
              {loading ? (
                <div className="launch-loading">
                  <Loader2 size={18} className="spin" />
                  Loading outlets
                </div>
              ) : outlets.length ? (
                <>
                  <select
                    value={selectedOutletId}
                    onChange={(event) => selectOutlet(event.target.value)}
                  >
                    {outlets.map((outlet) => (
                      <option key={outlet.id} value={outlet.id}>
                        {outlet.name} - {outlet.city}
                      </option>
                    ))}
                  </select>
                  <div className="launch-selected">
                    <Store size={18} />
                    <strong>{selectedOutlet?.name}</strong>
                    <small>
                      <MapPin size={12} />
                      {selectedOutlet?.city}
                    </small>
                  </div>
                </>
              ) : (
                <div className="launch-loading">No outlets found</div>
              )}
            </div>
          </div>
        </header>

        <section className="launch-step-grid">
          <div>
            <Smartphone size={18} />
            <span>1</span>
            <strong>Scan</strong>
            <p>Open Worker Home on each staff phone.</p>
          </div>
          <div>
            <ShieldCheck size={18} />
            <span>2</span>
            <strong>Install</strong>
            <p>Add Malgudi to the phone home screen.</p>
          </div>
          <div>
            <ClipboardCheck size={18} />
            <span>3</span>
            <strong>Run Shift</strong>
            <p>Tap scheduled checks and upload fresh proof.</p>
          </div>
          <div>
            <Camera size={18} />
            <span>4</span>
            <strong>Verify</strong>
            <p>CEO sees uploads, alerts, and complaints live.</p>
          </div>
        </section>

        <section className="launch-qr-grid">
          <QRCodeBlock
            title="Worker Home"
            description="Best QR for staff phones. Selects outlet and opens daily actions."
            url={workerUrl}
          />
          <QRCodeBlock
            title="Shift Board"
            description="Directly opens the selected outlet checklist and photo proof screen."
            url={shiftUrl}
          />
          <QRCodeBlock
            title="Photo Upload"
            description="Direct upload route for quick counter or kitchen proof."
            url={uploadUrl}
          />
        </section>

        <section className="launch-check-panel">
          <div className="launch-section-head">
            <span>Manager script</span>
            <h2>Before first service</h2>
          </div>
          <div className="launch-check-list">
            {CHECKS.map((check, index) => (
              <div key={check} className="launch-check">
                <span>{index + 1}</span>
                <strong>{check}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="launch-link-panel no-print">
          <Link href="/worker">
            <Smartphone size={17} />
            Worker app
            <ArrowRight size={16} />
          </Link>
          <Link href="/dashboard">
            <ShieldCheck size={17} />
            CEO dashboard
            <ArrowRight size={16} />
          </Link>
          <Link href="/admin/users">
            <UsersRound size={17} />
            Add staff
            <ArrowRight size={16} />
          </Link>
          <a href={workerUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={17} />
            Open live URL
            <ArrowRight size={16} />
          </a>
        </section>
      </section>
    </main>
  )
}
