import authorizedAxios from '~/utils/http/authorizedAxios'

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
  summary: async (signal) => {
    const { data } = await authorizedAxios.get('/locker/summary', { signal })
    const value = data?.data
    const fields = ['totalLockers', 'activeLockers', 'maintenanceLockers', 'inactiveLockers', 'totalBoxes', 'availableBoxes', 'occupiedBoxes', 'reservedBoxes', 'maintenanceBoxes']
    if (data?.succeeded !== true || fields.some((key) => !Number.isSafeInteger(value?.[key]) || value[key] < 0) || value.totalLockers !== value.activeLockers + value.maintenanceLockers + value.inactiveLockers || value.totalBoxes !== value.availableBoxes + value.occupiedBoxes + value.reservedBoxes + value.maintenanceBoxes) {
      throw invalid()
    }
    return { ...value, total: value.totalLockers, active: value.activeLockers, maintenance: value.maintenanceLockers, inactive: value.inactiveLockers }
  },
  detail: async (id, signal) => {
    const { data } = await authorizedAxios.get(`/locker/${encodeURIComponent(id)}`, { signal })
    if (data?.succeeded !== true || data.data?.id !== id || !validLocker(data.data) || !Array.isArray(data.data.boxes) || data.data.boxes.some((box) => !box.id || !Number.isInteger(box.status))) {
      throw invalid()
    }
    return data.data
  },
  history: async (id, { page, take, boxId, fromDate, toDate }, signal) => {
    const { data } = await authorizedAxios.get(`/locker/${encodeURIComponent(id)}/usage-history`, { params: { page, take, boxId, fromDate, toDate }, signal })
    const result = pageResult(data, page, take, (item) => item.orderId && typeof item.usageId === 'string' && item.usageId.length > 0 && typeof item.orderCode === 'string' && [1, 2].includes(item.usageType))
    if (new Set(result.list.map((item) => item.usageId)).size !== result.list.length) {
      throw invalid()
    }
    return result
  }
}
