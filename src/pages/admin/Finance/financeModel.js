import * as yup from 'yup'
import { validDay, vietnamToday, shiftDay, dateRangeFilter } from '~/utils/dateRange'
import { isId } from '~/pages/admin/Merchants/merchantModel'
export { unknownWrite } from '~/pages/admin/Services/serviceModel'
export const TAKE = 12
export const tabs = ['revenue', 'commissions', 'settlements', 'refunds']
export const validFinanceRange = (from, to) => validDay(from) && validDay(to) && from <= to && to <= vietnamToday() && (Date.parse(to) - Date.parse(from)) / 86400000 < 366
export const readQuery = params => {
  const today = vietnamToday(), valid = validFinanceRange(params.get('from'), params.get('to'))
  const tab = tabs.includes(params.get('tab')) ? params.get('tab') : 'revenue'
  const requested = params.get('period') || (valid ? 'custom' : 'month')
  const period = ['day', 'week', 'month'].includes(requested) ? requested : requested === 'custom' && valid ? 'custom' : 'month'
  const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7
  const from = period === 'custom' ? params.get('from') : period === 'day' ? today : period === 'week' ? shiftDay(today, -weekday) : `${today.slice(0, 7)}-01`
  return { tab, orderId: isId(params.get('orderId')) ? params.get('orderId') : '', period, from, to: period === 'custom' ? params.get('to') : today, merchantId: isId(params.get('merchantId')) ? params.get('merchantId') : '', status: (tab === 'refunds' ? ['1', '2', '3', '4'] : ['1', '2']).includes(params.get('status')) ? params.get('status') : '', page: /^\d{1,6}$/.test(params.get('page') || '') ? Math.max(1, Number(params.get('page'))) : 1 }
}
export const writeQuery = query => Object.fromEntries(Object.entries(query).filter(([key, value]) => value !== '' && !(key === 'page' && value === 1)))
export const periodFilter = query => ({ ...dateRangeFilter(query), merchantId: query.merchantId || undefined })
export const settlementFilter = query => ({ merchantId: query.merchantId || undefined, status: query.status ? Number(query.status) : undefined, page: query.page, take: TAKE })
export const settlementSnapshot = value => JSON.stringify(['id', 'merchantId', 'periodFrom', 'periodTo', 'orderCount', 'grossRevenue', 'refundedAmount', 'netRevenue', 'commissionRate', 'commissionAmount', 'payoutAmount', 'status', 'paymentReference', 'paidAt'].map(key => value[key] ?? null))
export const commissionSnapshot = value => JSON.stringify(['merchantId', 'paidOrderCount', 'grossRevenue', 'refundedAmount', 'netRevenue', 'commissionRate', 'commissionAmount', 'payoutAmount'].map(key => value[key] ?? null))
export const refundSnapshot = value => JSON.stringify(['id', 'orderId', 'customerId', 'amount', 'reason', 'status', 'reviewNote', 'reviewedAt', 'refundReference', 'refundedAt'].map(key => value[key] ?? null))
export const createSchema = yup.object({ merchantId: yup.string().required().test('id', 'invalid', isId), from: yup.string().required(), to: yup.string().required().test('range', 'invalid', function (value) {
  return validFinanceRange(this.parent.from, value) && value < vietnamToday()
}) })
export const actionSchema = kind => yup.object({ text: yup.string().trim().max(['pay', 'confirmRefund'].includes(kind) ? 120 : 1000).when([], { is: () => kind !== 'approve', then: schema => schema.required() }) })
export const actionAllowed = (kind, value) => kind === 'pay' ? value.status === 1 && value.payoutAmount > 0 : kind === 'confirmRefund' ? value.status === 2 : ['approve', 'reject'].includes(kind) ? value.status === 1 : false
export const statusClass = status => status === 1 ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300' : status === 3 ? 'bg-red-500/10 text-red-700 dark:text-red-300' : 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
