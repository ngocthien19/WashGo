import authorizedAxios from '~/utils/authorizedAxios'
import { NOTIFICATION_CONFIG } from '~/utils/constants'

const endpoint = NOTIFICATION_CONFIG.ENDPOINT
const invalid = () => new Error('customer.notification.invalidResponse')
export const isNotification = (item) => Boolean(item?.id && typeof item.title === 'string' && typeof item.content === 'string' && typeof item.isRead === 'boolean')
const unwrap = ({ data }) => {
  if (data?.succeeded !== true) {
    throw invalid()
  }
  return data.data
}
const count = (value) => {
  if (!Number.isInteger(value) || value < 0) {
    throw invalid()
  }
  return value
}
export const notificationApi = {
  filter: async (filter, signal) => {
    const body = Object.fromEntries(['keyword', 'groups', 'types', 'unreadOnly', 'fromDate', 'toDate', 'sort', 'page', 'take'].filter((key) => filter[key] !== undefined).map((key) => [key, filter[key]]))
    const { data } = await authorizedAxios.post(`${endpoint}/filter`, { ...body, take: NOTIFICATION_CONFIG.PAGE_SIZE }, { signal })
    const result = data?.data
    if (data?.succeeded !== true || !Array.isArray(result?.items) || !result.items.every(isNotification) || !Number.isInteger(result.total) || result.total < 0 || !Number.isInteger(result.page) || result.page < 1 || !Number.isInteger(result.take) || result.take <= 0 || !Number.isInteger(result.unreadTotal) || result.unreadTotal < 0 || !Array.isArray(result.counts) || result.counts.some((item) => typeof item.group !== 'string' || !Number.isInteger(item.total) || item.total < 0 || !Number.isInteger(item.unread) || item.unread < 0)) {
      throw invalid()
    }
    return { list: result.items, total: result.total, currentPage: result.page, totalPages: Math.ceil(result.total / result.take), counts: result.counts, unreadTotal: result.unreadTotal }
  },
  list: (page, unreadOnly, signal) => authorizedAxios.get(endpoint, { params: { page, take: NOTIFICATION_CONFIG.PAGE_SIZE, unreadOnly }, signal }).then(({ data }) => {
    if (data?.succeeded !== true || !Array.isArray(data.list) || !data.list.every(isNotification)
      || !Number.isInteger(data.total) || !Number.isInteger(data.currentPage) || !Number.isInteger(data.totalPages)) {
      throw invalid()
    }
    return data
  }),
  unread: (signal) => authorizedAxios.get(`${endpoint}/unread-count`, { signal }).then(unwrap).then(count),
  read: (id) => authorizedAxios.post(`${endpoint}/${encodeURIComponent(id)}/read`).then(unwrap).then((item) => {
    if (!isNotification(item) || item.id !== id || !item.isRead) {
      throw invalid()
    }
    return item
  }),
  readAll: () => authorizedAxios.post(`${endpoint}/read-all`).then(unwrap).then(count),
  removeAll: () => authorizedAxios.delete(endpoint).then(unwrap).then(count),
  remove: (id) => authorizedAxios.delete(`${endpoint}/${encodeURIComponent(id)}`).then(unwrap).then((value) => {
    if (value !== true) {
      throw invalid()
    }
  })
}
