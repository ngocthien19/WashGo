import { readFile } from 'node:fs/promises'
import { URL as NodeURL } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { containsMapPoint } from '~/utils/formats'

const { get } = vi.hoisted(() => ({ get: vi.fn() }))
vi.mock('axios', async (original) => {
  const actual = await original()
  return { ...actual, default: { ...actual.default, create: (options) => Object.assign(actual.default.create(options), { get }) } }
})

beforeEach(() => {
  vi.resetModules()
  get.mockReset().mockImplementation(async () => ({
    data: JSON.parse(await readFile(new NodeURL('../../../public/data/customer/provinces/boundaries.json', import.meta.url), 'utf8'))
  }))
})

describe('post-merger province boundaries', () => {
  it.each([
    [10.8815, 106.7695, 'Thành phố Hồ Chí Minh'],
    [10.91, 106.77, 'Thành phố Hồ Chí Minh'],
    [10.5, 107.17, 'Thành phố Hồ Chí Minh'],
    [15.573, 108.474, 'Thành phố Đà Nẵng'],
    [10.535, 106.413, 'Tỉnh Tây Ninh']
  ])('resolves the merged province at (%s, %s) using real retained geometry', async (latitude, longitude, city) => {
    const { customerProvinceApi } = await import('./customerProvinceApi')
    await expect(customerProvinceApi.resolve({ latitude, longitude })).resolves.toBe(city)
    expect(get.mock.calls[0][0]).toBe('/data/customer/provinces/boundaries.json')
  })

  it('does not guess a province outside the country', async () => {
    const { customerProvinceApi } = await import('./customerProvinceApi')
    await expect(customerProvinceApi.resolve({ latitude: 0, longitude: 0 })).resolves.toBeNull()
  })

  it('can retry a download error and reuse successful data, while respecting cancellation', async () => {
    const { customerProvinceApi } = await import('./customerProvinceApi')
    get.mockRejectedValueOnce(new Error('offline'))
    const point = { latitude: 10.7721, longitude: 106.6983 }
    await expect(customerProvinceApi.resolve(point)).rejects.toThrow('offline')
    await expect(customerProvinceApi.resolve(point)).resolves.toBe('Thành phố Hồ Chí Minh')
    await customerProvinceApi.resolve(point)
    expect(get).toHaveBeenCalledTimes(2)
    const controller = new AbortController()
    controller.abort()
    await expect(customerProvinceApi.resolve(point, controller.signal)).rejects.toThrow()
  })

  it('supports polygon holes, edges and separate islands', () => {
    const outer = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
    const hole = [[3, 3], [7, 3], [7, 7], [3, 7], [3, 3]]
    const geometry = { type: 'Polygon', coordinates: [outer, hole] }
    expect(containsMapPoint(geometry, { latitude: 1, longitude: 1 })).toBe(true)
    expect(containsMapPoint(geometry, { latitude: 5, longitude: 5 })).toBe(false)
    expect(containsMapPoint(geometry, { latitude: 0, longitude: 5 })).toBe(true)
    expect(containsMapPoint(geometry, { latitude: 11, longitude: 5 })).toBe(false)
    expect(containsMapPoint({ type: 'MultiPolygon', coordinates: [[outer]] }, { latitude: 2, longitude: 2 })).toBe(true)
    expect(containsMapPoint(geometry, { latitude: NaN, longitude: 2 })).toBe(false)
  })
})
