import authorizedAxios from '~/utils/http/authorizedAxios'
import { INCIDENT_CONFIG } from '~/utils/config/constants'

const invalid = () => new Error('customer.incidents.invalidResponse')
const unwrap = ({ data }) => {
  if (data?.succeeded !== true || !data.data?.id || !data.data.orderId || !Number.isInteger(data.data.status)) {
    throw invalid()
  }
  return data.data
}

export const customerIncidentApi = {
  filter: (filter, signal) => authorizedAxios.post(`${INCIDENT_CONFIG.ENDPOINT}/mine/filter`, Object.fromEntries(['keyword', 'statuses', 'types', 'fromDate', 'toDate', 'sort', 'page', 'take'].filter((key) => filter[key] !== undefined).map((key) => [key, filter[key]])), { signal }).then(({ data }) => {
    if (data?.succeeded !== true || !Array.isArray(data.list) || !Number.isInteger(data.total) || data.total < 0 || data.list.some((item) => !item.id || !item.orderId)) {
      throw invalid()
    }
    return { ...data, currentPage: data.currentPage || filter.page, totalPages: Math.ceil(data.total / filter.take) }
  }),
  eligibility: (id, signal) => authorizedAxios.get(`${INCIDENT_CONFIG.ENDPOINT}/eligibility/${encodeURIComponent(id)}`, { signal }).then(({ data }) => {
    if (data?.succeeded !== true || data.data?.orderId !== id || typeof data.data.canReport !== 'boolean') {
      throw invalid()
    }
    return data.data
  }),
  request: (id) => authorizedAxios.get(`${INCIDENT_CONFIG.ENDPOINT}/mine/request/${encodeURIComponent(id)}`).then(unwrap).catch((error) => {
    if (error.response?.status === 404) {
      return null
    } throw error
  }),
  update: (id, { type, severity, description, imageUrls, videoUrls }) => authorizedAxios.put(`${INCIDENT_CONFIG.ENDPOINT}/${encodeURIComponent(id)}`, { type, severity, description, imageUrls, videoUrls }).then(unwrap).then((item) => {
    if (item.id !== id) {
      throw invalid()
    } return item
  }),
  withdraw: (id, reason) => authorizedAxios.post(`${INCIDENT_CONFIG.ENDPOINT}/${encodeURIComponent(id)}/withdraw`, { reason }).then(unwrap).then((item) => {
    if (item.id !== id || item.status !== 4) {
      throw invalid()
    } return item
  }),
  messages: (id, signal) => authorizedAxios.get(`${INCIDENT_CONFIG.ENDPOINT}/${encodeURIComponent(id)}/messages`, { signal }).then(({ data }) => {
    if (data?.succeeded !== true || !Array.isArray(data.data) || data.data.some((item) => item.incidentId !== id || !item.id || typeof item.content !== 'string')) {
      throw invalid()
    }
    return data.data
  }),
  message: (id, { content, imageUrls, videoUrls }) => authorizedAxios.post(`${INCIDENT_CONFIG.ENDPOINT}/${encodeURIComponent(id)}/messages`, { content, imageUrls, videoUrls }).then(({ data }) => {
    if (data?.succeeded !== true || data.data?.incidentId !== id || !data.data.id) {
      throw invalid()
    }
    return data.data
  }),
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
  create: ({ orderId, type, severity, description, imageUrls, videoUrls, clientRequestId }) => authorizedAxios.post(INCIDENT_CONFIG.ENDPOINT, { orderId, type, severity, description, imageUrls, videoUrls, clientRequestId })
    .then(unwrap).then((item) => {
      if (item.orderId !== orderId || item.status !== 1) {
        throw invalid()
      }
      return item
    })
}
