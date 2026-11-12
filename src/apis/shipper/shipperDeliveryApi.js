import authorizedAxios from '~/utils/authorizedAxios'

const pick = value => Object.fromEntries(['fromDate', 'toDate', 'taskType', 'keyword', 'lockerId', 'cancelledReturn', 'eventStatus', 'sortBy', 'page', 'take'].filter(key => value[key] !== undefined).map(key => [key, value[key]]))
const unwrap = ({ data }) => {
  if (data?.succeeded !== true || data.data == null) {
    throw new Error('shipper.invalidResponse')
  } return data.data
}
export const shipperDeliveryApi = {
  summary: (query, signal) => authorizedAxios.post('/shipper-delivery/summary', pick(query), { signal }).then(unwrap).then(value => {
    if (!['total', 'collectCount', 'returnCount'].every(key => Number.isInteger(value[key]) && value[key] >= 0) || value.total !== value.collectCount + value.returnCount) {
      throw new Error('shipper.invalidResponse')
    } return value
  }),
  lockers: (query, signal) => authorizedAxios.post('/shipper-delivery/lockers/filter', pick(query), { signal }).then(unwrap),
  detail: (id, signal) => authorizedAxios.get(`/shipper-delivery/history/${encodeURIComponent(id)}`, { signal }).then(unwrap).then(value => {
    if (value.eventId !== id) {
      throw new Error('shipper.invalidResponse')
    } return value
  }),
  export: async query => {
    const response = await authorizedAxios.post('/shipper-delivery/export', pick(query), { responseType: 'blob' }); if (!(response.data instanceof Blob) || !response.data.size || !/^text\/csv\b/i.test(response.headers['content-type'] || '')) {
      throw new Error('shipper.invalidResponse')
    } return response.data
  },
  list: async (query = {}, signal) => {
    const { page = 1, take = 12 } = query
    const body = { ...pick(query), page, take }
    const { data } = await authorizedAxios.post('/shipper-delivery/history', body, { signal })
    if (data?.succeeded !== true || !Array.isArray(data.list) || !Number.isSafeInteger(data.total) || data.total < 0
      || data.list.length > take || data.list.length > data.total || data.list.some((row) => !row.eventId || !row.orderId || !row.orderCode
        || ![1, 2].includes(row.taskType) || typeof row.lockerName !== 'string' || !Number.isFinite(Date.parse(row.completedAt)))) {
      throw new Error('shipper.invalidResponse')
    }
    return { list: data.list, total: data.total, currentPage: page, totalPages: Math.ceil(data.total / take) }
  }
}
