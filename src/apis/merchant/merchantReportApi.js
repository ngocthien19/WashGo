import authorizedAxios from '~/utils/http/authorizedAxios'
import { reportParams, validReportRange } from '~/pages/merchant/Reports/reportModel'
import { validDay } from '~/utils/format/dateRange'

const invalid = () => new Error('merchant.invalidResponse')
const count = (value) => Number.isSafeInteger(value) && value >= 0
const instant = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value))
const metric = (value) => value && Number.isFinite(value.current) && Number.isFinite(value.previous) && (value.changePercent === null || Number.isFinite(value.changePercent)) && typeof value.isNew === 'boolean'
const validCoverage = (kpis) => {
  const coverage = kpis?.commissionCoverage
  if (!coverage || !['current', 'previous'].every((period) => typeof coverage[`${period}Complete`] === 'boolean' && count(coverage[`${period}UncoveredOrders`]) && Number.isFinite(coverage[`${period}UncoveredNetAmount`]) && coverage[`${period}Complete`] === (coverage[`${period}UncoveredOrders`] === 0)) || kpis.ordersWithoutCommissionSnapshot !== coverage.currentUncoveredOrders) {
    return false
  }
  const estimated = !coverage.currentComplete || !coverage.previousComplete
  return ['commission', 'merchantPayout'].every((key) => kpis[key]?.isEstimated === estimated && (!estimated || kpis[key].changePercent === null))
}
const validRange = (value) => value && instant(value.from) && instant(value.toExclusive) && Date.parse(value.from) < Date.parse(value.toExclusive) && validDay(value.fromLocalDate) && validDay(value.toLocalDate)
const validRate = (rate) => {
  if (!rate || !['numerator', 'denominator', 'previousNumerator', 'previousDenominator'].every((key) => count(rate[key]))) {
    return false
  }
  return rate.numerator <= rate.denominator && rate.previousNumerator <= rate.previousDenominator &&
    ['rate', 'previousRate'].every((key) => rate[key] === null || Number.isFinite(rate[key]) && rate[key] >= 0 && rate[key] <= 100) &&
    (rate.denominator === 0) === (rate.rate === null) && (rate.previousDenominator === 0) === (rate.previousRate === null) &&
    (rate.changePoints === null || Number.isFinite(rate.changePoints))
}
const validSeries = (items) => Array.isArray(items) && items.length <= 400 && new Set(items.map((item) => item.index)).size === items.length && items.every((item) =>
  count(item.index) && typeof item.label === 'string' && typeof item.computed === 'boolean' &&
  ['start', 'end', 'previousStart', 'previousEnd'].every((key) => instant(item[key])) && Date.parse(item.start) < Date.parse(item.end) &&
  Number.isFinite(item.netRevenue) && Number.isFinite(item.previousNetRevenue) && count(item.ordersCreated) && count(item.ordersCompleted))
const validServices = (items) => Array.isArray(items) && items.length <= 20 && items.every((item) =>
  item.serviceId && typeof item.name === 'string' && count(item.rank) && count(item.orderCount) && count(item.previousOrderCount) &&
  Number.isFinite(item.listValue) && (item.orderCountChangePercent === null || Number.isFinite(item.orderCountChangePercent)) && Array.isArray(item.imageUrls))
const validKpis = (kpis) => kpis && ['grossLaundryRevenue', 'refunds', 'netRevenue', 'commission', 'merchantPayout', 'feesCollected', 'ordersCreated', 'ordersCompleted', 'ordersCancelled'].every((key) => metric(kpis[key])) &&
  ['ordersCreated', 'ordersCompleted', 'ordersCancelled'].every((key) => count(kpis[key].current) && count(kpis[key].previous)) && count(kpis.ordersWithoutCommissionSnapshot) && validRate(kpis.onTimeRate)
const validReport = (report) => report?.currency === 'VND' && report.timezone === 'Asia/Ho_Chi_Minh' && ['hour', 'day', 'week', 'month'].includes(report.granularity) &&
  validRange(report.current) && validRange(report.previous) && instant(report.asOf) && instant(report.generatedAt) &&
  Date.parse(report.asOf) >= Date.parse(report.current.from) && Date.parse(report.asOf) <= Date.parse(report.current.toExclusive) &&
  typeof report.incomplete === 'boolean' && validKpis(report.kpis) && validCoverage(report.kpis) && validSeries(report.series) && validServices(report.topServices)

export const merchantReportApi = {
  load: async (range, signal) => {
    if (!validReportRange(range.from, range.to)) {
      throw new Error('merchant.reports.invalidRange')
    }
    const { data } = await authorizedAxios.get('/merchant-reports/overview', { params: reportParams(range), signal })
    const report = data?.data
    if (data?.succeeded !== true || !validReport(report)) {
      throw invalid()
    }
    if (range.mode === 'custom' && (report.current.fromLocalDate !== range.from || report.current.toLocalDate !== range.to)) {
      throw invalid()
    }
    return report
  },
  export: async (report) => {
    if (!validCoverage(report.kpis)) {
      throw invalid()
    }
    const { data, headers } = await authorizedAxios.get('/merchant-reports/export', { params: { period: 'custom', from: report.current.fromLocalDate, to: report.current.toLocalDate, granularity: report.granularity, top: 5 }, responseType: 'blob' })
    if (!(data instanceof Blob) || !data.size || !String(headers?.['content-type'] || data.type).toLowerCase().startsWith('text/csv')) {
      throw invalid()
    }
    return data
  }
}
