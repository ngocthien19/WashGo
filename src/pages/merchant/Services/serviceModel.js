import * as yup from 'yup'

export const SERVICE_TAKE = 12
const optionalAmount = () => yup.number().transform((value, original) => original === '' || original == null ? null : value).nullable().positive().test('precision', '', (value) => value == null || Number.isFinite(value) && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001)
export const proposalSchema = yup.object({
  name: yup.string().trim().required().max(200),
  description: yup.string().trim().max(2000),
  unitPrice: optionalAmount().required().max(100000000),
  pricePerKg: optionalAmount(),
  pricePerItem: optionalAmount(),
  estimatedDurationHours: yup.number().required().integer().min(1).max(8760),
  serviceType: yup.number().required().oneOf([1, 2, 3, 4, 5]),
  unit: yup.string().trim().required().max(20),
  reason: yup.string().trim().max(1000)
})
export const serviceSnapshot = (item) => JSON.stringify(['name', 'description', 'unitPrice', 'pricePerKg', 'pricePerItem', 'estimatedDurationHours', 'serviceType', 'unit', 'isActive'].map((key) => item[key]))
export function readServiceQuery(params) {
  const tab = params.get('tab') === 'proposals' ? 'proposals' : 'catalog'
  const page = Number(params.get('page'))
  return { tab, page: Number.isSafeInteger(page) && page > 0 ? page : 1, keyword: tab === 'catalog' ? (params.get('keyword') || '').trim() : '', type: (tab === 'catalog' ? ['1', '2', '3', '4', '5'] : ['1', '2']).includes(params.get('type')) ? params.get('type') : '', state: (tab === 'catalog' ? ['true', 'false'] : ['1', '2', '3']).includes(params.get('state')) ? params.get('state') : '' }
}
export const serviceFilter = (query) => query.tab === 'catalog' ? { page: query.page, take: SERVICE_TAKE, keyword: query.keyword || undefined, serviceType: query.type ? Number(query.type) : undefined, isActive: query.state ? query.state === 'true' : undefined } : { page: query.page, take: SERVICE_TAKE, status: query.state ? Number(query.state) : undefined, requestType: query.type ? Number(query.type) : undefined }
export const approvalClass = (status) => ({ 1: 'bg-amber-500/10 text-amber-700 dark:text-amber-300', 2: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', 3: 'bg-red-500/10 text-red-700 dark:text-red-300' })[status] || 'bg-muted text-muted-foreground'
