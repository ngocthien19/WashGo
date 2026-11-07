import authorizedAxios from '~/utils/authorizedAxios'

const fields = ['fullName', 'phone', 'email', 'vehicleType', 'vehiclePlate']
const pick = (value, keys) => Object.fromEntries(keys.filter((key) => value[key] !== undefined).map((key) => [key, value[key]]))
const detail = ({ data }) => {
  if (data?.succeeded !== true || !data.data?.id || typeof data.data.fullName !== 'string' || typeof data.data.isActive !== 'boolean') {
    const failure = new Error('merchant.invalidResponse')
    failure.uncertain = true
    throw failure
  }
  return { ...data.data, avatar: data.data.avatarUrl }
}
export const merchantShipperApi = {
  summary: async (signal) => {
    const { data } = await authorizedAxios.get('/shipper/summary', { signal })
    const value = data?.data
    if (data?.succeeded !== true || ['total', 'working', 'onLeave', 'available', 'busy', 'offline', 'locked'].some((key) => !Number.isInteger(value?.[key]) || value[key] < 0) || value.working + value.onLeave !== value.total || value.available + value.busy + value.offline !== value.total) {
      throw new Error('merchant.invalidResponse')
    }
    return value
  },
  list: (filter, signal) => authorizedAxios.post('/shipper/filter', pick(filter, ['keyword', 'status', 'isActive', 'page', 'take', 'sortBy']), { signal }).then(({ data }) => {
    if (data?.succeeded !== true || !Array.isArray(data.list) || !Number.isInteger(data.total) || data.total < 0 || data.list.some((item) => !item.id || typeof item.isActive !== 'boolean')) {
      throw new Error('merchant.invalidResponse')
    }
    return { ...data, list: data.list.map((item) => ({ ...item, avatar: item.avatarUrl })), currentPage: filter.page, totalPages: Math.ceil(data.total / filter.take) }
  }),
  detail: (id, signal) => authorizedAxios.get(`/shipper/${encodeURIComponent(id)}`, { signal }).then(detail).then((data) => {
    if (data.id !== id) {
      throw new Error('merchant.invalidResponse')
    }
    return data
  }),
  create: (value) => authorizedAxios.post('/shipper', pick(value, [...fields, 'identityNumber', 'identityFrontImageUrl', 'identityBackImageUrl', 'clientRequestId'])).then(detail),
  update: (id, value) => {
    if (!Number.isSafeInteger(value.expectedRevision) || value.expectedRevision < 0) {
      throw new Error('merchant.shippers.changed')
    }
    return authorizedAxios.put(`/shipper/${encodeURIComponent(id)}`, pick(value, [...fields, 'isActive', 'identityNumber', 'identityFrontImageUrl', 'identityBackImageUrl', 'expectedRevision'])).then(detail).then((result) => {
      if (result.id !== id) {
        const error = new Error('merchant.invalidResponse'); error.uncertain = true; throw error
      }
      return result
    })
  },
  account: async (action, id, reason) => {
    const path = `/shipper/${encodeURIComponent(id)}`
    const { data } = action === 'delete' ? await authorizedAxios.delete(path, { params: { reason } }) : await authorizedAxios.post(`${path}/${action}`, { reason })
    const codes = { lock: ['Locked', 'AlreadyLocked'], unlock: ['Unlocked', 'AlreadyUnlocked'], delete: ['Deleted', 'AlreadyDeleted'] }
    if (data?.succeeded !== true || action !== 'unlock' && !codes[action]?.includes(data.meta?.code) || action !== 'delete' && (data.data?.id !== id || data.data.accountActive !== (action === 'unlock'))) {
      const error = new Error('merchant.invalidResponse'); error.uncertain = true; throw error
    }
    return data
  },
  batch: async (action, shipperIds, reason) => {
    if (action === 'unlock') {
      const results = []
      for (const shipperId of [...new Set(shipperIds)]) {
        try {
          await merchantShipperApi.account('unlock', shipperId, reason || null)
          results.push({ shipperId, succeeded: true, code: 'Unlocked' })
        } catch (error) {
          const unknown = error.uncertain || !error.response || error.response.status >= 500
          results.push({ shipperId, succeeded: false, code: unknown ? 'Unknown' : error.response?.data?.meta?.code || 'UnlockFailed', message: unknown ? 'merchant.shipperSync.actionUnknown' : 'merchant.shipperSync.unlockFailed' })
        }
      }
      return { results, succeeded: results.filter((item) => item.succeeded).length, failed: results.filter((item) => !item.succeeded).length }
    }
    const { data } = await authorizedAxios.post(`/shipper/batch/${action}`, { shipperIds, reason })
    const result = data?.data
    const ids = new Set(shipperIds)
    if (data?.succeeded !== true || !Array.isArray(result?.results) || result.results.length !== ids.size || new Set(result.results.map((item) => item.shipperId)).size !== ids.size || result.results.some((item) => !ids.has(item.shipperId) || typeof item.succeeded !== 'boolean') || result.succeeded !== result.results.filter((item) => item.succeeded).length || result.failed !== result.results.filter((item) => !item.succeeded).length) {
      const error = new Error('merchant.invalidResponse'); error.uncertain = true; throw error
    }
    return result
  },
  tasks: async (id, { page = 1, take = 6, taskType, status }, signal) => {
    const { data } = await authorizedAxios.post(`/shipper/${encodeURIComponent(id)}/tasks`, { page, take, taskType, status }, { signal })
    if (data?.succeeded !== true || !Array.isArray(data.list) || !Number.isInteger(data.total) || data.total < 0 || data.list.some((item) => !item.taskId || !item.orderId || ![1, 2].includes(item.taskType) || ![1, 2, 3, 4].includes(item.status))) {
      throw new Error('merchant.invalidResponse')
    }
    return { ...data, currentPage: page, totalPages: Math.ceil(data.total / take) }
  },
  audits: async (id, signal) => {
    const { data } = await authorizedAxios.get(`/shipper/${encodeURIComponent(id)}/audits`, { signal })
    if (data?.succeeded !== true || !Array.isArray(data.data)) {
      throw new Error('merchant.invalidResponse')
    }
    return data.data
  }
}
