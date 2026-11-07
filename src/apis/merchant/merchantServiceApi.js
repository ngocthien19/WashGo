import authorizedAxios from '~/utils/authorizedAxios'

const invalid = () => new Error('merchant.invalidResponse')
const pick = (value, fields) => Object.fromEntries(fields.filter((key) => value[key] !== undefined).map((key) => [key, value[key]]))
const pageResult = (data, page, take, validate) => {
  if (data?.succeeded !== true || !Array.isArray(data.list) || !Number.isInteger(data.total) || data.total < 0 || data.list.some((item) => !validate(item))) {
    throw invalid()
  }
  return { ...data, currentPage: page, totalPages: Math.ceil(data.total / take) }
}
const validProposal = (item) => item?.id && [1, 2, 3].includes(item.status) && item.proposed && typeof item.proposed.name === 'string'
const validService = (item) => item?.id && item.code && typeof item.name === 'string' && typeof item.isActive === 'boolean'
export const merchantServiceApi = {
  catalog: async (filter, signal) => {
    const body = pick(filter, ['keyword', 'serviceType', 'isActive', 'page', 'take', 'sortBy'])
    const { data } = await authorizedAxios.post('/merchant-service/filter', body, { signal })
    return pageResult(data, filter.page, filter.take, validService)
  },
  proposals: async (filter, signal) => {
    const { data } = await authorizedAxios.post('/service-proposal/filter', pick(filter, ['keyword', 'serviceId', 'status', 'requestType', 'page', 'take']), { signal })
    return pageResult(data, filter.page, filter.take, validProposal)
  },
  proposal: async (id, signal) => {
    const { data } = await authorizedAxios.get(`/service-proposal/${encodeURIComponent(id)}`, { signal })
    if (data?.succeeded !== true || data.data?.id !== id || !validProposal(data.data)) {
      throw invalid()
    }
    return data.data
  },
  service: async (id, signal) => {
    const { data } = await authorizedAxios.get(`/merchant-service/${encodeURIComponent(id)}`, { signal })
    if (data?.succeeded !== true || data.data?.id !== id || !validService(data.data)) {
      throw invalid()
    }
    return data.data
  },
  summary: async (signal) => {
    const { data } = await authorizedAxios.get('/merchant-service/summary', { signal })
    const value = data?.data
    const keys = { total: 'totalServices', active: 'activeServices', inactive: 'inactiveServices', pending: 'pendingProposals', approved: 'approvedProposals', rejected: 'rejectedProposals' }
    if (data?.succeeded !== true || Object.values(keys).some((key) => !Number.isSafeInteger(value?.[key]) || value[key] < 0) || value.totalServices !== value.activeServices + value.inactiveServices) {
      throw invalid()
    }
    return Object.fromEntries(Object.entries(keys).map(([key, field]) => [key, value[field]]))
  },
  submit: async (serviceId, value) => {
    if (!value.clientRequestId || serviceId && !value.expectedVersion) {
      throw new Error('merchant.services.changed')
    }
    const path = serviceId ? `/merchant-service/${encodeURIComponent(serviceId)}/proposals` : '/merchant-service/proposals'
    const { data } = await authorizedAxios.post(path, pick(value, ['name', 'description', 'unitPrice', 'pricePerKg', 'pricePerItem', 'estimatedDurationHours', 'serviceType', 'unit', 'imageUrls', 'reason', 'expectedVersion', 'clientRequestId']))
    if (data?.succeeded !== true || !validProposal(data.data) || data.data.requestType !== (serviceId ? 2 : 1) || data.data.status !== 1 && data.meta?.replayed !== true || serviceId && data.data.serviceId !== serviceId) {
      const error = invalid()
      error.uncertain = true
      throw error
    }
    return data.data
  }
}
