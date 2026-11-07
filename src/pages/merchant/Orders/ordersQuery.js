import { readOrdersQuery, writeOrdersQuery, buildOrdersFilter } from '~/utils/ordersQuery'
import { PAGE_SIZE } from './orderModel'

export const validDay = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && Date.parse(`${value}T00:00:00+07:00`) > 0
}
export const validRange = (from, to) => (!from || validDay(from)) && (!to || validDay(to)) && (!from || !to || from <= to)
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
