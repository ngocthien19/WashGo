import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/http/authorizedAxios'
import { merchantProfileApi } from './merchantProfileApi'

vi.mock('~/utils/http/authorizedAxios', () => ({ default: { get: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())
const request = { id: 'request-1', merchantId: 'merchant-1', status: 1, current: { businessName: 'Before' }, proposed: { businessName: 'After' }, changedFields: ['businessName'] }

it('reads the owned request through the Merchant-authorized endpoint', async () => {
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: request } })
  const signal = new AbortController().signal
  await expect(merchantProfileApi.request(request.id, request.merchantId, signal)).resolves.toEqual(request)
  expect(authorizedAxios.get).toHaveBeenCalledWith('/merchant-profile-request/request-1', { signal })
})
it('rejects mismatched request identity, ownership and malformed comparison fields', async () => {
  for (const patch of [{ id: 'other-request' }, { merchantId: 'other-merchant' }, { changedFields: [123] }, { current: null }]) {
    authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: { ...request, ...patch } } })
    await expect(merchantProfileApi.request(request.id, request.merchantId)).rejects.toThrow('merchant.invalidResponse')
  }
})
