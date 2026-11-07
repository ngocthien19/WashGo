import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/authorizedAxios'
import { merchantReportApi } from './merchantReportApi'
import { reportFixture } from '../../../tests/e2e/helpers/merchantReportData'
vi.mock('~/utils/authorizedAxios', () => ({ default: { get: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())
const range = { mode: 'custom', from: '2026-11-01', to: '2026-11-07' }
const response = (data) => ({ data: { succeeded: true, data } })
it('loads one scoped aggregate, retaining actual completion, points and uncomputed buckets', async () => {
  const report = reportFixture(range)
  authorizedAxios.get.mockResolvedValue(response(report))
  expect(await merchantReportApi.load(range)).toEqual(report)
  expect(authorizedAxios.get).toHaveBeenCalledExactlyOnceWith('/merchant-reports/overview', { params: { period: 'custom', from: range.from, to: range.to, top: 5 }, signal: undefined })
  expect(report.series[2].computed).toBe(false)
  expect(report.kpis.onTimeRate.changePoints).toBe(10)
})
it('rejects malformed, wrong-range and wrong-currency snapshots without substituting zero', async () => {
  for (const change of [{ currency: 'USD' }, { series: null }, { current: {} }, { kpis: {} }]) {
    authorizedAxios.get.mockResolvedValue(response({ ...reportFixture(range), ...change }))
    await expect(merchantReportApi.load(range)).rejects.toThrow()
  }
  authorizedAxios.get.mockResolvedValue(response(reportFixture({ from: '2026-10-01', to: '2026-10-07' })))
  await expect(merchantReportApi.load(range)).rejects.toThrow()
})
it('validates dates before requesting and rejects failed reports', async () => {
  await expect(merchantReportApi.load({ from: 'bad', to: range.to })).rejects.toThrow()
  expect(authorizedAxios.get).not.toHaveBeenCalled()
  authorizedAxios.get.mockRejectedValue(new Error('failed'))
  await expect(merchantReportApi.load(range)).rejects.toThrow('failed')
})
it('exports the displayed applied range and rejects non-CSV or incomplete financial coverage', async () => {
  const report = reportFixture(range), blob = new Blob(['csv'], { type: 'text/csv' })
  authorizedAxios.get.mockResolvedValue({ data: blob, headers: { 'content-type': 'text/csv; charset=utf-8' } })
  expect(await merchantReportApi.export(report)).toBe(blob)
  expect(authorizedAxios.get).toHaveBeenCalledWith('/merchant-reports/export', { params: { period: 'custom', from: range.from, to: range.to, granularity: 'day', top: 5 }, responseType: 'blob' })
  report.kpis.ordersWithoutCommissionSnapshot = 1
  await expect(merchantReportApi.export(report)).rejects.toThrow('merchant.reportSync.exportBlocked')
  expect(authorizedAxios.get).toHaveBeenCalledTimes(1)
  report.kpis.ordersWithoutCommissionSnapshot = 0
  authorizedAxios.get.mockResolvedValue({ data: new Blob(['{}'], { type: 'application/json' }), headers: {} })
  await expect(merchantReportApi.export(report)).rejects.toThrow()
})
