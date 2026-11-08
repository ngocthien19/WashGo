import authorizedAxios from '~/utils/authorizedAxios'
import { isId } from '~/pages/admin/Merchants/merchantModel'

const invalid = () => new Error('admin.invalidResponse')
const isMerchant = (value) => isId(value?.id) && ['businessName', 'email', 'phone', 'address', 'city', 'district'].every((key) => typeof value[key] === 'string') && [1, 2, 3].includes(value.status)
  && ['latitude', 'longitude', 'commissionRate', 'depositAmount', 'totalRevenue'].every((key) => Number.isFinite(value[key]))
  && ['totalOrders', 'unfinishedOrders', 'maxCapacity', 'serviceRadiusKm'].every((key) => Number.isInteger(value[key]) && value[key] >= 0)
  && Array.isArray(value.imageUrls) && value.imageUrls.every((url) => typeof url === 'string') && Array.isArray(value.serviceAreaIds) && value.serviceAreaIds.every(isId)
const isRequest = (value) => isId(value?.id) && isId(value.merchantId) && [1, 2, 3].includes(value.status) && value.current && value.proposed && Array.isArray(value.changedFields) && value.changedFields.every((key) => typeof key === 'string')
const unwrap = (validate) => ({ data }) => {
  if (data?.succeeded !== true || !validate(data.data)) {
    throw invalid()
  }
  return data.data
}
const paged = (validate) => ({ data }) => {
  if (data?.succeeded !== true || !Array.isArray(data.list) || !data.list.every(validate) || !Number.isInteger(data.total) || data.total < 0 || !Number.isInteger(data.currentPage) || data.currentPage < 1) {
    throw invalid()
  }
  return { ...data, totalPages: Math.ceil(data.total / 12) }
}
const merchant = unwrap(isMerchant), request = unwrap(isRequest)
const write = async (method, path, body, validate) => {
  const result = await authorizedAxios[method](path, body)
  try {
    return validate(result)
  } catch {
    const error = invalid(); error.uncertain = true; throw error
  }
}
export const adminMerchantApi = {
  cities: async (signal) => {
    const cities = new Set()
    let page = 1, totalPages = 1
    // Merchant has no exposed distinct-city endpoint; use all pages, independent of table filters.
    while (page <= totalPages) {
      const result = await authorizedAxios.post('/merchant/filter', { page, take: 100 }, { signal }).then(paged(isMerchant))
      for (const row of result.list) {
        if (row.city.trim()) {
          cities.add(row.city)
        }
      }
      totalPages = Math.ceil(result.total / 100)
      page += 1
    }
    return [...cities].sort((a, b) => a.localeCompare(b, 'vi'))
  },
  list: (filter, signal) => authorizedAxios.post('/merchant/filter', filter, { signal }).then(paged(isMerchant)),
  detail: (id, signal) => authorizedAxios.get(`/merchant/${encodeURIComponent(id)}`, { signal }).then(merchant).then((value) => {
    if (value.id !== id) {
      throw invalid()
    } return value
  }),
  summary: async (signal) => {
    const counts = await Promise.all([undefined, 1, 2, 3].map((status) => authorizedAxios.post('/merchant/filter', { page: 1, take: 1, status }, { signal }).then(paged(isMerchant)).then((value) => value.total)))
    const pending = await authorizedAxios.post('/merchant-profile-request/filter', { page: 1, take: 1, status: 1 }, { signal }).then(paged(isRequest))
    return { counts, pending: pending.total }
  },
  create: (body) => write('post', '/merchant', body, merchant),
  update: (body) => write('put', '/merchant', body, (response) => {
    const value = merchant(response); if (value.id !== body.id) {
      throw invalid()
    } return value
  }),
  status: (id, status, rejectionReason, confirm) => write('put', '/merchant/status', { merchantId: id, status, rejectionReason, confirm }, (response) => {
    const value = merchant(response); if (value.id !== id || value.status !== status) {
      throw invalid()
    } return value
  }),
  requests: (filter, signal) => authorizedAxios.post('/merchant-profile-request/filter', filter, { signal }).then(paged(isRequest)),
  request: (id, signal) => authorizedAxios.get(`/merchant-profile-request/${encodeURIComponent(id)}`, { signal }).then(request).then((value) => {
    if (value.id !== id) {
      throw invalid()
    } return value
  }),
  review: (id, approve, reason) => write('post', `/merchant-profile-request/${encodeURIComponent(id)}/${approve ? 'approve' : 'reject'}`, approve ? undefined : { reason }, (response) => {
    const value = request(response); if (value.id !== id || value.status !== (approve ? 2 : 3)) {
      throw invalid()
    } return value
  })
}
