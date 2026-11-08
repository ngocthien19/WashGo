import authorizedAxios from '~/utils/authorizedAxios'
import { orderManagementApi } from '~/apis/orderManagementApi'
import { isId } from '~/pages/admin/Merchants/merchantModel'
import { orderStatusCounts } from '~/utils/orderGroups'

const invalid = () => new Error('admin.invalidResponse')
const waiting = (item) => isId(item?.id) && typeof item.orderCode === 'string' && Number.isInteger(item.waitingMinutes) && item.waitingMinutes >= 0 && Array.isArray(item.services)
const candidate = (item) => isId(item?.merchantId) && typeof item.businessName === 'string' && Number.isInteger(item.currentLoad) && item.currentLoad >= 0 && Number.isInteger(item.maxCapacity) && item.maxCapacity > 0 && Number.isFinite(item.score) && Number.isFinite(item.commissionRate)
const unwrap = (response, validate) => {
  if (response.data?.succeeded !== true || !validate(response.data.data)) {
    throw invalid()
  }
  return response.data.data
}
const pairsValid = (items) => items.length > 0 && items.length <= 50 && items.every(item => isId(item.orderId) && isId(item.merchantId)) && new Set(items.map(item => item.orderId)).size === items.length
const write = async (path, body, validate) => {
  const response = await authorizedAxios.post(path, body)
  try {
    return unwrap(response, validate)
  } catch {
    const error = invalid(); error.uncertain = true; throw error
  }
}
export const adminOrderApi = {
  ...orderManagementApi,
  lookup: async (path, name, signal) => {
    const items = new Map()
    let page = 1, pages = 1
    while (page <= pages) {
      const { data } = await authorizedAxios.post(path, { page, take: 100 }, { signal })
      if (data?.succeeded !== true || !Array.isArray(data.list) || !Number.isInteger(data.total) || data.list.some(item => !isId(item.id) || typeof item[name] !== 'string')) {
        throw invalid()
      }
      for (const item of data.list) {
        items.set(item.id, { value: item.id, label: item[name], phone: typeof item.phone === 'string' ? item.phone : null, imageUrls: Array.isArray(item.imageUrls) ? item.imageUrls.filter(url => typeof url === 'string') : [] })
      }
      pages = Math.ceil(data.total / 100); page += 1
    }
    return [...items.values()].sort((a, b) => a.label.localeCompare(b.label, 'vi'))
  },
  media: async (kind, id, signal) => {
    const path = { merchant: 'merchant', locker: 'locker', service: 'wash-service' }[kind]
    if (!path || !isId(id)) {
      throw invalid()
    }
    const resource = unwrap(await authorizedAxios.get(`/${path}/${encodeURIComponent(id)}`, { signal }), data => data?.id === id && Array.isArray(data.imageUrls) && data.imageUrls.every(url => typeof url === 'string'))
    return { imageUrls: resource.imageUrls, phone: kind === 'merchant' && typeof resource.phone === 'string' ? resource.phone : null }
  },
  list: async (filter, signal) => {
    const response = await authorizedAxios.post('/wash-order/filter', filter, { signal })
    const data = response.data
    if (data?.succeeded !== true || !Array.isArray(data.list) || !Number.isInteger(data.total) || data.total < 0 || data.list.some(item => !isId(item.id) || !item.orderCode || !Number.isInteger(item.status))) {
      throw invalid()
    }
    return { ...data, totalPages: Math.ceil(data.total / filter.take) }
  },
  summary: async (filter, signal) => {
    const data = unwrap(await authorizedAxios.post('/wash-order/summary', filter, { signal }), item => Number.isInteger(item?.total) && item.total >= 0)
    const counts = orderStatusCounts(data.statusCounts)
    if (Object.values(counts).reduce((a, b) => a + b, 0) !== data.total) {
      throw invalid()
    }
    return { total: data.total, counts }
  },
  waiting: async (filter, signal) => {
    const { data } = await authorizedAxios.post('/order-assignment/filter', filter, { signal })
    if (data?.succeeded !== true || !Array.isArray(data.list) || !data.list.every(waiting) || !Number.isInteger(data.total) || data.total < 0) {
      throw invalid()
    }
    return { ...data, totalPages: Math.ceil(data.total / filter.take) }
  },
  candidates: async (id, signal) => unwrap(await authorizedAxios.get(`/order-assignment/${encodeURIComponent(id)}/candidates`, { signal }), data => data?.order?.id === id && waiting(data.order) && Array.isArray(data.merchants) && data.merchants.every(candidate)),
  assignMerchant: (id, merchantId) => write(`/order-assignment/${encodeURIComponent(id)}/assign`, { merchantId }, data => data?.orderId === id && data.merchantId === merchantId),
  suggest: async (orderIds, signal) => {
    if (!orderIds.length || orderIds.length > 50 || !orderIds.every(isId) || new Set(orderIds).size !== orderIds.length) {
      throw invalid()
    }
    return unwrap(await authorizedAxios.post('/order-assignment/auto-suggest', { orderIds }, { signal }), data => Array.isArray(data) && data.length === orderIds.length && new Set(data.map(item => item.orderId)).size === data.length && data.every(item => orderIds.includes(item.orderId) && (!item.suggested || candidate(item.suggested))))
  },
  autoAssign: (assignments) => {
    if (!pairsValid(assignments)) {
      throw invalid()
    }
    return write('/order-assignment/auto-assign', { assignments }, data => Array.isArray(data) && data.length === assignments.length && new Set(data.map(item => item.orderId)).size === data.length && data.every(item => assignments.some(pair => pair.orderId === item.orderId && pair.merchantId === item.merchantId)))
  },
  store: (id, values) => write('/wash-order/move-to-storage', { orderId: id, storageLocation: values.storageLocation.trim(), storageReference: values.storageReference.trim(), note: values.note?.trim() || null }, data => data?.id === id && data.status === 13)
}
