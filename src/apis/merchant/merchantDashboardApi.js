import authorizedAxios from '~/utils/authorizedAxios'
import { MERCHANT_API, MERCHANT_DASHBOARD } from '~/utils/constants'

const invalid = () => new Error('merchant.invalidResponse')
const paged = ({ data }) => {
  if (data?.succeeded !== true || !Array.isArray(data.list) || !Number.isInteger(data.total) || data.total < 0) {
    throw invalid()
  }
  return data
}
const fetchOrderSummary = ({ keyword, paymentStatus, fromDate, toDate, take = 1 }, signal) => {
  const filter = { keyword, paymentStatus, fromDate, toDate }
  return Promise.all([
    authorizedAxios.post(MERCHANT_API.ORDERS, { ...filter, page: 1, take, sortBy: [{ field: 'CreatedOn', isDescending: true }] }, { signal }).then(paged),
    ...MERCHANT_DASHBOARD.STATUSES.map((status) => authorizedAxios.post(MERCHANT_API.ORDERS, { ...filter, page: 1, take: 1, status }, { signal }).then(paged))
  ]).then(([recent, ...statuses]) => {
    if (recent.list.some((item) => !item.id || !item.orderCode || !Number.isInteger(item.status))) {
      throw invalid()
    }
    return { recent: recent.list, total: recent.total, counts: Object.fromEntries(MERCHANT_DASHBOARD.STATUSES.map((status, index) => [status, statuses[index].total])) }
  })
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
  orders: (signal) => fetchOrderSummary({ take: MERCHANT_DASHBOARD.RECENT_TAKE }, signal),
  orderSummary: (filter, signal) => fetchOrderSummary(filter, signal),
  settlements: (signal) => authorizedAxios.post(MERCHANT_API.SETTLEMENTS, { page: 1, take: MERCHANT_DASHBOARD.SETTLEMENT_TAKE }, { signal }).then(paged).then((data) => {
    if (data.list.some((item) => !item.id || !Number.isFinite(item.payoutAmount))) {
      throw invalid()
    }
    return data
  })
}
