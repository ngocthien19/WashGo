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
export const merchantServiceApi = {
  catalog: async (filter, signal) => {
    const body = pick(filter, ['keyword', 'serviceType', 'isActive', 'page', 'take'])
    const { data } = await authorizedAxios.post('/merchant-service/filter', body, { signal })
    return pageResult(data, filter.page, filter.take, (item) => item.id && item.code && typeof item.name === 'string' && typeof item.isActive === 'boolean')
  },
  proposals: async (filter, signal) => {
    const { data } = await authorizedAxios.post('/service-proposal/filter', pick(filter, ['status', 'requestType', 'page', 'take']), { signal })
    return pageResult(data, filter.page, filter.take, validProposal)
  },
  proposal: async (id, signal) => {
    const { data } = await authorizedAxios.get(`/service-proposal/${encodeURIComponent(id)}`, { signal })
    if (data?.succeeded !== true || data.data?.id !== id || !validProposal(data.data)) {
      throw invalid()
    }
    return data.data
  },
  service: async (id, code, signal) => {
    const page = await merchantServiceApi.catalog({ keyword: code, page: 1, take: 100 }, signal)
    const item = page.list.find((row) => row.id === id)
    if (!item) {
      throw invalid()
    }
    return item
  },
  summary: async (signal) => {
    const requests = [
      ['total', 'catalog', {}], ['active', 'catalog', { isActive: true }], ['inactive', 'catalog', { isActive: false }],
      ['pending', 'proposals', { status: 1 }], ['approved', 'proposals', { status: 2 }], ['rejected', 'proposals', { status: 3 }]
    ]
    return Object.fromEntries(await Promise.all(requests.map(async ([key, source, filter]) => [key, (await merchantServiceApi[source]({ page: 1, take: 1, ...filter }, signal)).total])))
  },
  submit: async (serviceId, value) => {
    const path = serviceId ? `/merchant-service/${encodeURIComponent(serviceId)}/proposals` : '/merchant-service/proposals'
    const { data } = await authorizedAxios.post(path, pick(value, ['name', 'description', 'unitPrice', 'pricePerKg', 'pricePerItem', 'estimatedDurationHours', 'serviceType', 'unit', 'imageUrls', 'reason']))
    if (data?.succeeded !== true || !validProposal(data.data) || data.data.status !== 1 || (serviceId && data.data.serviceId !== serviceId)) {
      const error = invalid()
      error.uncertain = true
      throw error
    }
    return data.data
  }
}
