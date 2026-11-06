import authorizedAxios from '~/utils/authorizedAxios'
import { INCIDENT_CONFIG } from '~/utils/constants'

const invalid = () => new Error('customer.incidents.invalidResponse')
const unwrap = ({ data }) => {
  if (data?.succeeded !== true || !data.data?.id || !data.data.orderId || !Number.isInteger(data.data.status)) {
    throw invalid()
  }
  return data.data
}

export const customerIncidentApi = {
  list: (page, signal) => authorizedAxios.get(`${INCIDENT_CONFIG.ENDPOINT}/mine`, { params: { page, take: INCIDENT_CONFIG.PAGE_SIZE }, signal })
    .then(({ data }) => {
      if (data?.succeeded !== true || !Array.isArray(data.list) || !Number.isInteger(data.currentPage)
        || !Number.isFinite(data.total) || !Number.isInteger(data.totalPages) || data.list.some((item) => !item.id || !item.orderId)) {
        throw invalid()
      }
      return data
    }),
  get: (id, signal) => authorizedAxios.get(`${INCIDENT_CONFIG.ENDPOINT}/${encodeURIComponent(id)}`, { signal }).then(unwrap).then((item) => {
    if (item.id !== id) {
      throw invalid()
    }
    return item
  }),
  create: ({ orderId, type, severity, description, imageUrls }) => authorizedAxios.post(INCIDENT_CONFIG.ENDPOINT, { orderId, type, severity, description, imageUrls })
    .then(unwrap).then((item) => {
      if (item.orderId !== orderId || item.status !== 1) {
        throw invalid()
      }
      return item
    })
}
