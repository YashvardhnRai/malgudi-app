'use client'

import { useState } from 'react'
import BottomNav from '@/app/components/BottomNav'
import TaskCard from '@/app/components/TaskCard'
import ChecklistForm from '@/app/components/ChecklistForm'
import type { SubmissionData } from '@/app/components/ChecklistForm'
import type { TaskScheduleItem } from '@/lib/types'

const DAILY_SCHEDULE: TaskScheduleItem[] = [
  { time: '8:00 AM',  label: 'Opening Checklist',      type: 'OPENING',     dueHour: 8,  dueMinute: 0 },
  { time: '10:00 AM', label: 'Banmarie Update',         type: 'BANMARIE',    dueHour: 10, dueMinute: 0 },
  { time: '12:00 PM', label: 'Banmarie Update',         type: 'BANMARIE',    dueHour: 12, dueMinute: 0 },
  { time: '2:00 PM',  label: 'Banmarie Update',         type: 'BANMARIE',    dueHour: 14, dueMinute: 0 },
  { time: '3:00 PM',  label: 'Afternoon Cleanliness',   type: 'CLEANLINESS', dueHour: 15, dueMinute: 0 },
  { time: '4:00 PM',  label: 'Banmarie Update',         type: 'BANMARIE',    dueHour: 16, dueMinute: 0 },
  { time: '6:00 PM',  label: 'Banmarie Update',         type: 'BANMARIE',    dueHour: 18, dueMinute: 0 },
  { time: '8:00 PM',  label: 'Evening Cleanliness',     type: 'CLEANLINESS', dueHour: 20, dueMinute: 0 },
  { time: '10:00 PM', label: 'Banmarie Update',         type: 'BANMARIE',    dueHour: 22, dueMinute: 0 },
  { time: '11:00 PM', label: 'Closing Checklist',       type: 'CLOSING',     dueHour: 23, dueMinute: 0 },
]

const BANMARIE_ITEMS = [
  { name: 'Sambar', checks: [
    { id: 'temp', label: 'Temperature okay (65°C+)' },
    { id: 'consistency', label: 'Consistency correct' },
    { id: 'quantity', label: 'Quantity sufficient' },
    { id: 'smell', label: 'Fresh smell' },
  ]},
  { name: 'Rasam', checks: [
    { id: 'temp', label: 'Temperature okay' },
    { id: 'consistency', label: 'Consistency correct' },
    { id: 'quantity', label: 'Quantity sufficient' },
    { id: 'smell', label: 'Fresh smell' },
  ]},
  { name: 'Coconut Chutney', checks: [
    { id: 'temp', label: 'Freshly prepared' },
    { id: 'consistency', label: 'Consistency correct' },
    { id: 'quantity', label: 'Quantity sufficient' },
    { id: 'smell', label: 'Good aroma' },
  ]},
  { name: 'Rice', checks: [
    { id: 'temp', label: 'Hot and fluffy' },
    { id: 'quantity', label: 'Quantity sufficient' },
  ]},
]

const OPENING_ITEMS = [
  { name: 'Kitchen Cleanliness', checks: [
    { id: 'floor', label: 'Floor cleaned and dry' },
    { id: 'counters', label: 'Counters wiped down' },
    { id: 'equipment', label: 'Equipment cleaned' },
    { id: 'pests', label: 'No signs of pests' },
  ]},
  { name: 'Equipment Check', checks: [
    { id: 'working', label: 'All equipment working' },
    { id: 'gas', label: 'Gas connections checked' },
    { id: 'burners', label: 'All burners functional' },
  ]},
  { name: 'Stock Check', checks: [
    { id: 'rice', label: 'Rice stocked' },
    { id: 'dal', label: 'Dal and lentils stocked' },
    { id: 'vegetables', label: 'Fresh vegetables received' },
    { id: 'coconut', label: 'Coconuts available' },
  ]},
]

const CLEANLINESS_ITEMS = [
  { name: 'Kitchen Area', checks: [
    { id: 'floor', label: 'Floor mopped and clean' },
    { id: 'counters', label: 'All surfaces clean' },
    { id: 'bins', label: 'Waste bins emptied' },
  ]},
  { name: 'Dining Area', checks: [
    { id: 'tables', label: 'Tables cleaned' },
    { id: 'chairs', label: 'Chairs wiped' },
    { id: 'floor', label: 'Floor swept and mopped' },
  ]},
  { name: 'Washroom', checks: [
    { id: 'clean', label: 'Cleaned and sanitized' },
    { id: 'soap', label: 'Soap and tissue stocked' },
    { id: 'smell', label: 'No bad odour' },
  ]},
]

const CLOSING_ITEMS = [
  { name: 'Kitchen Shutdown', checks: [
    { id: 'gas', label: 'Gas lines closed' },
    { id: 'equipment', label: 'Equipment switched off' },
    { id: 'leftovers', label: 'Leftover food disposed' },
    { id: 'clean', label: 'Kitchen cleaned' },
  ]},
  { name: 'Cash & Records', checks: [
    { id: 'cash', label: 'Cash counted and secured' },
    { id: 'bills', label: 'All bills accounted for' },
    { id: 'zomato', label: 'Zomato/Swiggy orders reconciled' },
  ]},
  { name: 'Security', checks: [
    { id: 'locks', label: 'All doors locked' },
    { id: 'lights', label: 'Lights switched off' },
    { id: 'alarm', label: 'Alarm activated' },
  ]},
]

function getFormItems(type: string) {
  switch (type) {
    case 'OPENING': return OPENING_ITEMS
    case 'BANMARIE': return BANMARIE_ITEMS
    case 'CLEANLINESS': return CLEANLINESS_ITEMS
    case 'CLOSING': return CLOSING_ITEMS
    default: return BANMARIE_ITEMS
  }
}

function getISTNow(): { hour: number; minute: number; greeting: string } {
  const now = new Date()
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const hour = ist.getHours()
  const minute = ist.getMinutes()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  return { hour, minute, greeting }
}

function getTaskStatus(task: TaskScheduleItem, completedIndices: number[], index: number): 'DONE' | 'DUE_NOW' | 'UPCOMING' | 'OVERDUE' | 'MISSED' {
  if (completedIndices.includes(index)) return 'DONE'

  const { hour, minute } = getISTNow()
  const nowMinutes = hour * 60 + minute
  const taskMinutes = task.dueHour * 60 + task.dueMinute

  if (nowMinutes < taskMinutes - 30) return 'UPCOMING'
  if (nowMinutes >= taskMinutes - 30 && nowMinutes < taskMinutes + 30) return 'DUE_NOW'
  if (nowMinutes >= taskMinutes + 30 && nowMinutes < taskMinutes + 120) return 'OVERDUE'
  if (nowMinutes >= taskMinutes + 120) return 'MISSED'
  return 'UPCOMING'
}

function getTaskNote(task: TaskScheduleItem, status: string): string {
  const { hour, minute } = getISTNow()
  const nowMinutes = hour * 60 + minute
  const taskMinutes = task.dueHour * 60 + task.dueMinute

  if (status === 'UPCOMING') {
    const diff = taskMinutes - nowMinutes
    if (diff < 60) return `Due in ${diff} min`
    return `Due at ${task.time}`
  }
  if (status === 'OVERDUE') {
    const diff = nowMinutes - taskMinutes
    return `${diff} min overdue — submit now!`
  }
  return ''
}

const MOCK_OUTLET_NAME = 'Bandra'
const MOCK_MANAGER_NAME = 'Rajesh'

export default function ManagerPage() {
  const [completedIndices, setCompletedIndices] = useState<number[]>([])
  const [activeTask, setActiveTask] = useState<{ index: number; task: TaskScheduleItem } | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const { greeting } = getISTNow()

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })

  async function handleTaskSubmit(index: number, data: SubmissionData) {
    await fetch('/api/checklists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outlet_id: 'outlet-bandra',
        checklist_type: DAILY_SCHEDULE[index].type,
        items: data.items,
        notes: data.overallNotes,
      }),
    }).catch(() => {})

    setCompletedIndices(prev => [...prev, index])
    setActiveTask(null)
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
  }

  const dueTasks = DAILY_SCHEDULE.filter((t, i) => {
    const status = getTaskStatus(t, completedIndices, i)
    return status === 'DUE_NOW' || status === 'OVERDUE'
  })

  if (activeTask) {
    return (
      <ChecklistForm
        title={`${activeTask.task.label} — ${activeTask.task.time}`}
        items={getFormItems(activeTask.task.type)}
        onSubmit={(data) => handleTaskSubmit(activeTask.index, data)}
        onClose={() => setActiveTask(null)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-app-bg pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 shadow-md" style={{ backgroundColor: '#1B2B5E' }}>
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-white/70">{greeting}, {MOCK_MANAGER_NAME} 🙏</h1>
            <p
              className="font-extrabold tracking-wider"
              style={{ color: '#F4A623', fontSize: '18px', letterSpacing: '2px' }}
            >
              {MOCK_OUTLET_NAME.toUpperCase()}
            </p>
            <p className="text-xs text-white/50">{today}</p>
          </div>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
            style={{ backgroundColor: '#F4A623', color: '#1B2B5E' }}
          >
            {MOCK_MANAGER_NAME[0]}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mx-4 pb-3">
          <div className="flex justify-between text-xs text-white/50 mb-1">
            <span>{completedIndices.length}/{DAILY_SCHEDULE.length} tasks done</span>
            <span>{Math.round((completedIndices.length / DAILY_SCHEDULE.length) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(completedIndices.length / DAILY_SCHEDULE.length) * 100}%`,
                backgroundColor: '#F4A623',
              }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Success toast */}
        {submitted && (
          <div
            className="mb-4 rounded-xl p-3 text-sm font-semibold text-center"
            style={{ backgroundColor: '#22C55E', color: '#FFFFFF' }}
          >
            ✅ Update submitted successfully!
          </div>
        )}

        {/* Due now banner */}
        {dueTasks.length > 0 && (
          <div
            className="mb-4 rounded-xl p-3"
            style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderLeft: '4px solid #EF4444' }}
          >
            <p className="text-sm font-bold" style={{ color: '#991B1B' }}>
              ⚠ {dueTasks.length} task{dueTasks.length > 1 ? 's' : ''} need{dueTasks.length === 1 ? 's' : ''} your attention now
            </p>
          </div>
        )}

        <h2 className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#1B2B5E' }}>My Tasks Today</h2>

        <div className="space-y-3" id="tasks">
          {DAILY_SCHEDULE.map((task, i) => {
            const status = getTaskStatus(task, completedIndices, i)
            const note = getTaskNote(task, status)
            return (
              <TaskCard
                key={`${task.type}-${i}`}
                label={`${task.label}${task.type === 'BANMARIE' ? ` — ${task.time}` : ''}`}
                time={status === 'DONE' ? `Done ✓` : `Due ${task.time}`}
                status={status}
                note={note}
                onClick={() => setActiveTask({ index: i, task })}
              />
            )
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
