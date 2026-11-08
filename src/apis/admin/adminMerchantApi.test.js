import { expect, it, vi } from 'vitest'
import { adminMerchantApi } from './adminMerchantApi'
import authorizedAxios from '~/utils/authorizedAxios'
import { merchantDefaults } from '~/pages/admin/Merchants/merchantModel'

vi.mock('~/utils/authorizedAxios', () => ({ default: { post: vi.fn() } }))

const merchant = (city) => ({ ...merchantDefaults(), id: '10000000-0000-4000-8000-000000000001', city, latitude: 10.77, longitude: 106.7, commissionRate: 20, status: 1, totalRevenue: 0, totalOrders: 0, unfinishedOrders: 0, imageUrls: [], serviceAreaIds: [] })
it('collects exact distinct city values across all pages rather than visible table results', async () => {
  authorizedAxios.post.mockReset()
  authorizedAxios.post.mockResolvedValueOnce({ data: { succeeded: true, list: Array.from({ length: 100 }, () => merchant('HCM')), total: 101, currentPage: 1 } })
    .mockResolvedValueOnce({ data: { succeeded: true, list: [merchant('Da Nang')], total: 101, currentPage: 2 } })
  const controller = new AbortController()
  expect(await adminMerchantApi.cities(controller.signal)).toEqual(['Da Nang', 'HCM'])
  expect(authorizedAxios.post).toHaveBeenNthCalledWith(2, '/merchant/filter', { page: 2, take: 100 }, { signal: controller.signal })
})
it('reports city loading failures without presenting a partial list', async () => {
  authorizedAxios.post.mockReset()
  authorizedAxios.post.mockResolvedValueOnce({ data: { succeeded: true, list: Array.from({ length: 100 }, () => merchant('HCM')), total: 101, currentPage: 1 } })
    .mockRejectedValueOnce(new Error('Failed to load the next page'))
  await expect(adminMerchantApi.cities()).rejects.toThrow('Failed to load the next page')
})
