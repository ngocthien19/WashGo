import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/http/authorizedAxios'
import { orderManagementApi as api } from './orderManagementApi'
vi.mock('~/utils/http/authorizedAxios', () => ({ default: { post: vi.fn(), put: vi.fn(), get: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())
afterEach(() => api.clearActualsSession())
const guard = { expectedRevision: 7, expectedStatus: 3, operationId: '11111111-1111-4111-8111-111111111111' }
const body = { actualWeightKg: 5, items: [{ orderItemId: 'item', actualQuantity: 3 }], note: ' Extra item ', expectedFinalAmount: 150000 }
it('posts only actual quantities to preview and rejects a mismatched quote', async () => {
  const quote = { revision: 7, status: 3, previousFinalAmount: 100000, totalAmount: 150000, weightSurchargeAmount: 0, discountAmount: 0, finalAmount: 150000, promotionRemoved: false,
    items: [{ orderItemId: 'item', quantity: 2, actualQuantity: 3, unit: 'item', unitPrice: 50000, amount: 150000 }] }
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: quote } })
  expect(await api.previewActuals('order', { ...body, merchantId: 'other' })).toEqual(quote)
  expect(authorizedAxios.post.mock.calls[0][1]).toEqual({ actualWeightKg: 5, items: body.items, note: 'Extra item' })
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: { ...quote, items: [{ ...quote.items[0], actualQuantity: 99 }] } } })
  await expect(api.previewActuals('order', body)).rejects.toThrow()
})
it('keeps the original operation after timeout, blocks a new intent and checks the recorded result', async () => {
  authorizedAxios.put.mockRejectedValue({ response: { status: 408 } })
  await expect(api.confirmActuals('order', body, guard)).rejects.toMatchObject({ response: { status: 408 } })
  expect(api.pendingActuals('order').guard).toEqual(guard)
  await expect(api.confirmActuals('order', { ...body, note: 'Changed' }, guard)).rejects.toThrow('actuals.uncertain')
  expect(authorizedAxios.put).toHaveBeenCalledTimes(1)
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: { orderId: 'order', operationId: guard.operationId, operation: 'ConfirmOrderActuals', resultRevision: 8 } } })
  await api.resolveActuals('order')
  expect(authorizedAxios.get).toHaveBeenCalledWith(`/wash-order/order/operations/${guard.operationId}`)
  expect(api.pendingActuals('order')).toBeUndefined()
})
it('retries the identical command and clears memory on a confirmed response or definite conflict', async () => {
  authorizedAxios.put.mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce({ data: { succeeded: true, data: {
    id: 'order', orderCode: 'WG1', actualsConfirmedAt: '2026-11-26T01:00:00Z', items: [{ id: 'item', actualQuantity: 3 }], finalAmount: 150000
  } } })
  await expect(api.confirmActuals('order', body, guard)).rejects.toThrow()
  const saved = api.pendingActuals('order')
  await api.confirmActuals('order', saved.body, saved.guard)
  expect(authorizedAxios.put.mock.calls[0]).toEqual(authorizedAxios.put.mock.calls[1])
  expect(api.pendingActuals('order')).toBeUndefined()
  authorizedAxios.put.mockRejectedValue({ response: { status: 409 } })
  await expect(api.confirmActuals('order', body, guard)).rejects.toBeTruthy()
  expect(api.pendingActuals('order')).toBeUndefined()
})
