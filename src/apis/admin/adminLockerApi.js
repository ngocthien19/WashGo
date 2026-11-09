import authorizedAxios from '~/utils/authorizedAxios'
import { merchantLockerApi } from '~/apis/merchant/merchantLockerApi'
import { isId } from '~/pages/admin/Lockers/lockerModel'

const invalid = () => new Error('admin.invalidResponse')
const pick = (value, keys) => Object.fromEntries(keys.filter(key => value[key] !== undefined).map(key => [key, value[key]]))
const valid = item => isId(item?.id) && typeof item.name === 'string' && typeof item.code === 'string' && [1, 2, 3].includes(item.status)
const unwrapWrite = async (method, path, body, validate) => {
  const { data } = method === 'delete' ? await authorizedAxios.delete(path) : await authorizedAxios[method](path, body)
  if (data?.succeeded !== true || !validate(data.data)) {
    const error = invalid(); error.uncertain = true; throw error
  }
  return data.data
}
const fields = ['name', 'address', 'ward', 'district', 'city', 'latitude', 'longitude', 'lockerType', 'description', 'imageUrls', 'merchantIds', 'serviceAreaId']
export const adminLockerApi = {
  summary: merchantLockerApi.summary,
  detail: merchantLockerApi.detail,
  history: merchantLockerApi.history,
  list: async (filter, signal) => {
    const { data } = await authorizedAxios.post('/locker/filter', pick(filter, ['keyword', 'status', 'city', 'merchantId', 'page', 'take', 'sortBy']), { signal })
    if (data?.succeeded !== true || !Array.isArray(data.list) || !data.list.every(valid) || !Number.isInteger(data.total) || data.total < 0) {
      throw invalid()
    }
    return { ...data, currentPage: filter.page, totalPages: Math.ceil(data.total / filter.take) }
  },
  cities: async signal => {
    const { data } = await authorizedAxios.post('/locker/column-distinct-values', { page: 1, take: 100 }, { params: { field: 'City' }, signal })
    if (data?.succeeded !== true || !Array.isArray(data.data) || data.data.some(item => typeof item.value !== 'string')) {
      throw invalid()
    }
    return [...new Set(data.data.map(item => item.value).filter(value => value.trim()))].sort((a, b) => a.localeCompare(b, 'vi'))
  },
  merchants: async signal => {
    const rows = new Map()
    let page = 1, pages = 1
    while (page <= pages) {
      const { data } = await authorizedAxios.post('/merchant/filter', { page, take: 100 }, { signal })
      if (data?.succeeded !== true || !Array.isArray(data.list) || !Number.isInteger(data.total) || data.total < 0 || data.list.some(row => !isId(row.id) || typeof row.businessName !== 'string' || ![1, 2, 3].includes(row.status))) {
        throw invalid()
      }
      data.list.forEach(row => rows.set(row.id, { id: row.id, name: row.businessName, status: row.status, email: typeof row.email === 'string' ? row.email : null, phone: typeof row.phone === 'string' ? row.phone : null, imageUrls: Array.isArray(row.imageUrls) ? row.imageUrls.filter(url => typeof url === 'string') : [] }))
      pages = Math.ceil(data.total / 100); page += 1
    }
    return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  },
  create: body => unwrapWrite('post', '/locker', pick(body, [...fields, 'code', 'boxCount', 'defaultBoxSize']), valid),
  update: body => unwrapWrite('put', '/locker', pick(body, [...fields, 'id', 'status']), item => valid(item) && item.id === body.id && item.status === body.status),
  remove: id => unwrapWrite('delete', `/locker/${encodeURIComponent(id)}`, null, value => value === true),
  boxStatus: body => unwrapWrite('put', '/locker/box-status', pick(body, ['lockerId', 'boxId', 'newStatus']), value => value === true)
}
