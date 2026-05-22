'use client'

import Link from 'next/link'
import type { OutletWithStatus } from '@/lib/types'

interface Props {
  outlet: OutletWithStatus
}

const STATUS_LEFT_COLOR: Record<string, string> = {
  GREEN: '#22C55E',
  AMBER: '#F4A623',
  RED: '#EF4444',
}

const STATUS_DOT: Record<string, string> = {
  GREEN: 'bg-green-500',
  AMBER: 'bg-amber-500',
  RED: 'bg-red-500',
}

function formatSales(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n}`
}

export default function OutletCard({ outlet }: Props) {
  const borderColor = STATUS_LEFT_COLOR[outlet.status] ?? '#E5E7EB'
  const dotClass = STATUS_DOT[outlet.status] ?? 'bg-gray-400'
  const allDone = outlet.checklists_total > 0 && outlet.checklists_done >= outlet.checklists_total

  return (
    <Link href={`/outlet/${outlet.id}`} className="block">
      <div
        className="outlet-card bg-white p-4"
        style={{
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(27,43,94,0.08)',
          border: '1px solid #E5E7EB',
          borderLeftWidth: '4px',
          borderLeftColor: borderColor,
          borderLeftStyle: 'solid',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotClass} ${outlet.status === 'RED' ? 'status-dot-red' : ''}`}
            />
            <p
              className="font-bold leading-tight truncate"
              style={{ color: '#1B2B5E', fontSize: 16, fontWeight: 700 }}
            >
              {outlet.name}
            </p>
          </div>
          <svg className="w-4 h-4 text-gray-300 shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>

        <p className="text-xs text-gray-400 mb-3">{outlet.last_update ?? 'No updates yet'}</p>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Sales</span>
            <span className="text-xs font-bold" style={{ color: '#F4A623' }}>
              {formatSales(outlet.today_sales)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Complaints</span>
            <span
              className="text-xs font-bold"
              style={{ color: outlet.complaint_count > 0 ? '#EF4444' : '#22C55E' }}
            >
              {outlet.complaint_count === 0 ? 'None' : outlet.complaint_count}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">Checklists</span>
            <span
              className="text-xs font-semibold"
              style={{
                color: allDone ? '#22C55E' : outlet.status === 'RED' ? '#EF4444' : '#F59E0B',
              }}
            >
              {outlet.checklists_total === 0 ? '0/4 done' : `${outlet.checklists_done}/${outlet.checklists_total}`}
              {allDone && ' ✓'}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
