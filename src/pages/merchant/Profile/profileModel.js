import { scheduleSchema } from '~/components/OpeningSchedule/scheduleModel'
import * as yup from 'yup'

export const displayOpeningHours = (value) => {
  if (!value) {
    return ''
  }
  try {
    const parsed = JSON.parse(value); return typeof parsed === 'string' ? parsed : value
  } catch {
    return value
  }
}

// joinedAt is a dedicated membership date; contractStartDate is not a substitute.
export const formatJoinedDate = (value, language) => {
  if (!value) {
    return ''
  }
  const date = new Date(typeof value === 'number' ? value * 1000 : value)
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'vi-VN', { dateStyle: 'medium' }).format(date)
}

export const merchantProfileSchema = (initialTaxCode = '') => yup.object({
  businessName: yup.string().trim().required('merchant.shop.invalidFields').max(200, 'merchant.shop.invalidFields'),
  address: yup.string().trim().required('merchant.shop.invalidFields').max(500, 'merchant.shop.invalidFields'),
  city: yup.string().trim().required('merchant.shop.cityRequired').max(100, 'merchant.shop.cityRequired'),
  phone: yup.string().trim().required('merchant.shop.invalidFields').matches(/^0[0-9]{9}$/, 'merchant.shop.invalidFields'),
  openingHours: yup.string().trim().max(1000, 'merchant.shop.invalidFields'), openingSchedule: scheduleSchema,
  taxCode: yup.string().trim().test('tax-code', 'merchant.backendSync.invalidTaxCode', (value) => !value || value === initialTaxCode || /^\d{10}(-\d{3})?$/.test(value))
})

export const profileSnapshot = (shop) => JSON.stringify(['id', 'version', 'status', 'businessName', 'address', 'city', 'latitude', 'longitude', 'phone', 'openingHours', 'openingSchedule', 'imageUrls', 'taxCode', 'businessLicense', 'businessLicenseDocumentId', 'contractDocumentId', 'slaDocumentId', 'pendingRequest'].map((key) => shop[key] ?? null))
