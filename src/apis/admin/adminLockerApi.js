import { adminWrite, newOperationId, versionGuard, administrativeBatch } from './adminWrite'
import authorizedAxios from '~/utils/authorizedAxios'
import { merchantLockerApi } from '~/apis/merchant/merchantLockerApi'
import { isId } from '~/pages/admin/Lockers/lockerModel'

const invalid = () => new Error('admin.invalidResponse')
const pick = (value, keys) => Object.fromEntries(keys.filter(key => value[key] !== undefined).map(key => [key, value[key]]))
const valid = item => isId(item?.id) && typeof item.name === 'string' && typeof item.code === 'string' && [1, 2, 3].includes(item.status)
const unwrapWrite = async (method, path, body, validate, guard = {}, action = 'Update', resource = body?.boxId || body?.id || 'new') => {
  const { data } = await adminWrite('Locker', action, resource, method, path, method === 'delete' ? undefined : { ...body, ...guard }, method === 'delete' ? guard : undefined)
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
    const rows = [], take = 50
    let page = 1, total = Infinity
    while (rows.length < total) {
      const { data } = await authorizedAxios.get('/admin/lookups/merchants', { params: { page, take }, signal })
      if (data?.succeeded !== true || !Array.isArray(data.list) || !Number.isInteger(data.total) || data.list.some(row => !isId(row.id) || typeof row.name !== 'string') || !data.list.length && rows.length < data.total) {
        throw invalid()
      }
      rows.push(...data.list); total = data.total; page++
    }
    return rows
  },
  create: body => unwrapWrite('post', '/locker', pick(body, [...fields, 'code', 'boxCount', 'defaultBoxSize']), valid, { operationId: newOperationId() }, 'Create'),
  update: body => unwrapWrite('put', '/locker', pick(body, [...fields, 'id', 'status']), item => valid(item) && item.id === body.id && item.status === body.status, versionGuard(body.expectedVersion)),
  batch: body => administrativeBatch('Locker', '/locker/batch', body),
  remove: (id, version) => unwrapWrite('delete', `/locker/${encodeURIComponent(id)}`, null, value => value === true, versionGuard(version), 'Delete', id),
  boxStatus: body => unwrapWrite('put', '/locker/box-status', pick(body, ['lockerId', 'boxId', 'newStatus', 'expectedBoxStatus']), value => value === true, versionGuard(body.expectedVersion), 'BoxStatus')
}
