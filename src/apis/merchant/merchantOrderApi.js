import authorizedAxios from '~/utils/authorizedAxios'
import { merchantDashboardApi } from './merchantDashboardApi'

const invalid = () => new Error('merchant.invalidResponse')
const detail = (data, id) => {
  if (data?.succeeded !== true || data.data?.id !== id || !data.data.orderCode || !Array.isArray(data.data.items)) {
    throw invalid()
  }
  return data.data
}
const mutate = async (path, body, id, verify) => {
  const { data } = await authorizedAxios.put(path, body)
  try {
    const order = detail(data, id)
    if (!verify(order)) {
      throw invalid()
    }
    return order
  } catch {
    const error = new Error('merchant.orders.uncertain')
    error.uncertain = true
    throw error
  }
}
export const merchantOrderApi = {
  detail: merchantDashboardApi.order,
  summary: merchantDashboardApi.orderSummary,
  list: async ({ page, take, keyword, status, paymentStatus, sortBy, fromDate, toDate }, signal) => {
    const { data } = await authorizedAxios.post('/wash-order/filter', { page, take, keyword, status, paymentStatus, sortBy, fromDate, toDate }, { signal })
    if (data?.succeeded !== true || !Array.isArray(data.list) || !Number.isInteger(data.total) || data.total < 0 || data.list.some((order) => !order.id || !order.orderCode || !Number.isInteger(order.status))) {
      throw invalid()
    }
    return { ...data, currentPage: data.currentPage || page, totalPages: Math.ceil(data.total / take) }
  },
  shippers: async (id, signal) => {
    const { data } = await authorizedAxios.get(`/wash-order/${encodeURIComponent(id)}/available-shippers`, { signal })
    if (data?.succeeded !== true || !Array.isArray(data.data) || data.data.some((item) => !item.id || !item.fullName)) {
      throw invalid()
    }
    return data.data
  },
  weigh: (id, weightKg) => mutate(`/wash-order/${encodeURIComponent(id)}/actual-weight`, { weightKg }, id, (order) => order.actualWeightKg === weightKg),
  status: (id, newStatus, note) => mutate('/wash-order/status', { orderId: id, newStatus, note }, id, (order) => order.status === newStatus),
  assign: (id, shipper, note) => mutate('/wash-order/assign-shipper', { orderId: id, shipperId: shipper.id, shipperName: shipper.fullName, note }, id, (order) => order.shipperId === shipper.id)
}
