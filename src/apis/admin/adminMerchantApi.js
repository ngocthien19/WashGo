import { newOperationId, versionGuard } from './adminWrite'
import authorizedAxios from '~/utils/http/authorizedAxios'
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
const write = async (method, path, body, validate, params, action) => {
  const operationId = body?.operationId || body?.clientRequestId || params?.operationId
  let result
  try {
    result = await (params ? authorizedAxios[method](path, body, { params }) : authorizedAxios[method](path, body))
  } catch (failure) {
    if (!operationId || failure.response && failure.response.status < 500) {
      throw failure
    }
    try {
      const lookup = await authorizedAxios.get(`/merchant/operations/${operationId}`)
      if (lookup.data?.succeeded !== true || lookup.data.data?.operationId !== operationId || lookup.data.data.operation !== action) {
        throw invalid()
      }
      result = { data: lookup.data.data.result }
    } catch {
      failure.uncertain = true; throw failure
    }
  }
  try {
    return validate(result)
  } catch {
    const failure = invalid(); failure.uncertain = true; throw failure
  }
}
export const adminMerchantApi = {
  cities: async signal => {
    const { data } = await authorizedAxios.get('/merchant/cities', { signal })
    if (data?.succeeded !== true || !Array.isArray(data.data) || data.data.some(city => typeof city !== 'string')) {
      throw invalid()
    }
    return data.data
  },
  list: (filter, signal) => authorizedAxios.post('/merchant/filter', filter, { signal }).then(paged(isMerchant)),
  detail: (id, signal) => authorizedAxios.get(`/merchant/${encodeURIComponent(id)}`, { signal }).then(merchant).then((value) => {
    if (value.id !== id) {
      throw invalid()
    } return value
  }),
  summary: async signal => {
    const { data } = await authorizedAxios.get('/merchant/summary', { signal })
    const value = data?.data
    if (data?.succeeded !== true || ['total', 'active', 'inactive', 'suspended', 'pendingProfileRequests'].some(key => !Number.isInteger(value?.[key]) || value[key] < 0)) {
      throw invalid()
    }
    return { counts: [value.total, value.active, value.inactive, value.suspended], pending: value.pendingProfileRequests }
  },
  create: (body) => write('post', '/merchant', { ...body, clientRequestId: newOperationId() }, merchant, undefined, 'Create'),
  update: (body) => write('put', '/merchant', { ...body, ...versionGuard(body.expectedVersion) }, (response) => {
    const value = merchant(response); if (value.id !== body.id) {
      throw invalid()
    } return value
  }, undefined, 'Update'),
  status: (id, status, rejectionReason, confirm, version) => write('put', '/merchant/status', { merchantId: id, status, rejectionReason, confirm, ...versionGuard(version) }, (response) => {
    const value = merchant(response); if (value.id !== id || value.status !== status) {
      throw invalid()
    } return value
  }, undefined, 'Status'),
  requests: (filter, signal) => authorizedAxios.post('/merchant-profile-request/filter', filter, { signal }).then(paged(isRequest)),
  request: (id, signal) => authorizedAxios.get(`/merchant-profile-request/${encodeURIComponent(id)}`, { signal }).then(request).then((value) => {
    if (value.id !== id) {
      throw invalid()
    } return value
  }),
  review: (id, approve, reason, version) => write('post', `/merchant-profile-request/${encodeURIComponent(id)}/${approve ? 'approve' : 'reject'}`, approve ? undefined : { reason, ...versionGuard(version) }, (response) => {
    const value = request(response); if (value.id !== id || value.status !== (approve ? 2 : 3)) {
      throw invalid()
    } return value
  }, approve ? versionGuard(version) : undefined, approve ? 'ApproveProfile' : 'RejectProfile')
}
