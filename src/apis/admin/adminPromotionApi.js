import authorizedAxios from '~/utils/authorizedAxios'
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
const write = async (method, path, body, validate) => {
  const response = await (method === 'delete' ? authorizedAxios.delete(path) : authorizedAxios[method](path, body))
  try {
    return unwrap(response, validate)
  } catch {
    const error = invalid(); error.uncertain = true; throw error
  }
}
export const adminPromotionApi = {
  list: async (query, signal) => {
    const { data } = await authorizedAxios.post('/promotion/filter', pick(query, ['keyword', 'status', 'discountType', 'fromDate', 'toDate', 'page', 'take']), { signal })
    if (data?.succeeded !== true || !Array.isArray(data.list) || !data.list.every(valid) || !Number.isInteger(data.total) || data.total < 0) {
      throw invalid()
    }
    return { ...data, currentPage: query.page, totalPages: Math.ceil(data.total / query.take) }
  },
  detail: (id, signal) => authorizedAxios.get(`/promotion/${encodeURIComponent(id)}`, { signal }).then(response => unwrap(response, value => valid(value) && value.id === id)),
  create: body => write('post', '/promotion', pick(body, promotionFields), valid),
  update: body => write('put', '/promotion', pick(body, ['id', ...promotionFields]), value => valid(value) && value.id === body.id),
  toggle: value => write('patch', `/promotion/${encodeURIComponent(value.id)}/toggle-active`, undefined, active => active === !value.isActive),
  remove: id => write('delete', `/promotion/${encodeURIComponent(id)}`, undefined, value => value === true),
  summary: signal => Promise.all([undefined, 2, 1, 3].map(status => adminPromotionApi.list({ page: 1, take: 1, status }, signal).then(result => result.total))),
  statistics: (id, range, signal) => authorizedAxios.get(`/promotion/${encodeURIComponent(id)}/statistics`, { params: pick(range, ['fromDate', 'toDate']), signal }).then(response => unwrap(response, value => value?.promotionId === id && ['usedCount', 'totalDiscountAmount', 'totalOrderAmount', 'revenue', 'paidRevenue'].every(key => Number.isFinite(value[key])) && Array.isArray(value.daily) && value.daily.every(day => /^\d{4}-\d{2}-\d{2}$/.test(day.date) && ['usedCount', 'discountAmount', 'revenue'].every(key => Number.isFinite(day[key]))))),
  export: async (id, range) => {
    const response = await authorizedAxios.get(`/promotion/${encodeURIComponent(id)}/statistics/export`, { params: pick(range, ['fromDate', 'toDate']), responseType: 'blob' })
    if (!(response.data instanceof Blob) || !response.data.size || !/^text\/csv\b/i.test(response.headers['content-type'] || '')) {
      throw invalid()
    }
    return response.data
  }
}
