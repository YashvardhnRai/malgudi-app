'use client'

interface Props {
  totalSales: number
  dineIn?: number
  swiggy?: number
  zomato?: number
  coversCount?: number
  currency?: string
}

function formatINR(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n}`
}

export default function SalesWidget({ totalSales, dineIn, swiggy, zomato, coversCount, currency = '₹' }: Props) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Today&apos;s Sales</p>
      <p className="text-4xl font-bold text-gray-900 mb-1">{formatINR(totalSales)}</p>
      {coversCount !== undefined && (
        <p className="text-sm text-gray-500 mb-4">{coversCount} covers</p>
      )}
      {(dineIn !== undefined || swiggy !== undefined || zomato !== undefined) && (
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
          {dineIn !== undefined && (
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900">{formatINR(dineIn)}</p>
              <p className="text-xs text-gray-500">Dine-in</p>
            </div>
          )}
          {swiggy !== undefined && (
            <div className="text-center">
              <p className="text-sm font-semibold text-orange-600">{formatINR(swiggy)}</p>
              <p className="text-xs text-gray-500">Swiggy</p>
            </div>
          )}
          {zomato !== undefined && (
            <div className="text-center">
              <p className="text-sm font-semibold text-red-600">{formatINR(zomato)}</p>
              <p className="text-xs text-gray-500">Zomato</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
