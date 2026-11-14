import { readOrdersQuery, writeOrdersQuery, buildOrdersFilter } from '~/utils/orders/ordersQuery'
import { PAGE_SIZE } from './orderModel'

import { validDay, validRange } from '~/utils/format/dateRange'
export { validDay, validRange } from '~/utils/format/dateRange'
export const readMerchantOrdersQuery = (params) => {
  let from = validDay(params.get('from') || '') ? params.get('from') : ''
  let to = validDay(params.get('to') || '') ? params.get('to') : ''
  if (!validRange(from, to)) {
    from = ''; to = ''
  }
  return { ...readOrdersQuery(params), from, to }
}
export const writeMerchantOrdersQuery = (query) => {
  const params = writeOrdersQuery(query)
  for (const key of ['from', 'to']) {
    if (validDay(query[key] || '')) {
      params.set(key, query[key])
    }
  }
  return params
}
export const orderScopeFilter = (query) => ({
  keyword: query.keyword || undefined,
  paymentStatus: query.paymentStatus ? Number(query.paymentStatus) : undefined,
  fromDate: query.from ? Math.floor(Date.parse(`${query.from}T00:00:00+07:00`) / 1000) : undefined,
  toDate: query.to ? Math.floor(Date.parse(`${query.to}T23:59:59+07:00`) / 1000) : undefined
})
export const buildMerchantOrdersFilter = (query) => ({ ...buildOrdersFilter(query), take: PAGE_SIZE, ...orderScopeFilter(query) })
