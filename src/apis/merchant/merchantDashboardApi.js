import authorizedAxios from '~/utils/http/authorizedAxios'
import { MERCHANT_API, MERCHANT_DASHBOARD } from '~/utils/config/constants'
import { orderStatusCounts } from '~/utils/orders/orderGroups'

const invalid = () => new Error('merchant.invalidResponse')
const paged = ({ data }) => {
  if (data?.succeeded !== true || !Array.isArray(data.list) || !Number.isInteger(data.total) || data.total < 0) {
    throw invalid()
  }
  return data
}
export const merchantDashboardApi = {
  order: (id, signal) => authorizedAxios.get(`/wash-order/${encodeURIComponent(id)}`, { signal }).then(({ data }) => {
    if (data?.succeeded !== true || data.data?.id !== id || !data.data.orderCode || !Array.isArray(data.data.items)) {
      throw invalid()
    }
    return data.data
  }),
  profile: (signal) => authorizedAxios.get(MERCHANT_API.PROFILE, { signal }).then(({ data }) => {
    if (data?.succeeded !== true || !data.data?.id || typeof data.data.businessName !== 'string') {
      throw invalid()
    }
    return data.data
  }),
  orders: (signal, filter = { period: 'all' }) => authorizedAxios.get('/merchant/dashboard', { params: { period: filter.period, fromDate: filter.fromDate, toDate: filter.toDate }, signal }).then(({ data }) => {
    const value = data?.data
    if (data?.succeeded !== true || !Number.isInteger(value?.totalOrders) || value.totalOrders < 0 || !Array.isArray(value.latestOrders) || !Array.isArray(value.recentSettlements) || value.latestOrders.some((order) => !order.id || !order.orderCode || !Number.isInteger(order.status)) || value.recentSettlements.some((item) => !item.id || !Number.isFinite(item.payoutAmount))) {
      throw invalid()
    }
    const counts = orderStatusCounts(value.statusCounts)
    if (Object.values(counts).reduce((sum, count) => sum + count, 0) !== value.totalOrders) {
      throw invalid()
    }
    return { total: value.totalOrders, recent: value.latestOrders, counts, settlements: value.recentSettlements, generatedAt: value.generatedAt }
  }),
  settlements: (signal) => authorizedAxios.post(MERCHANT_API.SETTLEMENTS, { page: 1, take: MERCHANT_DASHBOARD.SETTLEMENT_TAKE }, { signal }).then(paged).then((data) => {
    if (data.list.some((item) => !item.id || !Number.isFinite(item.payoutAmount))) {
      throw invalid()
    }
    return data
  })
}
