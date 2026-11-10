import authorizedAxios from '~/utils/authorizedAxios'

export const shipperDeliveryApi = {
  list: async ({ fromDate, toDate, taskType, page = 1, take = 12 } = {}, signal) => {
    const body = { fromDate, toDate, taskType, page, take }
    const { data } = await authorizedAxios.post('/shipper-delivery/history', body, { signal })
    if (data?.succeeded !== true || !Array.isArray(data.list) || !Number.isSafeInteger(data.total) || data.total < 0
      || data.list.length > take || data.list.length > data.total || data.list.some((row) => !row.orderId || !row.orderCode
        || ![1, 2].includes(row.taskType) || typeof row.lockerName !== 'string' || !Number.isFinite(Date.parse(row.completedAt)))) {
      throw new Error('shipper.invalidResponse')
    }
    return { list: data.list, total: data.total, currentPage: page, totalPages: Math.ceil(data.total / take) }
  }
}
