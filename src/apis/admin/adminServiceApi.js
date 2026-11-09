import authorizedAxios from '~/utils/authorizedAxios'
import { isId } from '~/pages/admin/Merchants/merchantModel'
import { adminLockerApi } from './adminLockerApi'
const invalid = () => new Error('admin.invalidResponse')
const pick = (value, keys) => Object.fromEntries(keys.filter(key => value[key] !== undefined).map(key => [key, value[key]]))
const valid = item => isId(item?.id) && typeof item.name === 'string' && typeof item.code === 'string' && typeof item.isActive === 'boolean' && [1, 2, 3].includes(item.approvalStatus)
const proposal = item => isId(item?.id) && isId(item.merchantId) && [1, 2, 3].includes(item.status) && [1, 2].includes(item.requestType) && typeof item.proposed?.name === 'string'
const unwrap = (response, validate) => {
  if (response.data?.succeeded !== true || !validate(response.data.data)) {
    throw invalid()
  } return response.data.data
}
const paged = (response, query, validate) => {
  const data = response.data
  if (data?.succeeded !== true || !Array.isArray(data.list) || !data.list.every(validate) || !Number.isInteger(data.total) || data.total < 0) {
    throw invalid()
  }
  return { ...data, currentPage: query.page, totalPages: Math.ceil(data.total / query.take) }
}
const write = async (method, path, body, validate) => {
  const response = await (method === 'delete' ? authorizedAxios.delete(path) : authorizedAxios[method](path, body))
  try {
    return unwrap(response, validate)
  } catch {
    const error = invalid(); error.uncertain = true; throw error
  }
}
const fields = ['merchantId', 'code', 'name', 'description', 'unitPrice', 'pricePerKg', 'pricePerItem', 'serviceType', 'unit', 'estimatedDurationHours']
export const adminServiceApi = {
  merchants: adminLockerApi.merchants,
  catalog: (query, signal) => authorizedAxios.post('/wash-service/filter', pick(query, ['keyword', 'isActive', 'approvalStatus', 'serviceType', 'merchantId', 'page', 'take', 'sortBy']), { signal }).then(response => paged(response, query, valid)),
  proposals: (query, signal) => authorizedAxios.post('/service-proposal/filter', pick(query, ['keyword', 'status', 'requestType', 'merchantId', 'serviceId', 'page', 'take']), { signal }).then(response => paged(response, query, proposal)),
  service: (id, signal) => authorizedAxios.get(`/wash-service/${encodeURIComponent(id)}`, { signal }).then(response => unwrap(response, item => valid(item) && item.id === id)),
  proposal: (id, signal) => authorizedAxios.get(`/service-proposal/${encodeURIComponent(id)}`, { signal }).then(response => unwrap(response, item => proposal(item) && item.id === id)),
  summary: async signal => {
    const result = await Promise.all([{}, { isActive: true }, { isActive: false }].map(query => adminServiceApi.catalog({ ...query, page: 1, take: 1 }, signal).then(result => result.total)))
    const pending = await adminServiceApi.proposals({ status: 1, page: 1, take: 1 }, signal)
    return [...result, pending.total]
  },
  create: body => write('post', '/wash-service', pick(body, fields), valid),
  update: body => write('put', '/wash-service', pick(body, [...fields, 'id', 'isActive']), item => valid(item) && item.id === body.id),
  status: (service, active) => write('put', '/wash-service/status', { serviceId: service.id, approvalStatus: service.approvalStatus, isActive: active }, item => valid(item) && item.id === service.id && item.isActive === active && item.approvalStatus === service.approvalStatus),
  remove: id => write('delete', `/wash-service/${encodeURIComponent(id)}`, undefined, value => value === true),
  review: (id, approve, reason) => write('post', `/service-proposal/${encodeURIComponent(id)}/${approve ? 'approve' : 'reject'}`, approve ? undefined : { reason }, item => proposal(item) && item.id === id && item.status === (approve ? 2 : 3))
}
