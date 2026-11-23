import { beforeEach, describe, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/http/authorizedAxios'
import { customerPaymentApi } from './customerPaymentApi'

vi.mock('~/utils/http/authorizedAxios', () => ({ default: { get: vi.fn(), post: vi.fn() } }))
const order = { id: 'order-id', orderCode: 'WG123', finalAmount: 50000, paymentStatus: 1, status: 8 }
const envelope = (data) => ({ data: { succeeded: true, data } })
beforeEach(() => vi.clearAllMocks())

describe('payment API contract', () => {
  it('submits exact whole points only for laundry, never fee payments', async () => {
    authorizedAxios.post.mockResolvedValue(envelope({ orderId: order.id }))
    await customerPaymentApi.createUrl(order.id, 2, 36000)
    expect(authorizedAxios.post).toHaveBeenLastCalledWith('/payment/create-url', { orderId: order.id, paymentMethod: 2, pointsToRedeem: 36000 })
    await customerPaymentApi.createFeeUrl(order.id, 3, 'cancellation')
    expect(authorizedAxios.post).toHaveBeenLastCalledWith('/payment/cancellation-fee/create-url', { orderId: order.id, paymentMethod: 3 })
    for (const points of [-1, .5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => customerPaymentApi.createUrl(order.id, 2, points)).toThrow()
    }
    expect(authorizedAxios.post).toHaveBeenCalledTimes(2)
  })
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

it('reads nullable scoped sessions and queues only an operation identifier for verification', async () => {
  const signal = new AbortController().signal
  authorizedAxios.get.mockResolvedValue(envelope(null))
  await expect(customerPaymentApi.getActiveSession(order.id, 1, signal)).resolves.toBeNull()
  expect(authorizedAxios.get).toHaveBeenLastCalledWith(`/payment/orders/${order.id}/active-session`, { params: { purpose: 1 }, signal })
  authorizedAxios.get.mockResolvedValue(envelope({ orderId: 'other', purpose: 1, canVerify: true, requiresReconciliation: false }))
  await expect(customerPaymentApi.getActiveSession(order.id, 1)).rejects.toThrow('customer.payment.invalidResponse')
  const operationId = '11111111-1111-4111-8111-111111111111'
  authorizedAxios.post.mockResolvedValue(envelope({ orderId: order.id, purpose: 1, operationId, state: 'Queued' }))
  await customerPaymentApi.verifySession(order.id, 1, operationId)
  expect(authorizedAxios.post).toHaveBeenLastCalledWith(`/payment/orders/${order.id}/verify-session`, { purpose: 1, operationId })
  authorizedAxios.get.mockResolvedValue(envelope({ orderId: order.id, purpose: 1, operationId, state: 'Completed' }))
  await customerPaymentApi.getVerification(operationId, signal)
  expect(authorizedAxios.get).toHaveBeenLastCalledWith(`/payment/verification-operations/${operationId}`, { signal })
})
