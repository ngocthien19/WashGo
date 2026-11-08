import authorizedAxios from '~/utils/authorizedAxios'

const invalid = () => new Error('merchant.invalidResponse')
export const merchantOrderMediaApi = {
  lockers: async signal => {
    const result = new Map()
    let page = 1, pages = 1
    while (page <= pages) {
      const { data } = await authorizedAxios.post('/locker/filter', { page, take: 100 }, { signal })
      if (data?.succeeded !== true || !Array.isArray(data.list) || !Number.isInteger(data.total)) {
        throw invalid()
      }
      for (const item of data.list) {
        result.set(item.id, item.imageUrls || [])
      }
      pages = Math.ceil(data.total / 100); page += 1
    }
    return Object.fromEntries(result)
  },
  media: async (kind, id, signal) => {
    const path = { locker: 'locker', service: 'merchant-service' }[kind]
    if (!path) {
      throw invalid()
    }
    const { data } = await authorizedAxios.get(`/${path}/${encodeURIComponent(id)}`, { signal })
    if (data?.succeeded !== true || data.data?.id !== id || !Array.isArray(data.data.imageUrls)) {
      throw invalid()
    }
    return data.data.imageUrls
  }
}
