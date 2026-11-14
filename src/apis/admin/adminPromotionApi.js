import { adminWrite, newOperationId, versionGuard, administrativeSummary, administrativeBatch } from './adminWrite'
import authorizedAxios from '~/utils/http/authorizedAxios'
import { isId } from '~/pages/admin/Merchants/merchantModel'

const pick = (value, keys) => Object.fromEntries(keys.filter(key => value[key] !== undefined).map(key => [key, value[key]]))
export const promotionFields = ['code', 'description', 'discountType', 'discountValue', 'minOrderAmount', 'maxDiscountAmount', 'startAt', 'endAt', 'usageLimit', 'usageLimitPerCustomer', 'isActive']
const invalid = () => new Error('admin.invalidResponse')
const valid = value => isId(value?.id) && typeof value.code === 'string' && [1, 2].includes(value.discountType) && [0, 1, 2, 3, 4].includes(value.status) && typeof value.isActive === 'boolean' && Number.isInteger(value.usedCount) && value.usedCount >= 0 && ['discountValue', 'minOrderAmount'].every(key => Number.isFinite(value[key])) && ['startAt', 'endAt'].every(key => Number.isFinite(Date.parse(value[key])))
const unwrap = (response, validate) => {
  if (response.data?.succeeded !== true || !validate(response.data.data)) {
    throw invalid()
  }
  return response.data.data
}
const write = async (method, path, body, validate, guard = {}, action = 'Update', resource = body?.id || 'new') => {
  const response = await adminWrite('Promotion', action, resource, method, path, method === 'delete' ? undefined : { ...body, ...guard }, method === 'delete' ? guard : undefined)
  try {
    return unwrap(response, validate)
  } catch {
    const error = invalid(); error.uncertain = true; throw error
  }
}
export const adminPromotionApi = {
  list: async (query, signal) => {
    const { data } = await authorizedAxios.post('/promotion/filter', pick(query, ['keyword', 'status', 'discountType', 'fromDate', 'toDate', 'page', 'take', 'sortBy']), { signal })
    if (data?.succeeded !== true || !Array.isArray(data.list) || !data.list.every(valid) || !Number.isInteger(data.total) || data.total < 0) {
      throw invalid()
    }
    return { ...data, currentPage: query.page, totalPages: Math.ceil(data.total / query.take) }
  },
  detail: (id, signal) => authorizedAxios.get(`/promotion/${encodeURIComponent(id)}`, { signal }).then(response => unwrap(response, value => valid(value) && value.id === id)),
  create: body => write('post', '/promotion', pick(body, promotionFields), valid, { operationId: newOperationId() }, 'Create'),
  update: body => write('put', '/promotion', pick(body, ['id', ...promotionFields]), value => valid(value) && value.id === body.id, versionGuard(body.expectedVersion)),
  toggle: value => write('put', `/promotion/${encodeURIComponent(value.id)}/status`, { isActive: !value.isActive }, next => valid(next) && next.id === value.id && next.isActive === !value.isActive, versionGuard(value.version), 'Status', value.id).then(next => next.isActive),
  remove: (id, version) => write('delete', `/promotion/${encodeURIComponent(id)}`, undefined, value => value === true, versionGuard(version), 'Delete', id),
  summary: async signal => {
    const value = await administrativeSummary('/promotion/summary', signal); return [value.total, value.counts.Active || 0, value.counts.Upcoming || 0, value.counts.Expired || 0]
  },
  batch: body => administrativeBatch('Promotion', '/promotion/batch', body),
  usages: async (id, query, signal) => {
    const { data } = await authorizedAxios.post(`/promotion/${id}/usages/filter`, pick(query, ['page', 'take', 'isReverted', 'orderId', 'customerId', 'fromDate', 'toDate', 'sortBy']), { signal })
    if (data?.succeeded !== true || !Array.isArray(data.list) || !Number.isInteger(data.total) || data.list.some(row => !isId(row.id) || !isId(row.orderId) || typeof row.isReverted !== 'boolean')) {
      throw invalid()
    }
    return data
  },
  statistics: (id, range, signal) => authorizedAxios.get(`/promotion/${encodeURIComponent(id)}/statistics`, { params: pick(range, ['fromDate', 'toDate']), signal }).then(response => unwrap(response, value => value?.promotionId === id && ['usedCount', 'totalDiscountAmount', 'totalOrderAmount', 'revenue', 'paidRevenue'].every(key => Number.isFinite(value[key])) && Array.isArray(value.daily) && value.daily.every(day => /^\d{4}-\d{2}-\d{2}$/.test(day.date) && ['usedCount', 'discountAmount', 'revenue'].every(key => Number.isFinite(day[key]))))),
  export: async (id, range) => {
    const response = await authorizedAxios.get(`/promotion/${encodeURIComponent(id)}/statistics/export`, { params: pick(range, ['fromDate', 'toDate']), responseType: 'blob' })
    if (!(response.data instanceof Blob) || !response.data.size || !/^text\/csv\b/i.test(response.headers['content-type'] || '')) {
      throw invalid()
    }
    return response.data
  }
}
