import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/authorizedAxios'
import { merchantInsightsApi } from './merchantInsightsApi'
import { merchantProfileApi } from './merchantProfileApi'
vi.mock('~/utils/authorizedAxios', () => ({ default: { post: vi.fn(), get: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())

it('submits city and paired coordinates for approval without identity or financial fields', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: { id: 'request', status: 1 } } })
  const payload = { businessName: 'Store', address: 'Address', city: 'City', latitude: 10.7, longitude: 106.6, phone: '0901234567', openingHours: null, imageUrls: [] }
  await merchantProfileApi.requestUpdate({ ...payload, merchantId: 'other', commissionRate: 1, taxCode: '123', status: 1 })
  expect(authorizedAxios.post).toHaveBeenCalledExactlyOnceWith('/merchant-profile/update-requests', payload)
})

it('uses the transaction-based monthly overview and preserves unknown commission coverage', async () => {
  const report = { currency: 'VND', kpis: { ordersWithoutCommissionSnapshot: 1, ...Object.fromEntries(['grossLaundryRevenue', 'refunds', 'netRevenue', 'commission', 'merchantPayout'].map((key) => [key, { current: 0 }])) }, series: [] }
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: report } })
  expect(await merchantInsightsApi.monthlyRevenue()).toBe(report)
  expect(authorizedAxios.get).toHaveBeenCalledWith('/merchant-reports/overview', { params: { period: 'month', granularity: 'day', top: 1 }, signal: undefined })
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: { ...report, kpis: {} } } })
  await expect(merchantInsightsApi.monthlyRevenue()).rejects.toThrow('merchant.invalidResponse')
})

it('does not replace missing or malformed alert data with a false zero', async () => {
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: { totalAlerts: 0, priorityOrders: [] } } })
  await expect(merchantInsightsApi.alerts()).rejects.toThrow('merchant.invalidResponse')
  const alerts = { totalAlerts: 0, collectionAlertsCount: 0, processingAlertsCount: 0, returnAlertsCount: 0, priorityOrders: [] }
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: alerts } })
  expect(await merchantInsightsApi.alerts()).toEqual(alerts)
  expect(authorizedAxios.get).toHaveBeenLastCalledWith('/merchant/sla-alerts', { signal: undefined })
})

it('interprets legacy SLA wall times as Vietnam time even when the helper retained a UTC marker', async () => {
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: { totalAlerts: 1, collectionAlertsCount: 1, processingAlertsCount: 0, returnAlertsCount: 0, serverNow: '2026-11-07T19:00:00Z', priorityOrders: [{ orderId: '11111111-1111-4111-8111-111111111111', orderCode: 'WG1', alertType: 1, overdueMinutes: 35, deadline: '2026-11-07T18:25:00Z' }] } } })
  const data = await merchantInsightsApi.alerts()
  expect(data.serverNow).toBe('2026-11-07T19:00:00+07:00')
  expect(data.priorityOrders[0].deadline).toBe('2026-11-07T18:25:00+07:00')
})
