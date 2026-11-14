import { adminWrite, newOperationId, versionGuard, administrativeSummary, administrativeBatch } from './adminWrite'
import authorizedAxios from '~/utils/http/authorizedAxios'
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
const write = async (method, path, body, validate, guard = {}, action = 'Update', resource = body?.id || body?.serviceId || 'new', module = 'Service') => {
  const response = await adminWrite(module, action, resource, method, path, method === 'delete' ? undefined : { ...body, ...guard }, method === 'delete' ? guard : undefined)
  try {
    return unwrap(response, validate)
  } catch {
    const error = invalid(); error.uncertain = true; throw error
  }
}
const fields = ['merchantId', 'code', 'name', 'description', 'unitPrice', 'pricePerKg', 'pricePerItem', 'serviceType', 'unit', 'estimatedDurationHours', 'imageUrls']
export const adminServiceApi = {
  merchants: adminLockerApi.merchants,
  catalog: (query, signal) => authorizedAxios.post('/wash-service/filter', pick(query, ['keyword', 'isActive', 'approvalStatus', 'serviceType', 'merchantId', 'page', 'take', 'sortBy']), { signal }).then(response => paged(response, query, valid)),
  proposals: (query, signal) => authorizedAxios.post('/service-proposal/filter', pick(query, ['keyword', 'status', 'requestType', 'merchantId', 'serviceId', 'page', 'take']), { signal }).then(response => paged(response, query, proposal)),
  service: (id, signal) => authorizedAxios.get(`/wash-service/${encodeURIComponent(id)}`, { signal }).then(response => unwrap(response, item => valid(item) && item.id === id)),
  proposal: (id, signal) => authorizedAxios.get(`/service-proposal/${encodeURIComponent(id)}`, { signal }).then(response => unwrap(response, item => proposal(item) && item.id === id)),
  summary: async signal => {
    const summary = await administrativeSummary('/wash-service/summary', signal)
    const entries = Object.entries(summary.counts)
    const active = entries.filter(([key]) => key.endsWith(':Active')).reduce((sum, [, count]) => sum + count, 0)
    if (!Number.isInteger(summary.pendingProposals) || summary.pendingProposals < 0) {
      throw invalid()
    }
    return [summary.total, active, summary.total - active, summary.pendingProposals]
  },
  batch: body => administrativeBatch('Service', '/wash-service/batch', body),
  create: body => write('post', '/wash-service', pick(body, fields), valid, { operationId: newOperationId() }, 'Create'),
  update: body => write('put', '/wash-service', pick(body, [...fields, 'id', 'isActive']), item => valid(item) && item.id === body.id, versionGuard(body.expectedVersion)),
  status: (service, active) => write('put', '/wash-service/status', { serviceId: service.id, approvalStatus: service.approvalStatus, isActive: active }, item => valid(item) && item.id === service.id && item.isActive === active && item.approvalStatus === service.approvalStatus, versionGuard(service.version), 'Status'),
  remove: (id, version) => write('delete', `/wash-service/${encodeURIComponent(id)}`, undefined, value => value === true, versionGuard(version), 'Delete', id),
  review: async (id, approve, reason, version) => {
    const guard = versionGuard(version)
    const path = `/service-proposal/${encodeURIComponent(id)}/${approve ? 'approve' : 'reject'}`
    const response = await adminWrite('Service', approve ? 'ApproveProposal' : 'RejectProposal', id, 'post', path, approve ? undefined : { reason, ...guard }, approve ? guard : undefined)
    try {
      return unwrap(response, item => proposal(item) && item.id === id && item.status === (approve ? 2 : 3))
    } catch (failure) {
      failure.uncertain = true
      throw failure
    }
  }
}
