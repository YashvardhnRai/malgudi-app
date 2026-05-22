'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  {
    href: '/manager',
    label: 'Home',
    icon: (active: boolean) => (
      <svg
        className="w-6 h-6"
        style={{ color: active ? '#1B2B5E' : '#9CA3AF' }}
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/upload',
    label: 'Upload',
    icon: (active: boolean) => (
      <svg
        className="w-6 h-6"
        style={{ color: active ? '#1B2B5E' : '#9CA3AF' }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: '/manager#tasks',
    label: 'Tasks',
    icon: (active: boolean) => (
      <svg
        className="w-6 h-6"
        style={{ color: active ? '#1B2B5E' : '#9CA3AF' }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: '/complaints',
    label: 'Complaints',
    icon: (active: boolean) => (
      <svg
        className="w-6 h-6"
        style={{ color: active ? '#1B2B5E' : '#9CA3AF' }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 shadow-lg"
      style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #E5E7EB' }}
    >
      <div className="max-w-lg mx-auto grid grid-cols-4 h-16">
        {ITEMS.map(item => {
          const active =
            pathname === item.href.split('#')[0] ||
            (item.href !== '/manager#tasks' &&
              item.href !== '/complaints' &&
              pathname.startsWith(item.href.split('#')[0]) &&
              item.href !== '/manager#tasks')
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 min-h-[44px]"
            >
              {item.icon(active)}
              <span
                className="text-[10px] font-semibold"
                style={{ color: active ? '#1B2B5E' : '#9CA3AF' }}
              >
                {item.label}
              </span>
              {active && (
                <div
                  className="absolute bottom-0 h-0.5 w-10 rounded-t-full"
                  style={{ backgroundColor: '#F4A623' }}
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
