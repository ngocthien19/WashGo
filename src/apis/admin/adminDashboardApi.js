import authorizedAxios from '~/utils/http/authorizedAxios'
import { orderStatusCounts } from '~/utils/orders/orderGroups'

const invalid = () => new Error('admin.invalidResponse')
const unwrap = ({ data }) => {
  if (data?.succeeded !== true || !data.data) {
    throw invalid()
  }
  return data.data
}
const count = (value) => Number.isInteger(value) && value >= 0
const page = ({ data }) => {
  if (data?.succeeded !== true || !Array.isArray(data.list) || !count(data.total)) {
    throw invalid()
  }
  return data
}
export function validateRevenue(value) {
  if (!['totalRevenue', 'laundryRevenue', 'storageFeeRevenue', 'cancellationFeeRevenue', 'refundedAmount'].every((key) => Number.isFinite(value?.[key])) || !count(value.paidOrderCount)
    || !Array.isArray(value.daily) || value.daily.some((row) => !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !Number.isFinite(row.revenue))
    || !Array.isArray(value.byMerchant) || value.byMerchant.some((row) => typeof row.merchantName !== 'string' || !Number.isFinite(row.revenue) || !count(row.paidOrderCount))) {
    throw invalid()
  }
  if (value.hourly != null && (!Array.isArray(value.hourly) || value.hourly.some(row => !Number.isFinite(Date.parse(row.hourStart)) || !Number.isFinite(row.revenue)))) {
    throw invalid()
  }
  return value
}
export const adminDashboardApi = {
  profile: (signal) => authorizedAxios.get('/auth/me', { signal }).then(unwrap).then((value) => {
    if (!value.id || value.role !== 'Admin' || typeof value.fullName !== 'string' || typeof value.email !== 'string') {
      throw invalid()
    }
    return value
  }),
  revenue: (filter, signal) => authorizedAxios.post('/finance/revenue-report', { ...filter, granularity: filter.toDate - filter.fromDate < 86400 ? 'hour' : 'day' }, { signal }).then(unwrap).then(validateRevenue),
  orders: (filter, signal) => authorizedAxios.post('/wash-order/summary', filter, { signal }).then(unwrap).then((value) => {
    const counts = orderStatusCounts(value.statusCounts)
    if (!count(value.total) || Object.values(counts).reduce((sum, n) => sum + n, 0) !== value.total) {
      throw invalid()
    }
    return { ...value, counts }
  }),
  merchants: (signal) => authorizedAxios.post('/merchant/filter', { page: 1, take: 1, status: 1 }, { signal }).then(page),
  lockers: (signal) => authorizedAxios.get('/locker/summary', { signal }).then(unwrap).then((value) => {
    if (!['totalLockers', 'activeLockers', 'maintenanceLockers', 'inactiveLockers', 'totalBoxes', 'availableBoxes', 'occupiedBoxes', 'reservedBoxes', 'maintenanceBoxes'].every((key) => count(value[key]))) {
      throw invalid()
    }
    return value
  }),
  waiting: (signal) => authorizedAxios.post('/order-assignment/filter', { page: 1, take: 5 }, { signal }).then(page).then((value) => {
    if (value.list.some((row) => !row.id || !row.orderCode || typeof row.isOverdue !== 'boolean' || !count(row.waitingMinutes))) {
      throw invalid()
    }
    return value
  }),
  recent: (filter, signal) => authorizedAxios.post('/wash-order/filter', { ...filter, page: 1, take: 5, sortBy: [{ field: 'CreatedOn', isDescending: true }] }, { signal }).then(page).then((value) => {
    if (value.list.some((row) => !row.id || !row.orderCode || !Number.isInteger(row.status))) {
      throw invalid()
    }
    return value
  })
}
