import * as yup from 'yup'
import { isId } from '~/pages/admin/Merchants/merchantModel'
import { dateRangeFilter, validRange } from '~/utils/format/dateRange'
import { INCIDENT_TYPES, INCIDENT_SEVERITIES } from '~/utils/config/constants'
export { unknownWrite } from '~/pages/admin/Services/serviceModel'
export const TAKE = 12
export const statuses = [1, 2, 3, 4]
export const readQuery = params => {
  const from = params.get('from') || '', to = params.get('to') || ''
  const choice = (key, values) => values.map(String).includes(params.get(key)) ? params.get(key) : ''
  return { compensationStatus: choice('compensationStatus', [0, 1, 2]), orderId: isId(params.get('orderId')) ? params.get('orderId') : '', customerId: isId(params.get('customerId')) ? params.get('customerId') : '', keyword: (params.get('keyword') || '').trim().slice(0, 200), status: choice('status', statuses), type: choice('type', INCIDENT_TYPES), severity: choice('severity', INCIDENT_SEVERITIES), merchantId: isId(params.get('merchantId')) ? params.get('merchantId') : '', page: /^\d{1,6}$/.test(params.get('page') || '') ? Math.max(1, Number(params.get('page'))) : 1, from: validRange(from, to) ? from : '', to: validRange(from, to) ? to : '' }
}
export const writeQuery = query => Object.fromEntries(Object.entries(query).filter(([key, value]) => value !== '' && !(key === 'page' && value === 1)))
export const filter = query => ({ compensationStatus: query.compensationStatus === '' ? undefined : Number(query.compensationStatus), orderId: query.orderId || undefined, customerId: query.customerId || undefined, keyword: query.keyword || undefined, ...Object.fromEntries(['status', 'severity', 'type'].map(key => [key, query[key] ? Number(query[key]) : undefined])), merchantId: query.merchantId || undefined, page: query.page, take: TAKE, ...dateRangeFilter(query) })
export const snapshot = value => JSON.stringify(['version', 'id', 'orderId', 'customerId', 'merchantId', 'type', 'severity', 'description', 'imageUrls', 'videoUrls', 'status', 'resolutionNote', 'responsibleParty', 'compensationLevel', 'itemValue', 'compensationAmount', 'compensationStatus', 'compensationReference', 'compensationPaidAt', 'reviewedAt', 'customerUpdatedAt', 'withdrawnAt', 'withdrawReason'].map(key => value[key] ?? null))
export const canAct = (value, action) => (value[{ resolve: 'canResolve', reject: 'canReject', pay: 'canConfirmCompensation' }[action]] !== false) && (action === 'pay' ? value.status === 2 && value.compensationStatus === 1 && value.compensationAmount > 0 : value.status === 1)
export const threadSnapshot = messages => JSON.stringify(messages.map(item => [item.id, item.content, item.imageUrls || [], item.videoUrls || []]))
export const actionSchema = action => yup.object({
  note: yup.string().trim().max(2000).when([], { is: () => action !== 'pay', then: schema => schema.required() }),
  reference: yup.string().trim().max(120).when([], { is: () => action === 'pay', then: schema => schema.required() }),
  responsibleParty: yup.string().oneOf(['', '1', '2', '3', '4']),
  compensationLevel: yup.number().oneOf([0, 1, 2, 3, 4]).required(),
  itemValue: yup.number().transform((value, original) => original === '' || original == null ? 0 : value).when('compensationLevel', { is: level => action === 'resolve' && level > 0, then: schema => schema.moreThan(0).max(100000000).test('precision', 'invalid', value => Number.isFinite(value) && Math.abs(value * 100 - Math.round(value * 100)) < 0.001) })
})
export const messageSchema = yup.object({ content: yup.string().trim().required().max(2000) })
export const severityClass = value => ({ 1: 'bg-blue-500/10 text-blue-700 dark:text-blue-300', 2: 'bg-amber-500/10 text-amber-700 dark:text-amber-300', 3: 'bg-red-500/10 text-red-700 dark:text-red-300' })[value]
