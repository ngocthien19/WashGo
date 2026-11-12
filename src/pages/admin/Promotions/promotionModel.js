import * as yup from 'yup'
import { dateRangeFilter, validRange, validDay } from '~/utils/dateRange'
import { formatDateTime } from '~/utils/formats'

export const TAKE = 12
export const formatPromotionTime = value => formatDateTime(value, 'Asia/Ho_Chi_Minh')
export const fields = ['code', 'description', 'discountType', 'discountValue', 'minOrderAmount', 'maxDiscountAmount', 'startAt', 'endAt', 'usageLimit', 'usageLimitPerCustomer', 'isActive']
export const snapshot = value => JSON.stringify(['canChangeCode', 'version', 'id', ...fields, 'usedCount'].map(key => value[key] ?? null))
export const unknownWrite = error => Boolean(error.uncertain || !error.response || error.response.status >= 500 || error.response.status === 408)
export const localTime = value => value && Number.isFinite(Date.parse(value)) ? new Date(Date.parse(value) + 7 * 3600000).toISOString().slice(0, 16) : ''
const utcTime = value => new Date(`${value}:00+07:00`).toISOString()
const nullable = schema => schema.transform((value, original) => original === '' || original == null ? null : value).nullable()
const money = () => yup.number().typeError('invalid').min(0).max(Math.floor(Number.MAX_SAFE_INTEGER / 100)).test('precision', 'invalid', value => value == null || Math.abs(value * 100 - Math.round(value * 100)) < 0.01)
export const promotionSchema = yup.object({
  code: yup.string().trim().uppercase().matches(/^[A-Z0-9_-]{3,50}$/).required(),
  description: yup.string().max(500),
  discountType: yup.number().oneOf([1, 2]).required(),
  discountValue: money().moreThan(0).required().when('discountType', { is: 1, then: schema => schema.max(100) }),
  minOrderAmount: money().required(),
  maxDiscountAmount: nullable(money().moreThan(0)),
  startAt: yup.string().required().test('date', 'invalid', value => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value || '') && validDay(value.slice(0, 10)) && Number.isFinite(Date.parse(`${value}:00+07:00`))),
  endAt: yup.string().required().test('range', 'invalid', function (value) {
    return validDay((value || '').slice(0, 10)) && Number.isFinite(Date.parse(`${value}:00+07:00`)) && value > this.parent.startAt
  }),
  usageLimit: nullable(yup.number().integer().min(1).max(2147483647)),
  usageLimitPerCustomer: nullable(yup.number().integer().min(1).max(2147483647)).test('limit', 'invalid', function (value) {
    return value == null || this.parent.usageLimit == null || value <= this.parent.usageLimit
  }),
  isActive: yup.boolean().required()
})
export const defaults = value => ({ code: value?.code || '', description: value?.description || '', discountType: value?.discountType || 1, discountValue: value?.discountValue ?? '', minOrderAmount: value?.minOrderAmount ?? 0, maxDiscountAmount: value?.maxDiscountAmount ?? '', startAt: localTime(value?.startAt), endAt: localTime(value?.endAt), usageLimit: value?.usageLimit ?? '', usageLimitPerCustomer: value?.usageLimitPerCustomer ?? '', isActive: value?.isActive ?? true })
export const payload = (values, current) => ({
  ...(current ? { id: current.id, expectedVersion: current.version } : {}), code: values.code.trim().toUpperCase(), description: values.description?.trim() || null,
  discountType: Number(values.discountType), discountValue: Number(values.discountValue), minOrderAmount: Number(values.minOrderAmount),
  ...Object.fromEntries(['maxDiscountAmount', 'usageLimit', 'usageLimitPerCustomer'].map(key => [key, values[key] === '' || values[key] == null ? null : Number(values[key])])),
  ...Object.fromEntries(['startAt', 'endAt'].map(key => [key, current && values[key] === localTime(current[key]) ? current[key] : utcTime(values[key])])),
  isActive: current ? current.isActive : values.isActive
})
export const readQuery = params => {
  const from = params.get('from') || '', to = params.get('to') || ''
  return { keyword: (params.get('keyword') || '').slice(0, 500), status: ['0', '1', '2', '3', '4'].includes(params.get('status')) ? params.get('status') : '', type: ['1', '2'].includes(params.get('type')) ? params.get('type') : '', page: /^\d{1,6}$/.test(params.get('page') || '') ? Math.max(1, Number(params.get('page'))) : 1, from: validRange(from, to) ? from : '', to: validRange(from, to) ? to : '' }
}
export const filter = query => ({ keyword: query.keyword || undefined, status: query.status === '' ? undefined : Number(query.status), discountType: query.type ? Number(query.type) : undefined, page: query.page, take: TAKE, ...dateRangeFilter(query) })
export const writeQuery = query => Object.fromEntries(Object.entries(query).filter(([key, value]) => value !== '' && !(key === 'page' && value === 1)))
export const statusClass = status => ['bg-slate-500/10 text-slate-700 dark:text-slate-300', 'bg-blue-500/10 text-blue-700 dark:text-blue-300', 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', 'bg-red-500/10 text-red-700 dark:text-red-300', 'bg-amber-500/10 text-amber-700 dark:text-amber-300'][status]
