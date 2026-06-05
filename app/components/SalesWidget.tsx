'use client'

interface Props {
  totalSales: number
  dineIn?: number
  swiggy?: number
  zomato?: number
  coversCount?: number
  currency?: string
}

function formatCurrency(n: number, currency: string): string {
  if (n >= 100000) return `${currency}${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `${currency}${(n / 1000).toFixed(0)}K`
  return `${currency}${n}`
}

export default function SalesWidget({ totalSales, dineIn, swiggy, zomato, coversCount, currency = '₹' }: Props) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Today&apos;s Sales</p>
      <p className="text-4xl font-bold text-gray-900 mb-1">{formatCurrency(totalSales, currency)}</p>
      {coversCount !== undefined && (
        <p className="text-sm text-gray-500 mb-4">{coversCount} covers</p>
      )}
      {(dineIn !== undefined || swiggy !== undefined || zomato !== undefined) && (
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
          {dineIn !== undefined && (
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900">{formatCurrency(dineIn, currency)}</p>
              <p className="text-xs text-gray-500">Dine-in</p>
            </div>
          )}
          {swiggy !== undefined && (
            <div className="text-center">
              <p className="text-sm font-semibold text-orange-600">{formatCurrency(swiggy, currency)}</p>
              <p className="text-xs text-gray-500">Swiggy</p>
            </div>
          )}
          {zomato !== undefined && (
            <div className="text-center">
              <p className="text-sm font-semibold text-red-600">{formatCurrency(zomato, currency)}</p>
              <p className="text-xs text-gray-500">Zomato</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
