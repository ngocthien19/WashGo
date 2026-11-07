import { afterEach, expect, it, vi } from 'vitest'
import { dashboardRange, dashboardFilter, validDashboardRange } from './dashboardQuery'

afterEach(() => vi.useRealTimers())
it('resolves a seven-day week and sends Vietnam day boundaries as Unix seconds', () => {
  vi.useFakeTimers().setSystemTime(new Date('2026-11-07T20:00:00Z'))
  const range = dashboardRange(new URLSearchParams('period=week'))
  expect(range).toEqual({ mode: 'week', from: '2026-11-02', to: '2026-11-08' })
  expect(dashboardFilter(range)).toEqual({ period: 'custom', fromDate: Date.parse('2026-11-02T00:00:00+07:00') / 1000, toDate: Date.parse('2026-11-08T23:59:59+07:00') / 1000 })
})
it('rejects incomplete, reversed, future and oversized ranges instead of sending them', () => {
  vi.useFakeTimers().setSystemTime(new Date('2026-11-07T10:00:00Z'))
  for (const [from, to] of [['', ''], ['2026-02-30', '2026-03-01'], ['2026-11-07', '2026-11-01'], ['2026-11-01', '2026-11-08'], ['2025-01-01', '2026-11-07']]) {
    expect(validDashboardRange(from, to)).toBe(false)
  }
  expect(dashboardRange(new URLSearchParams('period=custom&from=invalid'))).toEqual({ mode: 'month', from: '2026-11-01', to: '2026-11-07' })
})
