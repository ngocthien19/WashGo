import { expect, it } from 'vitest'
import { revenuePoints } from './revenueModel'
import { validateRevenue } from '~/apis/admin/adminDashboardApi'
import { dashboardRange } from '~/utils/dashboard/dashboardQuery'

it('fills dates with no transactions and retains negative refund days', () => {
  expect(revenuePoints([{ date: '2026-11-01', revenue: 50 }, { date: '2026-11-03', revenue: -20 }], { from: '2026-11-01', to: '2026-11-03' })).toEqual([
    { date: '2026-11-01', revenue: 50 }, { date: '2026-11-02', revenue: 0 }, { date: '2026-11-03', revenue: -20 }
  ])
})
it('bounds chart generation and falls back for invalid dashboard URLs', () => {
  expect(revenuePoints([], { from: '2020-01-01', to: '2026-11-08' })).toHaveLength(366)
  expect(dashboardRange(new URLSearchParams('period=custom&from=bad&to=bad')).mode).toBe('month')
})
it('accepts refund-only revenue without converting it to zero', () => {
  const value = { totalRevenue: -20, laundryRevenue: 0, storageFeeRevenue: 0, cancellationFeeRevenue: 0, refundedAmount: 20, paidOrderCount: 0, daily: [{ date: '2026-11-03', revenue: -20 }], byMerchant: [{ merchantName: 'Store', revenue: -20, paidOrderCount: 0 }] }
  expect(validateRevenue(value)).toBe(value)
  for (const patch of [{ totalRevenue: null }, { daily: [{ date: 'bad', revenue: 20 }] }, { paidOrderCount: -1 }, { byMerchant: null }]) {
    expect(() => validateRevenue({ ...value, ...patch })).toThrow()
  }
})
