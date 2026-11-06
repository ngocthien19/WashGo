import { beforeEach, describe, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/authorizedAxios'
import { customerOrderApi } from './customerOrderApi'

vi.mock('~/utils/authorizedAxios', () => ({ default: { get: vi.fn(), post: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())
const envelope = (data) => ({ data: { succeeded: true, data } })

describe('customer orders API', () => {
  it('posts to the scoped mine endpoint and keeps server paging metadata', async () => {
    const result = { succeeded: true, list: [], total: 0, currentPage: 1, totalPages: 0 }
    authorizedAxios.post.mockResolvedValue({ data: result })
    const signal = new AbortController().signal
    await expect(customerOrderApi.list({ page: 1, take: 6 }, signal)).resolves.toBe(result)
    expect(authorizedAxios.post).toHaveBeenCalledWith('/wash-order/mine', { page: 1, take: 6 }, { signal })
    authorizedAxios.post.mockResolvedValue({ data: { succeeded: false, list: [] } })
    await expect(customerOrderApi.list({})).rejects.toThrow()
  })
  it('rejects malformed cancellation quotes instead of presenting invented fees', async () => {
    const quote = { orderId: 'order-id', canCancel: true, feeAmount: 0, refundAmount: 0, feeOutstanding: 0 }
    authorizedAxios.get.mockResolvedValue(envelope(quote))
    await expect(customerOrderApi.cancellationQuote('order-id')).resolves.toEqual(quote)
    for (const patch of [{ orderId: 'other' }, { feeAmount: -1 }, { feeOutstanding: null }, { canCancel: 'true' }]) {
      authorizedAxios.get.mockResolvedValue(envelope({ ...quote, ...patch }))
      await expect(customerOrderApi.cancellationQuote('order-id')).rejects.toThrow('customer.orders.invalidResponse')
    }
  })
  it('sends only the cancellation reason and checks the final state, without retrying POST', async () => {
    authorizedAxios.post.mockResolvedValue(envelope({ id: 'order-id', status: 99 }))
    await customerOrderApi.cancel('order-id', 'Changed plans')
    expect(authorizedAxios.post).toHaveBeenCalledExactlyOnceWith('/wash-order/order-id/cancel', { reason: 'Changed plans' })
    authorizedAxios.post.mockResolvedValue(envelope({ id: 'other', status: 1 }))
    await expect(customerOrderApi.cancel('order-id', 'Changed plans')).rejects.toThrow('customer.orders.cancel.unknownOutcome')
  })
})
