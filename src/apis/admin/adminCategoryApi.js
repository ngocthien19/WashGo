import authorizedAxios from '~/utils/http/authorizedAxios'
import { adminWrite, adminOperation, validateBatch } from './adminWrite'

const base = '/admin/service-categories'
const pending = new Map()
const invalid = () => new Error('categories.invalidResponse')
export const validCategory = item => Boolean(item?.id && typeof item.code === 'string' && typeof item.name === 'string' && typeof item.isActive === 'boolean')
const unwrap = response => {
  if (response.data?.succeeded !== true || !response.data.data) {
    throw invalid()
  }
  return response.data.data
}
const page = response => {
  const value = response.data
  if (value?.succeeded !== true || !Array.isArray(value.list) || !value.list.every(validCategory) || !Number.isInteger(value.total) || value.total < 0 || !Number.isInteger(value.currentPage) || !Number.isInteger(value.totalPages)) {
    throw invalid()
  }
  return value
}
const single = (response, id) => {
  const value = unwrap(response)
  if (!validCategory(value) || id && value.id !== id || typeof value.version !== 'string' || !value.version) {
    throw invalid()
  }
  return value
}
const send = async intent => {
  try {
    const result = intent.batch
      ? unwrap(await authorizedAxios.post(`${base}/batch/${intent.action}`, intent.body))
      : single(await adminWrite('ServiceCategory', 'Save', intent.id || 'new', intent.id ? 'put' : 'post', intent.id ? `${base}/${intent.id}` : base, intent.body), intent.id)
    if (intent.batch) {
      if (result.state !== 'Completed') {
        throw Object.assign(new Error('admin.sync.processing'), { uncertain: true })
      }
      validateBatch(result, intent.body.operationId, intent.body.items)
    }
    pending.delete(intent.key)
    return result
  } catch (error) {
    if (error.uncertain || !error.response || error.response.status >= 500 || error.response.status === 408) {
      error.uncertain = true
    } else {
      pending.delete(intent.key)
    }
    throw error
  }
}
export const adminCategoryApi = {
  summary: async signal => {
    const results = await Promise.all([undefined, true, false].map(isActive => adminCategoryApi.filter({ page: 1, take: 1, sortBy: 'sortOrder', isActive }, signal)))
    return { total: results[0].total, active: results[1].total, inactive: results[2].total }
  },
  filter: (query, signal) => authorizedAxios.post(`${base}/filter`, query, { signal }).then(page),
  detail: (id, signal) => authorizedAxios.get(`${base}/${encodeURIComponent(id)}`, { signal }).then(response => single(response, id)),
  pending: () => [...pending.values()],
  execute: intent => {
    if (pending.has(intent.key)) {
      throw new Error('categories.unknown')
    }
    pending.set(intent.key, intent)
    return send(intent)
  },
  resume: key => {
    const intent = pending.get(key)
    if (!intent) {
      throw invalid()
    }
    return send(intent)
  },
  check: async key => {
    const intent = pending.get(key)
    if (!intent) {
      throw invalid()
    }
    if (!intent.batch) {
      const operation = await adminOperation('ServiceCategory', intent.body.operationId)
      if (operation.state !== 'Completed' || operation.action !== 'Save' || operation.resourceId !== (intent.id || 'new')) {
        throw invalid()
      }
      if (operation.result?.succeeded === false) {
        pending.delete(key)
        throw Object.assign(new Error(operation.result.message || 'categories.invalidResponse'), { response: { status: operation.result.statusCode || 409, data: operation.result } })
      }
      const result = single({ data: operation.result }, intent.id)
      pending.delete(key)
      return result
    }
    const result = unwrap(await authorizedAxios.get(`${base}/operations/${intent.body.operationId}`))
    if (result.operationId !== intent.body.operationId || !['Completed', 'Processing'].includes(result.state)) {
      throw invalid()
    }
    if (result.state === 'Completed') {
      validateBatch(result, intent.body.operationId, intent.body.items)
      pending.delete(key)
    }
    return result
  }
}
