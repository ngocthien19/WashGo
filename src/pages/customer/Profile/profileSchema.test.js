import { describe, expect, it } from 'vitest'
import { IMAGE_UPLOAD, PROFILE_LIMITS } from '~/utils/config/constants'
import { getProfileValues, profileSchema, validateAvatarFile } from './profileSchema'

const valid = { fullName: 'Alex Nguyen', phone: '0901234567', address: '123 Le Loi', district: '', city: 'Ho Chi Minh City' }

describe('customer profile validation', () => {
  it('trims required fields and allows an empty legacy district', async () => {
    const result = await profileSchema.validate({ ...valid, fullName: ' Alex Nguyen ', address: ' 123 Le Loi ' })
    expect(result).toEqual(valid)
  })

  it.each([
    ['fullName', 'A'], ['fullName', 'Alex\nNguyen'], ['address', '   '],
    ['address', 'a'.repeat(PROFILE_LIMITS.ADDRESS_MAX + 1)],
    ['city', 'a'.repeat(PROFILE_LIMITS.AREA_MAX + 1)],
    ['phone', '0123.456.789'], ['phone', '123'], ['phone', '090abcdefg'],
    ['phone', ''], ['phone', '   '], ['phone', '1901234567'], ['city', ''], ['city', '   '],
    ['phone', '+84 (90) 123-4567'], ['phone', '09012345678'], ['phone', 'abc0901234567']
  ])('rejects invalid %s: %s', async (field, value) => {
    await expect(profileSchema.validate({ ...valid, [field]: value })).rejects.toThrow()
  })

  it('trims the ten-digit local phone without stripping arbitrary characters', async () => {
    await expect(profileSchema.validate({ ...valid, phone: ' 0901234567 ' })).resolves.toMatchObject({ phone: '0901234567' })
  })

  it('normalizes nullable API fields for a controlled form', () => {
    expect(getProfileValues({ fullName: 'Alex', phone: null, address: null })).toEqual({
      fullName: 'Alex', phone: '', address: '', district: '', city: ''
    })
  })
})

describe('profile photo validation', () => {
  it.each(IMAGE_UPLOAD.MIME_TYPES)('accepts %s up to the size limit', (type) => {
    expect(validateAvatarFile({ type, size: IMAGE_UPLOAD.MAX_BYTES })).toBe('')
  })

  it('rejects empty, oversized and unsupported files before upload', () => {
    expect(validateAvatarFile({ type: 'image/svg+xml', size: 20 })).toBe('customer.profile.imageTypeError')
    expect(validateAvatarFile({ type: 'image/png', size: 0 })).toBe('customer.profile.imageSizeError')
    expect(validateAvatarFile({ type: 'image/png', size: IMAGE_UPLOAD.MAX_BYTES + 1 })).toBe('customer.profile.imageSizeError')
  })
})
