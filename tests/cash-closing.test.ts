import { describe, expect, it } from 'vitest'
import {
  calculateCashClosing,
  deriveCashClosingStatus,
  isCashClosingDifferenceAboveThreshold,
  isCashClosingReminderDue,
} from '../lib/cash-closing'

const amounts = {
  opening_cash_balance: 1000,
  cash_sales_as_per_pos: 8500,
  upi_sales: 4200,
  card_sales: 1800,
  aggregator_sales: 3100,
  cash_expenses: 500,
  cash_deposited_or_handed_over: 7000,
  physical_cash_counted: 2000,
}

describe('cash closing calculations', () => {
  it('calculates expected cash and a balanced difference', () => {
    expect(calculateCashClosing(amounts)).toEqual({
      expectedCash: 2000,
      differenceAmount: 0,
    })
  })

  it('derives shortage and excess from the counted difference', () => {
    const complete = {
      proofPhotoUrl: 'proof.jpg',
      posClosingReportPhotoUrl: 'pos.jpg',
      verifiedBy: 'Manager',
    }
    expect(deriveCashClosingStatus({ ...complete, differenceAmount: -20 })).toBe('shortage')
    expect(deriveCashClosingStatus({ ...complete, differenceAmount: 20 })).toBe('excess')
    expect(deriveCashClosingStatus({ ...complete, differenceAmount: 0 })).toBe('balanced')
  })

  it('requires both proofs and a verifier before final status', () => {
    expect(
      deriveCashClosingStatus({
        differenceAmount: -20,
        proofPhotoUrl: null,
        posClosingReportPhotoUrl: 'pos.jpg',
        verifiedBy: '',
      })
    ).toBe('needs_review')
  })

  it('uses a strict 500 rupee escalation threshold', () => {
    expect(isCashClosingDifferenceAboveThreshold(500)).toBe(false)
    expect(isCashClosingDifferenceAboveThreshold(-500.01)).toBe(true)
  })

  it('starts missed-closing reminders at 10:30 PM', () => {
    expect(isCashClosingReminderDue(22 * 60 + 29)).toBe(false)
    expect(isCashClosingReminderDue(22 * 60 + 30)).toBe(true)
  })
})
