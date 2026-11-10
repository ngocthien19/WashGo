import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/authorizedAxios'
import { merchantInsightsApi } from './merchantInsightsApi'
import { merchantProfileApi } from './merchantProfileApi'
vi.mock('~/utils/authorizedAxios', () => ({ default: { post: vi.fn(), get: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())

it('submits city and paired coordinates for approval without identity or financial fields', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: { id: 'request', status: 1 } } })
  const payload = { businessName: 'Store', address: 'Address', city: 'City', latitude: 10.7, longitude: 106.6, phone: '0901234567', openingHours: null, imageUrls: [] }
  await merchantProfileApi.requestUpdate({ ...payload, merchantId: 'other', commissionRate: 1, taxCode: '1234567890', businessLicenseDocumentId: 'document-id', removeBusinessLicenseDocument: false, operationId: 'operation', status: 1 })
  expect(authorizedAxios.post).toHaveBeenCalledExactlyOnceWith('/merchant-profile/update-requests', { ...payload, taxCode: '1234567890', businessLicenseDocumentId: 'document-id', removeBusinessLicenseDocument: false, operationId: 'operation' })
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
  const alerts = { page: 1, take: 5, priorityTotal: 0, serverNow: '2026-11-10T01:00:00Z', totalAlerts: 0, collectionAlertsCount: 0, processingAlertsCount: 0, returnAlertsCount: 0, priorityOrders: [] }
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: alerts } })
  expect(await merchantInsightsApi.alerts()).toEqual(alerts)
  expect(authorizedAxios.get).toHaveBeenLastCalledWith('/merchant/sla-alerts', { params: { page: 1, take: 5, alertType: undefined }, signal: undefined })
})

it('preserves the new UTC SLA contract instead of shifting timestamps back seven hours', async () => {
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: { page: 1, take: 5, priorityTotal: 1, totalAlerts: 1, collectionAlertsCount: 1, processingAlertsCount: 0, returnAlertsCount: 0, serverNow: '2026-11-07T19:00:00Z', priorityOrders: [{ orderId: '11111111-1111-4111-8111-111111111111', orderCode: 'WG1', alertType: 1, overdueMinutes: 35, deadline: '2026-11-07T18:25:00Z' }] } } })
  const data = await merchantInsightsApi.alerts()
  expect(data.serverNow).toBe('2026-11-07T19:00:00Z')
  expect(data.priorityOrders[0].deadline).toBe('2026-11-07T18:25:00Z')
})


it('loads all-history finances and preserves zero commission and incomplete snapshot coverage', async () => {
  const value = { currency: 'VND', grossLaundryRevenue: 100, refunds: 20, netRevenue: 80, commission: 0, merchantPayout: 80, feesCollected: 0, paidOrderCount: 1, commissionComplete: true, ordersWithoutCommissionSnapshot: 0, uncoveredNetAmount: 0, generatedAt: '2026-11-10T01:00:00Z' }
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: value } })
  expect(await merchantInsightsApi.lifetime()).toEqual(value)
  expect(authorizedAxios.get).toHaveBeenCalledWith('/merchant-reports/lifetime', { signal: undefined })
  const incomplete = { ...value, commissionComplete: false, ordersWithoutCommissionSnapshot: 1, uncoveredNetAmount: 80 }
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: incomplete } })
  expect(await merchantInsightsApi.lifetime()).toEqual(incomplete)
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: { ...incomplete, commissionComplete: true } } })
  await expect(merchantInsightsApi.lifetime()).rejects.toThrow('merchant.invalidResponse')
})
