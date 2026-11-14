import { beforeEach, describe, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/http/authorizedAxios'
import { customerOrderApi } from './customerOrderApi'

vi.mock('~/utils/http/authorizedAxios', () => ({ default: { post: vi.fn() } }))
beforeEach(() => vi.resetAllMocks())

describe('customer order API', () => {
  it('fetches an abortable server quote from the customer voucher endpoint', async () => {
    const quote = { totalAmount: 30000, discountAmount: 5000, finalAmount: 25000 }
    const body = { lockerId: 'locker', items: [{ serviceId: 'wash', quantity: 1 }], promotionCode: 'SAVE' }
    const signal = new AbortController().signal
    authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: quote } })
    await expect(customerOrderApi.quote(body, signal)).resolves.toEqual(quote)
    expect(authorizedAxios.post).toHaveBeenCalledWith('/wash-order/apply-voucher', body, { signal })
  })

  it('rejects incomplete, failed or inconsistent quotes', async () => {
    for (const data of [
      { succeeded: false }, { succeeded: true },
      { succeeded: true, data: { totalAmount: 30, discountAmount: 0, finalAmount: null } },
      { succeeded: true, data: { totalAmount: 30, discountAmount: 50, finalAmount: 0 } },
      { succeeded: true, data: { totalAmount: 30, discountAmount: 0, finalAmount: 20 } }
    ]) {
      authorizedAxios.post.mockResolvedValueOnce({ data })
      await expect(customerOrderApi.quote({})).rejects.toThrow('customer.order.invalidResponse')
    }
  })

  it('sends one creation request and propagates transport failure without retry', async () => {
    const failure = new Error('offline')
    const body = { lockerId: 'locker', boxId: 'box', paymentMethod: 1, items: [{ serviceId: 'wash', quantity: 1 }] }
    authorizedAxios.post.mockRejectedValue(failure)
    await expect(customerOrderApi.create(body)).rejects.toBe(failure)
    expect(authorizedAxios.post).toHaveBeenCalledTimes(1)
    expect(authorizedAxios.post).toHaveBeenCalledWith('/wash-order', body)
  })
})
