import authorizedAxios from '~/utils/http/authorizedAxios'

export const adminPaymentApi = {
  reconciliations: async (page, includeResolved, signal) => {
    const { data } = await authorizedAxios.get('/payment/reconciliations', { params: { page, take: 12, includeResolved }, signal })
    if (data?.succeeded !== true || !Array.isArray(data.list) || !Number.isSafeInteger(data.total) || data.total < 0 || data.currentPage !== page || !data.list.every(row => row?.id && row.orderId && typeof row.transactionReference === 'string' && Number.isFinite(row.amount) && row.amount >= 0 && [1, 2, 3, 4, 5].includes(row.status) && [0, 1, 2, 3, 4].includes(row.sessionState) && [1, 2, 3].includes(row.purpose))) {
      throw new Error('admin.invalidResponse')
    }
    return { ...data, totalPages: Math.ceil(data.total / 12) }
  }
}
