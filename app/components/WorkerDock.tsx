'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Camera,
  ClipboardCheck,
  Home,
  MessageSquareWarning,
  PhoneCall,
} from 'lucide-react'

interface Props {
  outletId?: string | null
  managerPhone?: string | null
}

export default function WorkerDock({ outletId, managerPhone }: Props) {
  const pathname = usePathname()
  const effectiveOutletId = outletId ?? ''
  const managerHref = effectiveOutletId ? `/manager/${effectiveOutletId}` : '/worker'
  const uploadHref = effectiveOutletId
    ? { pathname: '/upload', query: { outlet: effectiveOutletId } }
    : '/upload'

  const items = [
    {
      href: '/worker',
      label: 'Home',
      Icon: Home,
      active: pathname === '/worker',
    },
    {
      href: managerHref,
      label: 'Shift',
      Icon: ClipboardCheck,
      active: pathname.startsWith('/manager'),
    },
    {
      href: uploadHref,
      label: 'Upload',
      Icon: Camera,
      active: pathname === '/upload',
    },
    {
      href: '/complaints',
      label: 'Issues',
      Icon: MessageSquareWarning,
      active: pathname === '/complaints',
    },
  ]

  return (
    <nav className="worker-dock" aria-label="Worker navigation">
      <div className="worker-dock-inner">
        {items.map((item) => {
          const Icon = item.Icon
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`worker-dock-item ${item.active ? 'is-active' : ''}`}
              aria-current={item.active ? 'page' : undefined}
              prefetch={false}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          )
        })}

        {managerPhone ? (
          <a href={`tel:${managerPhone}`} className="worker-dock-call">
            <PhoneCall size={18} />
            <span>Call</span>
          </a>
        ) : (
          <span className="worker-dock-call is-disabled">
            <PhoneCall size={18} />
            <span>Call</span>
          </span>
        )}
      </div>
    </nav>
  )
}
