import * as yup from 'yup'
import { AUTH_LIMITS, IMAGE_UPLOAD, PROFILE_LIMITS } from '~/utils/constants'
import { hasControlCharacters } from '~/utils/formats'

export const profileSchema = yup.object({
  fullName: yup.string().trim()
    .required('auth.pleaseEnterYourFullName')
    .min(AUTH_LIMITS.NAME_MIN, 'auth.fullNameMustHaveAtLeastCharacters')
    .max(AUTH_LIMITS.NAME_MAX, 'auth.fullNameMustBeAtMostCharacters')
    .test('no-control', 'customer.profile.invalidName', (value) => !value || !hasControlCharacters(value)),
  phone: yup.string().trim().required('auth.pleaseEnterYourPhoneNumber')
    .matches(/^0[0-9]{9}$/, { message: 'customer.profile.phoneFormat', excludeEmptyString: true }),
  address: yup.string().trim().required('customer.profile.addressRequired')
    .max(PROFILE_LIMITS.ADDRESS_MAX, 'customer.profile.addressTooLong'),
  district: yup.string().trim().max(PROFILE_LIMITS.AREA_MAX, 'customer.profile.areaTooLong'),
  city: yup.string().trim().required('customer.profile.cityRequired')
    .max(PROFILE_LIMITS.AREA_MAX, 'customer.profile.areaTooLong')
})

export const getProfileValues = (profile) => ({
  fullName: profile.fullName || '', phone: profile.phone || '',
  address: profile.address || '', district: profile.district || '', city: profile.city || ''
})

export const validateAvatarFile = (file) => {
  if (!IMAGE_UPLOAD.MIME_TYPES.includes(file.type)) {
    return 'customer.profile.imageTypeError'
  }
  if (!file.size || file.size > IMAGE_UPLOAD.MAX_BYTES) {
    return 'customer.profile.imageSizeError'
  }
  return ''
}
