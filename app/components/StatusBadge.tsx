'use client'

type Status = 'GREEN' | 'AMBER' | 'RED' | 'APPROVED' | 'FLAGGED' | 'PENDING' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'SUBMITTED' | 'LATE' | 'MISSED' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

const CONFIG: Record<Status, { label: string; bg: string; text: string; dot: string }> = {
  GREEN:       { label: 'All Good',     bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500' },
  AMBER:       { label: 'Attention',    bg: 'bg-amber-100',  text: 'text-amber-800',  dot: 'bg-amber-500' },
  RED:         { label: 'Critical',     bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-500' },
  APPROVED:    { label: 'Approved',     bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500' },
  FLAGGED:     { label: 'Flagged',      bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-500' },
  PENDING:     { label: 'Pending',      bg: 'bg-gray-100',   text: 'text-gray-700',   dot: 'bg-gray-400' },
  OPEN:        { label: 'Open',         bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-500' },
  IN_PROGRESS: { label: 'In Progress',  bg: 'bg-amber-100',  text: 'text-amber-800',  dot: 'bg-amber-500' },
  RESOLVED:    { label: 'Resolved',     bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500' },
  SUBMITTED:   { label: 'Done',         bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500' },
  LATE:        { label: 'Late',         bg: 'bg-amber-100',  text: 'text-amber-800',  dot: 'bg-amber-500' },
  MISSED:      { label: 'Missed',       bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-500' },
  LOW:         { label: 'Low',          bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500' },
  MEDIUM:      { label: 'Medium',       bg: 'bg-amber-100',  text: 'text-amber-800',  dot: 'bg-amber-500' },
  HIGH:        { label: 'High',         bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-500' },
  CRITICAL:    { label: 'Critical',     bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-600' },
}

interface Props {
  status: Status
  className?: string
  showDot?: boolean
}

export default function StatusBadge({ status, className = '', showDot = true }: Props) {
  const cfg = CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text} ${className}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${status === 'RED' || status === 'CRITICAL' ? 'status-dot-red' : ''}`} />}
      {cfg.label}
    </span>
  )
}
