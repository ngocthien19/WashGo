import authorizedAxios from '~/utils/authorizedAxios'

const pending = new Map()
const invalid = () => new Error('storage.invalidResponse')
const uncertain = error => error.uncertain || !error.response || error.response.status >= 500 || error.response.status === 408
const unwrap = ({ data }) => {
  if (data?.succeeded !== true || data.data == null) {
    throw invalid()
  }
  return data.data
}
const cycle = (response, id) => {
  const value = unwrap(response)
  if (value.orderId !== id || !Number.isSafeInteger(value.orderRevision) || ![1, 2, 3, 4, 5, 6].includes(value.state)) {
    throw invalid()
  }
  return value
}
const path = id => `/storage/${encodeURIComponent(id)}`
const paged = ({ data }) => {
  if (data?.succeeded !== true || !Array.isArray(data.list) || !Number.isInteger(data.total) || data.total < 0 || data.list.length > data.total || !Number.isInteger(data.currentPage) || data.currentPage < 1 || !Number.isInteger(data.totalPages) || data.totalPages < 0 || data.list.some(row => !row.orderId || !row.orderCode || !Number.isSafeInteger(row.orderRevision) || ![1, 2, 3, 4, 5, 6].includes(row.state))) {
    throw invalid()
  }
  return data
}
const send = async (id, command) => {
  try {
    const result = cycle(await authorizedAxios.post(`${path(id)}/${command.action}`, command.body), id)
    pending.delete(id)
    return result
  } catch (error) {
    if (uncertain(error)) {
      error.uncertain = true
    } else {
      pending.delete(id)
    }
    throw error
  }
}
export const storageApi = {
  filter: (query, signal) => authorizedAxios.post('/storage/filter', query, { signal }).then(paged),
  summary: signal => authorizedAxios.get('/storage/summary', { signal }).then(unwrap).then(value => {
    if (typeof value !== 'object' || Array.isArray(value) || Object.values(value).some(count => !Number.isInteger(count) || count < 0)) {
      throw invalid()
    }
    return value
  }),
  cycles: (id, page = 1, signal) => authorizedAxios.get(`${path(id)}/cycles`, { params: { page, take: 20 }, signal }).then(paged),
  shippers: (id, signal) => authorizedAxios.get(`${path(id)}/shippers`, { signal }).then(unwrap).then(value => {
    if (!Array.isArray(value) || value.some(row => !row.id || typeof row.fullName !== 'string')) {
      throw invalid()
    }
    return value
  }),
  quote: (id, lockerId, signal) => authorizedAxios.get(`${path(id)}/quote`, { params: { lockerId }, signal }).then(unwrap).then(value => {
    if (value.orderId !== id || value.lockerId !== lockerId || !value.quoteToken || !Number.isFinite(Date.parse(value.expiresAt)) || ![value.feeTotal, value.outstanding].every(amount => Number.isFinite(amount) && amount >= 0)) {
      throw invalid()
    }
    return value
  }),
  hasPending: id => pending.has(id),
  execute: async (id, action, revision, values = {}) => {
    if (pending.has(id)) {
      throw Object.assign(new Error('storage.unknown'), { uncertain: true })
    }
    if (!Number.isSafeInteger(revision) || revision < 0 || !['assign', 'cancel-assignment', 'exception', 'verify-legacy', 'return-request', 'cancel-return', 'collect', 'handover', 'depart', 'place'].includes(action)) {
      throw invalid()
    }
    const allowed = ['reason', ...({ assign: ['shipperId'], 'verify-legacy': ['verificationReference', 'confirmedAtCurrentShop'], 'return-request': ['quoteToken'], collect: ['taskId', 'pinCode', 'qrCode'], handover: ['taskId', 'pinCode', 'qrCode', 'receiptReference'], depart: ['taskId', 'pinCode', 'qrCode'], place: ['taskId', 'pinCode', 'qrCode'] }[action] || [])]
    const body = { ...Object.fromEntries(allowed.filter(key => values[key] !== undefined).map(key => [key, values[key]])), expectedRevision: revision, operationId: crypto.randomUUID() }
    if (body.pinCode && body.qrCode) {
      throw invalid()
    }
    const command = { action, body }
    pending.set(id, command)
    return send(id, command)
  },
  check: async id => {
    const command = pending.get(id)
    if (!command) {
      throw new Error('storage.unknown')
    }
    try {
      const result = cycle(await authorizedAxios.get(`${path(id)}/operations/${command.body.operationId}`), id)
      pending.delete(id)
      return result
    } catch (error) {
      throw Object.assign(new Error('storage.unknown'), { cause: error, uncertain: true })
    }
  },
  replay: id => {
    const command = pending.get(id)
    if (!command) {
      throw new Error('storage.unknown')
    }
    return send(id, command)
  }
}
