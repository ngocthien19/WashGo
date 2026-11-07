import { afterEach, expect, it, vi } from 'vitest'
vi.mock('./merchantOrderApi', () => ({ merchantOrderApi: { list: vi.fn() } }))
import { merchantOrderApi } from './merchantOrderApi'
import { merchantReportApi } from './merchantReportApi'

afterEach(() => {
  vi.useRealTimers(); vi.clearAllMocks()
})
it('counts scoped totals with bounded concurrency, deduplication and no order data in report', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-07T04:00:00Z'))
  let active = 0, peak = 0
  merchantOrderApi.list.mockImplementation(async (filter) => {
    active++; peak = Math.max(peak, active)
    await Promise.resolve(); await Promise.resolve()
    active--
    return { total: filter.status === 12 ? 3 : 8, list: [{ customerName: 'private', depositPinCode: 'secret' }] }
  })
  const report = await merchantReportApi.load({ from: '2026-11-01', to: '2026-11-07' })
  expect(peak).toBeLessThanOrEqual(4)
  expect(report.current).toEqual({ total: 8, completed: 3 })
  expect(report.buckets).toHaveLength(7)
  const calls = merchantOrderApi.list.mock.calls.map(([filter]) => filter)
  expect(calls.length).toBeLessThanOrEqual(28)
  expect(new Set(calls.map(JSON.stringify)).size).toBe(calls.length)
  calls.forEach((filter) => expect(Object.keys(filter).sort()).toEqual((filter.status ? ['fromDate', 'toDate', 'page', 'take', 'status'] : ['fromDate', 'toDate', 'page', 'take']).sort()))
  expect(JSON.stringify(report)).not.toMatch(/private|secret|depositPinCode/)
})
it('fails the report on a failed count and does not substitute zero or export partial data', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-07T04:00:00Z'))
  merchantOrderApi.list.mockRejectedValue(new Error('failed'))
  await expect(merchantReportApi.load({ from: '2026-11-01', to: '2026-11-07' })).rejects.toThrow('failed')
  expect(merchantOrderApi.list.mock.calls.length).toBeLessThanOrEqual(4)
})
