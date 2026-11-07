import authorizedAxios from '~/utils/authorizedAxios'

const invalid = () => new Error('merchant.invalidResponse')
const count = (value) => Number.isInteger(value) && value >= 0
// Legacy SLA fields are Vietnam wall time; ToVietnamTime can incorrectly retain UTC Kind/Z.
// Remove this compatibility conversion when BE switches these fields to UTC/DateTimeOffset.
const vietnamTime = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?$/.test(value) ? `${value.replace(/Z$/, '')}+07:00` : value
export const merchantInsightsApi = {
  monthlyRevenue: (signal, range) => authorizedAxios.get('/merchant-reports/overview', { params: { period: range ? 'custom' : 'month', ...(range ? { from: range.from, to: range.to } : {}), granularity: range?.from === range?.to && range ? 'hour' : 'day', top: 1 }, signal }).then(({ data }) => {
    const report = data?.data
    if (data?.succeeded !== true || report?.currency !== 'VND' || !Array.isArray(report.series) || !count(report.kpis?.ordersWithoutCommissionSnapshot) || ['grossLaundryRevenue', 'refunds', 'netRevenue', 'commission', 'merchantPayout'].some((key) => !Number.isFinite(report.kpis?.[key]?.current)) || report.series.some((item) => typeof item.computed !== 'boolean' || !Number.isFinite(item.netRevenue) || typeof item.label !== 'string')) {
      throw invalid()
    }
    return report
  }),
  alerts: (signal) => authorizedAxios.get('/merchant/sla-alerts', { signal }).then(({ data }) => {
    const alerts = data?.data
    if (data?.succeeded !== true || !count(alerts?.totalAlerts) || !['collectionAlertsCount', 'processingAlertsCount', 'returnAlertsCount'].every((key) => count(alerts[key])) || !Array.isArray(alerts.priorityOrders) || alerts.priorityOrders.some((item) => !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(item.orderId) || !item.orderCode || ![1, 2, 3].includes(item.alertType) || !count(item.overdueMinutes) || !Number.isFinite(Date.parse(item.deadline)))) {
      throw invalid()
    }
    return { ...alerts, serverNow: vietnamTime(alerts.serverNow), priorityOrders: alerts.priorityOrders.map((item) => ({ ...item, deadline: vietnamTime(item.deadline) })) }
  })
}
