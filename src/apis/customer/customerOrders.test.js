import { beforeEach, describe, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/authorizedAxios'
import { customerOrderApi } from './customerOrderApi'

vi.mock('~/utils/authorizedAxios', () => ({ default: { get: vi.fn(), post: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())
const envelope = (data) => ({ data: { succeeded: true, data } })

describe('customer orders API', () => {
  it('removes partner identity from customer list and detail while preserving order and paging data', async () => {
    const order = { id: 'order-id', orderCode: 'WG-123', status: 12, merchantId: 'private', merchantName: 'PRIVATE', merchantEmail: 'private@example.test', shipperName: 'PRIVATE', timeline: [{ actorRole: 'Merchant', actorId: 'private', actorName: 'PRIVATE', status: 4 }] }
    authorizedAxios.get.mockResolvedValue(envelope(order))
    const detail = await customerOrderApi.get('order-id')
    expect(detail).not.toHaveProperty('merchantEmail')
    expect(detail).not.toHaveProperty('merchantId')
    expect(detail).not.toHaveProperty('shipperName')
    expect(detail.timeline[0]).toMatchObject({ actorId: null, actorName: 'WashGo', status: 4 })
    authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, list: [order], total: 7, currentPage: 2, totalPages: 7 } })
    const page = await customerOrderApi.list({ page: 2, take: 1 })
    expect(page).toMatchObject({ total: 7, currentPage: 2, totalPages: 7 })
    expect(page.list[0]).not.toHaveProperty('merchantName')
  })
  it('posts to the scoped mine endpoint and keeps server paging metadata', async () => {
    const result = { succeeded: true, list: [], total: 0, currentPage: 1, totalPages: 0 }
    authorizedAxios.post.mockResolvedValue({ data: result })
    const signal = new AbortController().signal
    await expect(customerOrderApi.list({ page: 1, take: 6 }, signal)).resolves.toEqual(result)
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
