'use client'

type TaskStatus = 'DONE' | 'DUE_NOW' | 'UPCOMING' | 'OVERDUE' | 'MISSED'

interface Props {
  label: string
  time: string
  status: TaskStatus
  note?: string
  onClick?: () => void
}

const CONFIG: Record<TaskStatus, {
  bg: string; border: string; icon: string; labelColor: string; badgeText: string; badgeBg: string
}> = {
  DONE:     { bg: 'bg-green-50',  border: 'border-green-200', icon: '✅', labelColor: 'text-green-800',  badgeText: '',         badgeBg: '' },
  DUE_NOW:  { bg: 'bg-orange-50', border: 'border-orange-300', icon: '📸', labelColor: 'text-orange-900', badgeText: 'DUE NOW',  badgeBg: 'bg-orange-500 text-white' },
  UPCOMING: { bg: 'bg-white',     border: 'border-gray-200',  icon: '🔜', labelColor: 'text-gray-700',   badgeText: '',         badgeBg: '' },
  OVERDUE:  { bg: 'bg-red-50',    border: 'border-red-300',   icon: '⚠️', labelColor: 'text-red-900',    badgeText: 'OVERDUE',  badgeBg: 'bg-red-500 text-white' },
  MISSED:   { bg: 'bg-red-50',    border: 'border-red-200',   icon: '❌', labelColor: 'text-red-700',    badgeText: 'MISSED',   badgeBg: 'bg-red-100 text-red-700' },
}

export default function TaskCard({ label, time, status, note, onClick }: Props) {
  const cfg = CONFIG[status]
  const clickable = status === 'DUE_NOW' || status === 'OVERDUE'

  return (
    <div
      className={`rounded-2xl p-4 border-2 ${cfg.bg} ${cfg.border} ${clickable ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}
      onClick={clickable ? onClick : undefined}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl mt-0.5 shrink-0">{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-semibold text-sm ${cfg.labelColor}`}>{label}</p>
            {cfg.badgeText && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badgeBg}`}>
                {cfg.badgeText}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{time}</p>
          {note && <p className="text-xs text-gray-500 mt-1">{note}</p>}
          {(status === 'DUE_NOW' || status === 'OVERDUE') && (
            <div className="mt-3 flex items-center gap-2 text-orange-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
              <span className="text-sm font-semibold">Upload Photos →</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
