import { expect, it } from 'vitest'
import { getLockerDirectionsLink, getDistanceKm } from '~/utils/format/formats'

it('opens directions to the correct coordinates and includes a valid requested origin', () => {
  const url = new URL(getLockerDirectionsLink({ latitude: 10.8, longitude: 106.7 }, { latitude: 0, longitude: 0 }))
  expect(url.pathname).toBe('/maps/dir/')
  expect(url.searchParams.get('destination')).toBe('10.8,106.7')
  expect(url.searchParams.get('origin')).toBe('0,0')
  expect(url.searchParams.get('travelmode')).toBe('driving')
})
it('does not invent an origin or point and supports address-only destinations', () => {
  const url = new URL(getLockerDirectionsLink({ address: '123 Test Street', city: 'Test City' }))
  expect(url.searchParams.get('destination')).toBe('123 Test Street, Test City')
  expect(url.searchParams.has('origin')).toBe(false)
  expect(getLockerDirectionsLink({ name: 'Missing location' })).toBeNull()
})
it('reports straight-line kilometers only when both locations are valid', () => {
  expect(getDistanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBeCloseTo(111.195, 2)
  expect(getDistanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 })).toBe(0)
  expect(getDistanceKm(null, { latitude: 0, longitude: 1 })).toBeNull()
})
