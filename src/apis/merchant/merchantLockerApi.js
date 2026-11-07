import authorizedAxios from '~/utils/authorizedAxios'

const invalid = () => new Error('merchant.invalidResponse')
const pageResult = (data, page, take, validate) => {
  if (data?.succeeded !== true || !Array.isArray(data.list) || !Number.isInteger(data.total) || data.total < 0 || data.list.some((item) => !validate(item))) {
    throw invalid()
  }
  return { ...data, currentPage: page, totalPages: Math.ceil(data.total / take) }
}
const validLocker = (item) => item.id && typeof item.name === 'string' && typeof item.code === 'string' && Number.isInteger(item.status)
export const merchantLockerApi = {
  list: async ({ keyword, status, page, take, sortBy }, signal) => {
    const { data } = await authorizedAxios.post('/locker/filter', { keyword, status, page, take, sortBy }, { signal })
    return pageResult(data, page, take, validLocker)
  },
  summary: (signal) => Promise.all([
    { key: 'total' }, { key: 'active', status: 1 }, { key: 'maintenance', status: 2 }, { key: 'inactive', status: 3 }
  ].map(async ({ key, ...filter }) => [key, (await merchantLockerApi.list({ page: 1, take: 1, ...filter }, signal)).total])).then(Object.fromEntries),
  detail: async (id, signal) => {
    const { data } = await authorizedAxios.get(`/locker/${encodeURIComponent(id)}`, { signal })
    if (data?.succeeded !== true || data.data?.id !== id || !validLocker(data.data) || !Array.isArray(data.data.boxes) || data.data.boxes.some((box) => !box.id || !Number.isInteger(box.status))) {
      throw invalid()
    }
    return data.data
  },
  history: async (id, { page, take, boxId, fromDate, toDate }, signal) => {
    const { data } = await authorizedAxios.get(`/locker/${encodeURIComponent(id)}/usage-history`, { params: { page, take, boxId, fromDate, toDate }, signal })
    return pageResult(data, page, take, (item) => item.orderId && typeof item.orderCode === 'string' && [1, 2].includes(item.usageType))
  }
}
