import authorizedAxios from '~/utils/authorizedAxios'
import { adminLockerApi } from './adminLockerApi'
import { validateRevenue } from './adminDashboardApi'
import { isId } from '~/pages/admin/Merchants/merchantModel'

const invalid = () => new Error('admin.invalidResponse')
const pick = (value, keys) => Object.fromEntries(keys.filter(key => value[key] !== undefined).map(key => [key, value[key]]))
const period = value => pick(value, ['merchantId', 'fromDate', 'toDate'])
const moneyKeys = ['grossRevenue', 'refundedAmount', 'netRevenue', 'commissionRate', 'commissionAmount', 'payoutAmount']
const commission = value => isId(value?.merchantId) && typeof value.merchantName === 'string' && moneyKeys.every(key => Number.isFinite(value[key])) && Number.isInteger(value.paidOrderCount) && value.paidOrderCount >= 0
const settlement = value => isId(value?.id) && isId(value.merchantId) && typeof value.merchantName === 'string' && moneyKeys.every(key => Number.isFinite(value[key])) && [1, 2].includes(value.status) && ['periodFrom', 'periodTo'].every(key => Number.isFinite(Date.parse(value[key]))) && Number.isInteger(value.orderCount) && value.orderCount >= 0
const refund = value => isId(value?.id) && isId(value.orderId) && isId(value.customerId) && [1, 2, 3, 4].includes(value.status) && Number.isFinite(value.amount) && value.amount > 0 && typeof value.reason === 'string'
const unwrap = (response, valid) => {
  if (response.data?.succeeded !== true || !valid(response.data.data)) {
    throw invalid()
  }
  return response.data.data
}
const write = async (path, body, valid) => {
  const response = await authorizedAxios.post(path, body)
  try {
    return unwrap(response, valid)
  } catch {
    const error = invalid(); error.uncertain = true; throw error
  }
}
export const adminFinanceApi = {
  merchants: adminLockerApi.merchants,
  revenue: (query, signal) => authorizedAxios.post('/finance/revenue-report', period(query), { signal }).then(response => unwrap(response, value => Boolean(validateRevenue(value)) && Array.isArray(value.byService) && value.byService.every(row => isId(row.serviceId) && typeof row.serviceName === 'string' && Number.isFinite(row.amount) && Number.isInteger(row.quantity)) && ['fromDate', 'toDate'].every(key => Number.isFinite(Date.parse(value[key]))))),
  commissions: (query, signal) => authorizedAxios.post('/finance/commissions', period(query), { signal }).then(response => unwrap(response, rows => Array.isArray(rows) && rows.every(commission))),
  settlements: async (query, signal) => {
    const { data } = await authorizedAxios.post('/finance/settlements/filter', pick(query, ['merchantId', 'status', 'page', 'take']), { signal })
    if (data?.succeeded !== true || !Array.isArray(data.list) || !data.list.every(settlement) || !Number.isInteger(data.total) || data.total < 0) {
      throw invalid()
    }
    return { ...data, currentPage: query.page, totalPages: Math.ceil(data.total / query.take) }
  },
  // No detail endpoint exists. Re-read the selected Merchant's actual paged list to find a current snapshot.
  settlement: async (item, signal) => {
    let page = 1, pages = 1
    while (page <= pages) {
      const result = await adminFinanceApi.settlements({ merchantId: item.merchantId, page, take: 100 }, signal)
      const found = result.list.find(row => row.id === item.id)
      if (found) {
        return found
      }
      pages = result.totalPages; page++
    }
    throw new Error('admin.finance.notFound')
  },
  create: body => write('/finance/settlements', period(body), value => settlement(value) && value.merchantId === body.merchantId && value.status === 1 && Math.floor(Date.parse(value.periodFrom) / 1000) === body.fromDate && Math.floor(Date.parse(value.periodTo) / 1000) === body.toDate),
  pay: (id, reference) => write(`/finance/settlements/${encodeURIComponent(id)}/confirm-paid`, { reference }, value => settlement(value) && value.id === id && value.status === 2 && value.paymentReference === reference),
  refunds: (status, signal) => authorizedAxios.get('/payment/refund-requests', { params: status ? { status: Number(status) } : {}, signal }).then(response => unwrap(response, rows => Array.isArray(rows) && rows.every(refund))),
  refund: (id, signal) => authorizedAxios.get(`/payment/refund-requests/${encodeURIComponent(id)}`, { signal }).then(response => unwrap(response, value => refund(value) && value.id === id)),
  review: (id, approve, reviewNote) => write(`/payment/refund-requests/${encodeURIComponent(id)}/review`, { approve, reviewNote }, value => refund(value) && value.id === id && value.status === (approve ? 2 : 3)),
  confirmRefund: (id, refundReference) => write(`/payment/refund-requests/${encodeURIComponent(id)}/confirm-refunded`, { refundReference }, value => refund(value) && value.id === id && value.status === 4 && value.refundReference === refundReference),
  export: async query => {
    const response = await authorizedAxios.post('/finance/revenue-report/export', period(query), { responseType: 'blob' })
    if (!(response.data instanceof Blob) || !response.data.size || !/^text\/csv\b/i.test(response.headers['content-type'] || '')) {
      throw invalid()
    }
    return response.data
  }
}
