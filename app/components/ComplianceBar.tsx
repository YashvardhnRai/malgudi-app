'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface DataPoint {
  date: string
  rate: number
}

interface Props {
  data: DataPoint[]
}

function shortDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

export default function ComplianceBar({ data }: Props) {
  const formatted = data.map(d => ({
    label: shortDate(d.date),
    rate: d.rate,
  }))

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">7-Day Compliance</p>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={formatted} barSize={24}>
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            formatter={(value) => [`${value}%`, 'Compliance']}
            contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }}
          />
          <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
            {formatted.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.rate >= 90 ? '#22C55E' : entry.rate >= 75 ? '#F59E0B' : '#EF4444'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
