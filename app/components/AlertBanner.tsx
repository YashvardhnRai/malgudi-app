'use client'

import type { Alert } from '@/lib/types'

interface Props {
  alerts: Alert[]
  outletMap?: Record<string, string>
}

function formatAlertMessage(alert: Alert, outletMap?: Record<string, string>): string {
  const outletName = alert.outlet_id && outletMap?.[alert.outlet_id]
    ? outletMap[alert.outlet_id].toUpperCase()
    : null
  if (outletName && !alert.message.toUpperCase().includes(outletName)) {
    return `${outletName} — ${alert.message}`
  }
  return alert.message
}

export default function AlertBanner({ alerts, outletMap }: Props) {
  if (alerts.length === 0) return null

  const critical = alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH')
  const displayAlerts = critical.length > 0 ? critical : alerts

  return (
    <div
      className="rounded-xl p-4 mb-4"
      style={{
        backgroundColor: '#FEF2F2',
        border: '1px solid #FCA5A5',
        borderLeft: '4px solid #EF4444',
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0">⚠</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm mb-1" style={{ color: '#991B1B' }}>
            {displayAlerts.length} alert{displayAlerts.length > 1 ? 's' : ''} require attention
          </p>
          <div className="space-y-1">
            {displayAlerts.slice(0, 3).map(alert => (
              <p key={alert.id} className="text-xs leading-relaxed" style={{ color: '#991B1B' }}>
                {formatAlertMessage(alert, outletMap)}
              </p>
            ))}
            {alerts.length > 3 && (
              <p className="text-xs" style={{ color: '#B91C1C' }}>
                +{alerts.length - 3} more alerts
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
