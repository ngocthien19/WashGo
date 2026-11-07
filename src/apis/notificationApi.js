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
