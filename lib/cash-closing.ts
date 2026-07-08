export const CASH_CLOSING_DIFFERENCE_THRESHOLD = 500
export const CASH_CLOSING_DUE_MINUTES = 22 * 60 + 30

export type CashClosingStatus =
  | 'balanced'
  | 'shortage'
  | 'excess'
  | 'needs_review'

export type CashClosingAmounts = {
  opening_cash_balance: number
  cash_sales_as_per_pos: number
  upi_sales: number
  card_sales: number
  aggregator_sales: number
  cash_expenses: number
  cash_deposited_or_handed_over: number
  physical_cash_counted: number
}

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calculateCashClosing(amounts: CashClosingAmounts) {
  const expectedCash = money(
    amounts.opening_cash_balance +
      amounts.cash_sales_as_per_pos -
      amounts.cash_expenses -
      amounts.cash_deposited_or_handed_over
  )
  const differenceAmount = money(amounts.physical_cash_counted - expectedCash)
  return { expectedCash, differenceAmount }
}

export function deriveCashClosingStatus({
  differenceAmount,
  proofPhotoUrl,
  posClosingReportPhotoUrl,
  verifiedBy,
}: {
  differenceAmount: number
  proofPhotoUrl: string | null | undefined
  posClosingReportPhotoUrl: string | null | undefined
  verifiedBy: string | null | undefined
}): CashClosingStatus {
  if (!proofPhotoUrl || !posClosingReportPhotoUrl || !verifiedBy?.trim()) {
    return 'needs_review'
  }
  if (differenceAmount < 0) return 'shortage'
  if (differenceAmount > 0) return 'excess'
  return 'balanced'
}

export function isCashClosingDifferenceAboveThreshold(differenceAmount: number) {
  return Math.abs(differenceAmount) > CASH_CLOSING_DIFFERENCE_THRESHOLD
}

export function isCashClosingReminderDue(nowMinutes: number) {
  return nowMinutes >= CASH_CLOSING_DUE_MINUTES
}
