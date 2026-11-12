import * as yup from 'yup'
import { validDay, vietnamToday } from '~/utils/dateRange'

export const MERCHANT_TAKE = 12
export const contractDay = (value) => !value ? '' : /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) && Number.isFinite(Date.parse(value)) ? vietnamToday(new Date(value)) : value.slice(0, 10)
export const isId = (value) => /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value || '')
export const displayJsonText = (value) => {
  if (!value) {
    return ''
  }
  try {
    const parsed = JSON.parse(value); return typeof parsed === 'string' ? parsed : value
  } catch {
    return value
  }
}
const optionalNumber = () => yup.number().transform((value, original) => original === '' || original == null ? null : value).nullable()
export const safeDocumentUrl = (value) => !value || /^https?:\/\//i.test(value) && (() => {
  try {
    return Boolean(new URL(value).hostname)
  } catch {
    return false
  }
})() || /^\/uploads\/[a-z0-9/_\-.]+$/i.test(value) && !value.includes('..')
export const merchantSchema = yup.object({
  businessName: yup.string().trim().required().max(200),
  email: yup.string().trim().required().email().max(100),
  phone: yup.string().trim().required().max(20).matches(/^\+?[0-9 ()\-.]+$/).test('digits', '', (value) => /^\d{9,11}$/.test((value || '').replace(/\D/g, ''))),
  taxCode: yup.string().trim().max(20), businessLicense: yup.string().trim().max(2000),
  address: yup.string().trim().required().max(500), city: yup.string().trim().required().max(100), district: yup.string().trim().max(100),
  latitude: yup.number().required().min(-90).max(90), longitude: yup.number().required().min(-180).max(180),
  openingHours: yup.string().trim().max(1000),
  depositAmount: yup.number().required().min(0).max(100000000000).test('precision', '', (value) => value == null || Math.abs(value * 100 - Math.round(value * 100)) < 0.00001),
  commissionRate: optionalNumber().min(0).max(100).test('precision', '', (value) => value == null || Math.abs(value * 100 - Math.round(value * 100)) < 0.00001),
  serviceRadiusKm: yup.number().required().integer().min(1).max(100), maxCapacity: yup.number().required().integer().min(1).max(100000),
  contractStartDate: yup.string().test('date', '', (value) => !value || validDay(value)),
  contractEndDate: yup.string().test('date', '', (value) => !value || validDay(value)).test('range', '', function(value) {
    return !value || !this.parent.contractStartDate || value >= this.parent.contractStartDate
  }),
  slaDocUrl: yup.mixed().strip()
}).test('coordinates', 'admin.merchants.invalidLocation', (value) => value.latitude !== 0 || value.longitude !== 0)

export function merchantDefaults(value) {
  return { businessName: value?.businessName || '', email: value?.email || '', phone: value?.phone || '', taxCode: value?.taxCode || '', businessLicense: displayJsonText(value?.businessLicense), address: value?.address || '', district: value?.district || '', city: value?.city || '', latitude: value?.latitude ?? '', longitude: value?.longitude ?? '', openingHours: displayJsonText(value?.openingHours), depositAmount: value?.depositAmount ?? 1000000, commissionRate: value?.commissionRate ?? '', serviceRadiusKm: value?.serviceRadiusKm ?? 5, maxCapacity: value?.maxCapacity ?? 50, contractStartDate: contractDay(value?.contractStartDate), contractEndDate: contractDay(value?.contractEndDate) }
}
export function merchantPayload(values, original, imageUrls) {
  const body = Object.fromEntries(Object.keys(merchantDefaults()).map((key) => [key, typeof values[key] === 'string' ? values[key].trim() : values[key]]))
  for (const key of ['latitude', 'longitude', 'depositAmount', 'serviceRadiusKm', 'maxCapacity']) {
    body[key] = Number(body[key])
  }
  body.commissionRate = body.commissionRate === '' || body.commissionRate == null ? null : Number(body.commissionRate)
  for (const key of ['contractStartDate', 'contractEndDate']) {
    body[key] = body[key] ? original && contractDay(original[key]) === body[key] ? original[key] : `${body[key]}T00:00:00+07:00` : null
  }
  delete body.slaDocUrl
  return { ...body, ...(original ? { id: original.id, expectedVersion: original.version } : {}), imageUrls, serviceAreaIds: original ? null : [] }
}
export const merchantSnapshot = (value) => JSON.stringify([value.version, merchantDefaults(value), value.status, value.imageUrls || [], [...(value.serviceAreaIds || [])].sort()])
export const requestSnapshot = (value) => JSON.stringify([value.version, value.id, value.status, value.current, value.proposed, value.changedFields])
export const profileStillCurrent = (current, value) => ['businessName', 'address', 'phone', 'city', 'latitude', 'longitude', 'openingHours', 'imageUrls', ...(current.documentsSnapshotIncluded ? ['taxCode', 'businessLicenseDocumentId'] : [])].every((key) => {
  if (current[key] == null && ['city', 'latitude', 'longitude'].includes(key)) {
    return true
  }
  if (key === 'openingHours') {
    return displayJsonText(current[key]) === displayJsonText(value[key])
  }
  return JSON.stringify(current[key] ?? '') === JSON.stringify(value[key] ?? '')
})
export function readMerchantQuery(params) {
  const page = Number(params.get('page'))
  return { tab: params.get('tab') === 'requests' ? 'requests' : 'merchants', page: Number.isSafeInteger(page) && page > 0 ? page : 1, keyword: (params.get('keyword') || '').trim().slice(0, 200), state: ['1', '2', '3'].includes(params.get('state')) ? params.get('state') : '', city: (params.get('city') || '').trim().slice(0, 100), district: '', merchantId: isId(params.get('merchantId')) ? params.get('merchantId') : '' }
}
export const merchantFilter = (query) => query.tab === 'requests' ? { page: query.page, take: MERCHANT_TAKE, status: query.state ? Number(query.state) : undefined, merchantId: query.merchantId || undefined } : { page: query.page, take: MERCHANT_TAKE, keyword: query.keyword || undefined, status: query.state ? Number(query.state) : undefined, city: query.city || undefined }
export const unknownWrite = (error) => Boolean(error.uncertain || !error.response || error.response.status >= 500)
