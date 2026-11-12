import { adminWrite, versionGuard, newOperationId } from './adminWrite'
import authorizedAxios from '~/utils/authorizedAxios'
import { adminLockerApi } from './adminLockerApi'
import { validateRevenue } from './adminDashboardApi'
import { isId } from '~/pages/admin/Merchants/merchantModel'

const invalid = () => new Error('admin.invalidResponse')
const pick = (value, keys) => Object.fromEntries(keys.filter(key => value[key] !== undefined).map(key => [key, value[key]]))
const period = value => pick(value, ['merchantId', 'fromDate', 'toDate', 'granularity', 'asOf'])
const moneyKeys = ['grossRevenue', 'refundedAmount', 'netRevenue', 'commissionRate', 'commissionAmount', 'payoutAmount']
const commission = value => isId(value?.merchantId) && typeof value.merchantName === 'string' && moneyKeys.every(key => Number.isFinite(value[key])) && Number.isInteger(value.paidOrderCount) && value.paidOrderCount >= 0
const settlement = value => isId(value?.id) && isId(value.merchantId) && typeof value.merchantName === 'string' && moneyKeys.every(key => Number.isFinite(value[key])) && [1, 2, 3, 4].includes(value.status) && ['periodFrom', 'periodTo'].every(key => Number.isFinite(Date.parse(value[key]))) && Number.isInteger(value.orderCount) && value.orderCount >= 0
const refund = value => isId(value?.id) && isId(value.orderId) && isId(value.customerId) && [1, 2, 3, 4].includes(value.status) && Number.isFinite(value.amount) && value.amount > 0 && typeof value.reason === 'string'
const unwrap = (response, valid) => {
  if (response.data?.succeeded !== true || !valid(response.data.data)) {
    throw invalid()
  }
  return response.data.data
}
const write = async (path, body, valid, action, resource) => {
  const response = await adminWrite('Finance', action, resource, 'post', path, body)
  try {
    return unwrap(response, valid)
  } catch {
    const error = invalid(); error.uncertain = true; throw error
  }
}
export const adminFinanceApi = {
  merchants: adminLockerApi.merchants,
  commissionReview: (query, signal) => authorizedAxios.get('/finance/commission-snapshots/review', { params: query, signal }).then(response => unwrap(response, value => Array.isArray(value?.items) && Number.isInteger(value.total) && value.items.every(row => isId(row.orderId) && ['Missing', 'LegacyUnverified'].includes(row.reason) && typeof row.inSettlement === 'boolean' && (row.appliedRate === null || Number.isFinite(row.appliedRate)) && Number.isFinite(row.collectedLaundryAmount)))),
  reconcile: (id, body) => adminWrite('Finance', 'ReconcileCommission', id, 'post', `/finance/commission-snapshots/${encodeURIComponent(id)}/reconcile`, body),
  revenue: (query, signal) => authorizedAxios.post('/finance/revenue-report', period(query), { signal }).then(response => unwrap(response, value => Boolean(validateRevenue(value)) && Array.isArray(value.byService) && value.byService.every(row => isId(row.serviceId) && typeof row.serviceName === 'string' && Number.isFinite(row.amount) && Number.isInteger(row.quantity)) && ['fromDate', 'toDate'].every(key => Number.isFinite(Date.parse(value[key]))))),
  commissions: (query, signal) => authorizedAxios.post('/finance/commissions/paged', { ...period(query), page: query.page, take: query.take }, { signal }).then(response => unwrap(response, value => value?.page === query.page && value.take === query.take && Number.isInteger(value.total) && value.total >= 0 && Array.isArray(value.items) && value.items.every(commission) && ['grossRevenue', 'refundedAmount', 'netRevenue', 'commissionAmount', 'payoutAmount'].every(key => Number.isFinite(value[key])) && typeof value.commissionComplete === 'boolean')).then(value => ({ ...value, list: value.items, totalPages: Math.ceil(value.total / value.take) })),
  settlements: async (query, signal) => {
    const { data } = await authorizedAxios.post('/finance/settlements/filter', pick(query, ['merchantId', 'status', 'page', 'take', 'fromDate', 'toDate', 'paidFromDate', 'paidToDate', 'keyword', 'sortBy']), { signal })
    if (data?.succeeded !== true || !Array.isArray(data.list) || !data.list.every(settlement) || !Number.isInteger(data.total) || data.total < 0) {
      throw invalid()
    }
    return { ...data, currentPage: query.page, totalPages: Math.ceil(data.total / query.take) }
  },
  settlement: (item, signal) => authorizedAxios.get(`/finance/settlements/${encodeURIComponent(item.id)}`, { signal }).then(response => unwrap(response, value => settlement(value) && value.id === item.id)),
  lines: async (id, page, signal) => {
    const { data } = await authorizedAxios.get(`/finance/settlements/${encodeURIComponent(id)}/lines`, { params: { page, take: 12 }, signal })
    if (data?.succeeded !== true || !Array.isArray(data.list) || !Number.isInteger(data.total) || typeof data.isSnapshot !== 'boolean' || typeof data.basis !== 'string' || !Number.isFinite(Date.parse(data.generatedAt)) || data.list.some(row => !isId(row.orderId) || !Number.isFinite(row.collected) || !Number.isFinite(row.refunded))) {
      throw invalid()
    }
    return data
  },
  quote: (body, signal) => authorizedAxios.post('/finance/settlements/quote', period(body), { signal }).then(response => unwrap(response, value => typeof value?.quoteToken === 'string' && value.quoteToken.length > 0 && typeof value.canCreate === 'boolean' && commission(value.summary) && Array.isArray(value.breakdown?.lines))),
  create: body => write('/finance/settlements', { ...period(body), quoteToken: body.quoteToken, operationId: newOperationId() }, value => settlement(value) && value.merchantId === body.merchantId && [1, 3, 4].includes(value.status) && Math.floor(Date.parse(value.periodFrom) / 1000) === body.fromDate && Math.floor(Date.parse(value.periodTo) / 1000) === body.toDate, 'CreateSettlement', body.merchantId),
  pay: (id, reference, version) => write(`/finance/settlements/${encodeURIComponent(id)}/confirm-paid`, { reference, ...versionGuard(version) }, value => settlement(value) && value.id === id && value.status === 2 && value.paymentReference === reference, 'ConfirmSettlementPaid', id),
  refunds: async (query, signal) => {
    const { data } = await authorizedAxios.post('/payment/refund-requests/filter', pick(query, ['status', 'orderId', 'merchantId', 'customerId', 'keyword', 'fromDate', 'toDate', 'dateBasis', 'minAmount', 'maxAmount', 'sortBy', 'page', 'take']), { signal })
    if (data?.succeeded !== true || !Array.isArray(data.list) || !data.list.every(refund) || !Number.isInteger(data.total)) {
      throw invalid()
    }
    return { ...data, currentPage: query.page, totalPages: Math.ceil(data.total / query.take) }
  },
  refund: (id, signal) => authorizedAxios.get(`/payment/refund-requests/${encodeURIComponent(id)}`, { signal }).then(response => unwrap(response, value => refund(value) && value.id === id)),
  review: (id, approve, reviewNote, version) => write(`/payment/refund-requests/${encodeURIComponent(id)}/review`, { approve, reviewNote, ...versionGuard(version) }, value => refund(value) && value.id === id && value.status === (approve ? 2 : 3), 'ReviewRefund', id),
  confirmRefund: (id, refundReference, version) => write(`/payment/refund-requests/${encodeURIComponent(id)}/confirm-refunded`, { refundReference, ...versionGuard(version) }, value => refund(value) && value.id === id && value.status === 4 && value.refundReference === refundReference, 'ConfirmRefund', id),
  export: async query => {
    const response = await authorizedAxios.post('/finance/revenue-report/export', period(query), { responseType: 'blob' })
    if (!(response.data instanceof Blob) || !response.data.size || !/^text\/csv\b/i.test(response.headers['content-type'] || '')) {
      throw invalid()
    }
    return response.data
  }
}
