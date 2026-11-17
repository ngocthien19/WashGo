import authorizedAxios from '~/utils/http/authorizedAxios'

const paths = { Admin: '/admin/lookups/service-categories', Merchant: '/merchant/service-categories', Customer: '/customer/service-categories' }
export async function categoryLookup(role = 'Customer', signal, includeInactive = false) {
  const result = []
  let page = 1, pages = 1
  while (page <= pages) {
    const { data } = await authorizedAxios.get(paths[role] || paths.Customer, { params: { page, take: 100, ...(role === 'Admin' ? { includeInactive } : {}) }, signal })
    if (data?.succeeded !== true || !Array.isArray(data.list) || !Number.isInteger(data.totalPages) || data.totalPages < 0 || data.list.some(item => !item.id || typeof item.name !== 'string' || typeof item.isActive !== 'boolean')) {
      throw new Error('categories.invalidResponse')
    }
    result.push(...data.list)
    pages = data.totalPages
    page++
  }
  return result
}
