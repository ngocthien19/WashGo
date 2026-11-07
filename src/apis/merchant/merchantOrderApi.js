import authorizedAxios from '~/utils/authorizedAxios'
import { merchantDashboardApi } from './merchantDashboardApi'
import { orderStatusCounts } from '~/utils/orderGroups'

const invalid = () => new Error('merchant.invalidResponse')
const detail = (data, id) => {
  if (data?.succeeded !== true || data.data?.id !== id || !data.data.orderCode || !Array.isArray(data.data.items)) {
    throw invalid()
  }
  return data.data
}
const guardFields = ({ expectedRevision, expectedStatus, operationId } = {}) => {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || !Number.isInteger(expectedStatus) || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(operationId || '')) {
    throw new Error('merchant.orderSync.missingVersion')
  }
  return { expectedRevision, expectedStatus, operationId }
}
const mutate = async (path, body, id, verify, guard) => {
  const fields = guardFields(guard)
  const { data } = await authorizedAxios.put(path, { ...body, ...fields })
  try {
    const order = detail(data, id)
    const replayed = data.meta?.replayed === true && data.meta?.operationId === fields.operationId
    if (!replayed && !verify(order)) {
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
  summary: async ({ keyword, paymentStatus, fromDate, toDate }, signal) => {
    const { data } = await authorizedAxios.post('/wash-order/summary', { keyword, paymentStatus, fromDate, toDate }, { signal })
    if (data?.succeeded !== true || !Number.isInteger(data.data?.total) || data.data.total < 0) {
      throw invalid()
    }
    const counts = orderStatusCounts(data.data.statusCounts)
    if (Object.values(counts).reduce((sum, value) => sum + value, 0) !== data.data.total) {
      throw invalid()
    }
    return { total: data.data.total, counts, generatedAt: data.data.generatedAt }
  },
  operation: async (id, operationId, operation) => {
    try {
      const { data } = await authorizedAxios.get(`/wash-order/${encodeURIComponent(id)}/operations/${encodeURIComponent(operationId)}`)
      if (data?.succeeded !== true || data.data?.orderId !== id || data.data.operationId !== operationId || data.data.operation !== operation || !Number.isSafeInteger(data.data.resultRevision)) {
        throw invalid()
      }
      return data.data
    } catch (error) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },
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
    return data.data.map((item) => ({ ...item, avatar: item.avatarUrl }))
  },
  weigh: (id, weightKg, guard) => mutate(`/wash-order/${encodeURIComponent(id)}/actual-weight`, { weightKg }, id, (order) => order.actualWeightKg === weightKg, guard),
  status: (id, newStatus, note, guard) => mutate('/wash-order/status', { orderId: id, newStatus, note }, id, (order) => order.status === newStatus, guard),
  assign: (id, shipper, note, guard) => mutate('/wash-order/assign-shipper', { orderId: id, shipperId: shipper.id, shipperName: shipper.fullName, note }, id, (order) => order.shipperId === shipper.id, guard)
}
