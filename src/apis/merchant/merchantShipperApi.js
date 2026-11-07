import authorizedAxios from '~/utils/authorizedAxios'

const fields = ['fullName', 'phone', 'email', 'vehicleType', 'vehiclePlate']
const pick = (value, keys) => Object.fromEntries(keys.filter((key) => value[key] !== undefined).map((key) => [key, value[key]]))
const detail = ({ data }) => {
  if (data?.succeeded !== true || !data.data?.id || typeof data.data.fullName !== 'string' || typeof data.data.isActive !== 'boolean') {
    const failure = new Error('merchant.invalidResponse')
    failure.uncertain = true
    throw failure
  }
  return data.data
}
export const merchantShipperApi = {
  summary: (signal) => Promise.all([
    { key: 'total' }, { key: 'working', isActive: true }, { key: 'onLeave', isActive: false },
    { key: 'available', status: 1 }, { key: 'busy', status: 2 }, { key: 'offline', status: 3 }
  ].map(async ({ key, ...filter }) => [key, (await merchantShipperApi.list({ page: 1, take: 1, ...filter }, signal)).total])).then(Object.fromEntries),
  list: (filter, signal) => authorizedAxios.post('/shipper/filter', pick(filter, ['keyword', 'status', 'isActive', 'page', 'take']), { signal }).then(({ data }) => {
    if (data?.succeeded !== true || !Array.isArray(data.list) || !Number.isInteger(data.total) || data.total < 0 || data.list.some((item) => !item.id || typeof item.isActive !== 'boolean')) {
      throw new Error('merchant.invalidResponse')
    }
    return { ...data, currentPage: filter.page, totalPages: Math.ceil(data.total / filter.take) }
  }),
  detail: (id, signal) => authorizedAxios.get(`/shipper/${encodeURIComponent(id)}`, { signal }).then(detail).then((data) => {
    if (data.id !== id) {
      throw new Error('merchant.invalidResponse')
    }
    return data
  }),
  create: (value) => authorizedAxios.post('/shipper', pick(value, [...fields, 'identityNumber', 'identityImageUrls'])).then(detail),
  update: (id, value) => authorizedAxios.put(`/shipper/${encodeURIComponent(id)}`, pick(value, [...fields, 'isActive'])).then(detail)
}
