import { beforeEach, describe, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/http/authorizedAxios'
import { customerPaymentApi } from './customerPaymentApi'

vi.mock('~/utils/http/authorizedAxios', () => ({ default: { get: vi.fn(), post: vi.fn() } }))
const order = { id: 'order-id', orderCode: 'WG123', finalAmount: 50000, paymentStatus: 1, status: 8 }
const envelope = (data) => ({ data: { succeeded: true, data } })
beforeEach(() => vi.clearAllMocks())

describe('payment API contract', () => {
  it('sends identifiers without client prices or signatures', async () => {
    authorizedAxios.post.mockResolvedValue(envelope({ orderId: order.id, paymentUrl: 'https://test-payment.momo.vn/pay' }))
    await customerPaymentApi.createUrl(order.id, 3)
    expect(authorizedAxios.post).toHaveBeenCalledExactlyOnceWith('/payment/create-url', { orderId: order.id, paymentMethod: 3 })
  })

  it('finds the exact customer order then fetches fresh scoped detail', async () => {
    const controller = new AbortController()
    authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, list: [order, { ...order, id: 'other', orderCode: 'WG1234' }] } })
    authorizedAxios.get.mockResolvedValue(envelope({ ...order, paymentStatus: 2 }))
    expect(await customerPaymentApi.findReturnedOrder('WG123', controller.signal)).toMatchObject({ paymentStatus: 2 })
    expect(authorizedAxios.post).toHaveBeenCalledWith('/wash-order/mine', { keyword: 'WG123', page: 1, take: 20 }, { signal: controller.signal })
    expect(authorizedAxios.get).toHaveBeenCalledWith('/wash-order/order-id', { signal: controller.signal })
  })

  it('rejects missing, duplicate, failed and malformed results', async () => {
    await expect(customerPaymentApi.findReturnedOrder('')).rejects.toThrow('customer.payment.missingOrder')
    for (const list of [[], [order, order]]) {
      authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, list } })
      await expect(customerPaymentApi.findReturnedOrder('WG123')).rejects.toThrow('customer.payment.missingOrder')
    }
    authorizedAxios.get.mockResolvedValue(envelope({ ...order, finalAmount: '50000' }))
    await expect(customerPaymentApi.getOrder(order.id)).rejects.toThrow('customer.payment.invalidResponse')
    authorizedAxios.post.mockResolvedValue({ data: { succeeded: false, message: 'Denied' } })
    await expect(customerPaymentApi.createUrl(order.id, 2)).rejects.toThrow('Denied')
  })
})
