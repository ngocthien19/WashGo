import { describe, expect, it } from 'vitest'
import { formatMapAddress } from '~/utils/format/formats'

describe('map address mapping', () => {
  it('maps house/street/ward and province without retaining a legacy county', () => {
    expect(formatMapAddress({
      housenumber: ' 123 ', street: 'Lê Lợi', district: 'Phường Bến Thành',
      county: 'Quận 1', city: 'Thành phố Hồ Chí Minh', state: 'Thành phố Hồ Chí Minh'
    })).toEqual({
      address: '123 Lê Lợi, Phường Bến Thành', district: '', city: 'Thành phố Hồ Chí Minh'
    })
  })

  it('does not restore a legacy district-level city when the province is provided separately', () => {
    expect(formatMapAddress({ street: 'Đường A', district: 'Phường B', city: 'Thành phố Thủ Đức', state: 'Thành phố Hồ Chí Minh' }))
      .toEqual({ address: 'Đường A, Phường B', district: '', city: 'Thành phố Hồ Chí Minh' })
  })

  it('leaves unavailable county/house number empty instead of inventing administrative data', () => {
    expect(formatMapAddress({ street: 'Nguyễn Huệ', district: 'Sài Gòn', city: 'Thành phố Hồ Chí Minh' }))
      .toEqual({ address: 'Nguyễn Huệ, Sài Gòn', district: '', city: 'Thành phố Hồ Chí Minh' })
  })

  it.each([
    ['Đường Hoàng Cầm', 'Linh Xuân'],
    ['Công trường Quách Thị Trang', 'Bến Thành'],
    ['Cộng Hòa', 'Bảy Hiền']
  ])('keeps the ward in the address when Photon omits the county at %s', (street, ward) => {
    // Public Photon responses checked on 2026-11-04; district here is a ward.
    expect(formatMapAddress({ street, district: ward, city: 'Thành phố Hồ Chí Minh', countrycode: 'VN' }))
      .toEqual({ address: `${street}, ${ward}`, district: '', city: 'Thành phố Hồ Chí Minh' })
  })

  it('keeps the ward in the address and omits the old county', () => {
    expect(formatMapAddress({ street: 'Đường A', county: 'Quận B', district: 'Phường D', state: 'Tỉnh C' }))
      .toEqual({ address: 'Đường A, Phường D', district: '', city: 'Tỉnh C' })
  })

  it('does not treat an administrative area name as a detailed street address', () => {
    expect(formatMapAddress({ type: 'city', name: 'Hà Nội', city: 'Hà Nội' }))
      .toEqual({ address: '', district: '', city: 'Hà Nội' })
    expect(formatMapAddress()).toEqual({ address: '', district: '', city: '' })
  })
})
