import { beforeEach, expect, it, vi } from 'vitest'
import { adminMerchantApi } from './adminMerchantApi'
import authorizedAxios from '~/utils/http/authorizedAxios'
vi.mock('~/utils/http/authorizedAxios', () => ({ default: { get: vi.fn(), post: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())
it('loads city options from the scoped distinct endpoint without reading Merchant profiles', async () => {
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: ['Da Nang', 'HCM'] } })
  const signal = new AbortController().signal
  expect(await adminMerchantApi.cities(signal)).toEqual(['Da Nang', 'HCM'])
  expect(authorizedAxios.get).toHaveBeenCalledWith('/merchant/cities', { signal })
  expect(authorizedAxios.post).not.toHaveBeenCalled()
})
it('does not present an invalid city response as valid options', async () => {
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: [null] } })
  await expect(adminMerchantApi.cities()).rejects.toThrow('admin.invalidResponse')
})
