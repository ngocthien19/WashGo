import { readOrdersQuery, writeOrdersQuery, buildOrdersFilter } from '~/utils/ordersQuery'
import { validDay, validRange } from '~/utils/dateRange'
import { isId } from '../Merchants/merchantModel'

export const TAKE = 12
export function readAdminOrdersQuery(params) {
  let from = validDay(params.get('from') || '') ? params.get('from') : ''
  let to = validDay(params.get('to') || '') ? params.get('to') : ''
  if (!validRange(from, to)) {
    from = ''; to = ''
  }
  return { ...readOrdersQuery(params), depositExpired: params.get('depositExpired') === 'true', from, to, tab: params.get('tab') === 'waiting' ? 'waiting' : 'all', overdue: params.get('overdue') === 'true', merchantId: isId(params.get('merchantId')) ? params.get('merchantId') : '', lockerId: isId(params.get('lockerId')) ? params.get('lockerId') : '' }
}
export function writeAdminOrdersQuery(query) {
  const params = writeOrdersQuery(query)
  for (const key of ['from', 'to', 'merchantId', 'lockerId']) {
    if (query[key]) {
      params.set(key, query[key])
    }
  }
  if (query.tab === 'waiting') {
    params.set('tab', 'waiting')
  }
  if (query.depositExpired) {
    params.set('depositExpired', 'true')
  }
  if (query.overdue) {
    params.set('overdue', 'true')
  }
  return params
}
export const scopeFilter = (query) => ({
  overdueType: query.depositExpired ? 'DepositExpired' : undefined,
  keyword: query.keyword || undefined, paymentStatus: query.paymentStatus ? Number(query.paymentStatus) : undefined,
  merchantId: query.merchantId || undefined, lockerId: query.lockerId || undefined,
  fromDate: query.from ? Math.floor(Date.parse(`${query.from}T00:00:00+07:00`) / 1000) : undefined,
  toDate: query.to ? Math.floor(Date.parse(`${query.to}T23:59:59+07:00`) / 1000) : undefined
})
export const listFilter = (query) => ({ ...buildOrdersFilter(query), ...scopeFilter(query), take: TAKE })
export const waitingFilter = (query) => ({ page: query.page, take: TAKE, fromDate: scopeFilter(query).fromDate, toDate: scopeFilter(query).toDate, overdueOnly: query.overdue || undefined })
export const canAssignMerchant = (order) => order.status === 2 && !order.merchantId
export const unknownResult = (error) => Boolean(error.uncertain || !error.response || error.response.status >= 500)
