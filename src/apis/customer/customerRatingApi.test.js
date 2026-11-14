import { beforeEach, describe, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/http/authorizedAxios'
import { customerRatingApi } from './customerRatingApi'

vi.mock('~/utils/http/authorizedAxios', () => ({ default: { get: vi.fn(), post: vi.fn() } }))
beforeEach(() => vi.resetAllMocks())

describe('customer rating API', () => {
  it('accepts an explicit null for an owned order that has not been rated', async () => {
    authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: null } })
    await expect(customerRatingApi.getByOrder('order-1')).resolves.toBeNull()
    expect(authorizedAxios.get).toHaveBeenCalledWith('/rating/order/order-1', { signal: undefined })
  })
  it('posts only rating fields and rejects a response for another order', async () => {
    const body = { orderId: 'order-1', overallStars: 5, comment: 'Good', imageUrls: [] }
    authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: { id: 'rating', orderId: 'other', overallStars: 5 } } })
    await expect(customerRatingApi.create({ ...body, customerId: 'forged', isHidden: true })).rejects.toThrow('customer.rating.invalidResponse')
    const payload = authorizedAxios.post.mock.calls[0][1]
    expect(payload).not.toHaveProperty('customerId')
    expect(payload).not.toHaveProperty('isHidden')
    expect(authorizedAxios.post).toHaveBeenCalledTimes(1)
  })
  it('does not treat a failed lookup as an unrated order', async () => {
    authorizedAxios.get.mockResolvedValue({ data: { succeeded: false, data: null } })
    await expect(customerRatingApi.getByOrder('order-1')).rejects.toThrow('customer.rating.invalidResponse')
  })
})
