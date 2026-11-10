import authorizedAxios from '~/utils/authorizedAxios'

const invalid = () => new Error('merchant.invalidResponse')
const count = (value) => Number.isInteger(value) && value >= 0
const instant = (value) => typeof value === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value))
export const merchantInsightsApi = {
  lifetime: async (signal) => {
    const { data } = await authorizedAxios.get('/merchant-reports/lifetime', { signal })
    const value = data?.data
    if (data?.succeeded !== true || value?.currency !== 'VND' || !['grossLaundryRevenue', 'refunds', 'netRevenue', 'commission', 'merchantPayout', 'feesCollected', 'uncoveredNetAmount'].every((key) => Number.isFinite(value[key])) || !count(value.paidOrderCount) || !count(value.ordersWithoutCommissionSnapshot) || typeof value.commissionComplete !== 'boolean' || value.commissionComplete !== (value.ordersWithoutCommissionSnapshot === 0) || !instant(value.generatedAt)) {
      throw invalid()
    }
    return value
  },
  monthlyRevenue: (signal, range) => authorizedAxios.get('/merchant-reports/overview', { params: { period: range ? 'custom' : 'month', ...(range ? { from: range.from, to: range.to } : {}), granularity: range?.from === range?.to && range ? 'hour' : 'day', top: 1 }, signal }).then(({ data }) => {
    const report = data?.data
    if (data?.succeeded !== true || report?.currency !== 'VND' || !Array.isArray(report.series) || !count(report.kpis?.ordersWithoutCommissionSnapshot) || ['grossLaundryRevenue', 'refunds', 'netRevenue', 'commission', 'merchantPayout'].some((key) => !Number.isFinite(report.kpis?.[key]?.current)) || report.series.some((item) => typeof item.computed !== 'boolean' || !Number.isFinite(item.netRevenue) || typeof item.label !== 'string')) {
      throw invalid()
    }
    return report
  }),
  alerts: (signal, { page = 1, take = 5, alertType } = {}) => authorizedAxios.get('/merchant/sla-alerts', { params: { page, take, alertType }, signal }).then(({ data }) => {
    const alerts = data?.data
    if (data?.succeeded !== true || !count(alerts?.totalAlerts) || !['collectionAlertsCount', 'processingAlertsCount', 'returnAlertsCount'].every((key) => count(alerts[key])) || !Array.isArray(alerts.priorityOrders) || alerts.priorityOrders.some((item) => !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(item.orderId) || !item.orderCode || ![1, 2, 3].includes(item.alertType) || !count(item.overdueMinutes) || !Number.isFinite(Date.parse(item.deadline)))) {
      throw invalid()
    }
    if (!count(alerts.priorityTotal) || alerts.page !== page || alerts.take !== take || alerts.priorityOrders.length > take || !instant(alerts.serverNow) || alerts.priorityOrders.some((item) => !instant(item.deadline))) {
      throw invalid()
    }
    return alerts
  })
}
