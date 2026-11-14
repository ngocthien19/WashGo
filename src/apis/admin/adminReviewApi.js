import authorizedAxios from '~/utils/http/authorizedAxios'
import { isId } from '~/pages/admin/Merchants/merchantModel'
import { adminLockerApi } from './adminLockerApi'
import { adminWrite, administrativeBatch, adminOperation, validateBatch, versionGuard } from './adminWrite'

const invalid = () => new Error('admin.invalidResponse')
const unsupported = error => [404, 405, 501].includes(error.response?.status)
const valid = row => isId(row?.id) && isId(row.orderId) && typeof row.orderCode === 'string' && Number.isInteger(row.overallStars) && row.overallStars >= 1 && row.overallStars <= 5 && typeof row.isHidden === 'boolean' && Number.isFinite(row.createdOn) && ['imageUrls', 'videoUrls'].every(key => row[key] == null || Array.isArray(row[key]) && row[key].every(url => typeof url === 'string'))
const unwrap = response => {
  if (response.data?.succeeded !== true || !valid(response.data.data)) {
    throw invalid()
  }
  return response.data.data
}
const queryBody = query => Object.fromEntries(['keyword', 'merchantId', 'orderId', 'customerId', 'stars', 'isHidden', 'fromDate', 'toDate', 'page', 'take'].filter(key => query[key] !== undefined).map(key => [key, query[key]]))
export const adminReviewApi = {
  merchants: adminLockerApi.merchants,
  list: async (query, signal) => {
    try {
      const { data } = await authorizedAxios.post('/rating/filter', queryBody(query), { signal })
      if (data?.succeeded !== true || !Array.isArray(data.list) || !data.list.every(valid) || !Number.isInteger(data.total) || data.total < 0) {
        throw invalid()
      }
      return { ...data, currentPage: query.page, totalPages: Math.ceil(data.total / query.take) }
    } catch (error) {
      if (unsupported(error)) {
        throw new Error('admin.reviews.unavailable')
      }
      throw error
    }
  },
  summary: async (query, signal) => {
    try {
      const body = queryBody(query); delete body.page; delete body.take
      const { data } = await authorizedAxios.post('/rating/summary', body, { signal })
      const value = data?.data ? { ...data.data, averageStars: data.data.visibleAverage } : null
      if (data?.succeeded !== true || !value || !['total', 'visible', 'hidden'].every(key => Number.isInteger(value[key]) && value[key] >= 0) || value.visible + value.hidden !== value.total || !(value.averageStars === null && value.visible === 0 || Number.isFinite(value.averageStars) && value.averageStars >= 1 && value.averageStars <= 5 && value.visible > 0)) {
        throw invalid()
      }
      return value
    } catch (error) {
      if (unsupported(error)) {
        return { unavailable: true }
      }
      throw error
    }
  },
  detail: async (id, signal) => {
    const row = unwrap(await authorizedAxios.get(`/rating/${encodeURIComponent(id)}`, { signal }))
    if (row.id !== id) {
      throw invalid()
    }
    return row
  },
  preview: async (row, signal) => {
    try {
      return { row: await adminReviewApi.detail(row.id, signal), fresh: true }
    } catch (error) {
      if (unsupported(error)) {
        return { row, fresh: false }
      }
      throw error
    }
  },
  visibility: async (row, hidden, reason, operationId) => {
    const response = await adminWrite('Rating', 'Visibility', row.id, 'patch', `/rating/${encodeURIComponent(row.id)}/visibility`, { isHidden: hidden, reason, ...versionGuard(row.version, operationId) })
    try {
      const next = unwrap(response)
      if (next.id !== row.id || next.isHidden !== hidden) {
        throw invalid()
      }
      return next
    } catch (error) {
      error.uncertain = true; throw error
    }
  },
  publish: async (row, reason, operationId, publishForCustomers = false) => {
    const response = await adminWrite('Rating', 'Publish', row.id, 'post', `/rating/${encodeURIComponent(row.id)}/publish`, { reason, ...versionGuard(row.version, operationId), ...(publishForCustomers ? { publishForCustomers: true } : {}) })
    try {
      const next = unwrap(response)
      if (next.id !== row.id || !next.contentApprovedAt || publishForCustomers && !next.publicApprovedAt) {
        throw invalid()
      }
      return next
    } catch (error) {
      error.uncertain = true; throw error
    }
  },
  batch: command => administrativeBatch('Rating', '/rating/batch', command),
  lookup: async (command, bulk) => {
    const value = await adminOperation('Rating', command.operationId)
    if (value.state !== 'Completed' || value.action !== (bulk ? 'Batch' : command.action === 'Publish' ? 'Publish' : 'Visibility') || value.resourceId !== (bulk ? 'batch' : command.items[0].id)) {
      throw new Error('admin.sync.processing')
    }
    if (bulk) {
      return validateBatch(value.result?.data, command.operationId, command.items)
    }
    const row = unwrap({ data: value.result })
    if (row.id !== command.items[0].id || (command.action === 'Publish' ? !row.contentApprovedAt || command.publishForCustomers && !row.publicApprovedAt : row.isHidden !== (command.action === 'Hide'))) {
      throw invalid()
    }
    return row
  }
}
