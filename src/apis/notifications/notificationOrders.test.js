import { expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/http/authorizedAxios'
import { resolveNotificationOrders } from './notificationOrders'

vi.mock('~/utils/http/authorizedAxios', () => ({ default: { get: vi.fn() } }))
const id = '3a24f745-2e37-5d6f-1e10-b01dd461d257'
it('loads locker and compartment for a new order notification that already has its code', async () => {
  authorizedAxios.get.mockResolvedValueOnce({ data: { succeeded: true, data: { id, orderCode: 'WG2611172521', lockerName: 'Ben Thanh Locker', boxNumber: 3 } } })
  const result = await resolveNotificationOrders([{ linkType: 'order', linkId: id, messageKey: 'orderEvent.OrderCreated', messageArgs: { orderCode: 'WG2611172521' } }])
  expect(result[0].displayOrderSummary).toEqual({ lockerName: 'Ben Thanh Locker', boxNumber: '3' })
})
it('resolves repeated linked orders once without changing original content or navigation', async () => {
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: { id, orderCode: 'WG2611168921' } } })
  const item = { id: 'notice', linkType: 'order', linkId: id, content: `Order ${id}: needs review` }
  const result = await resolveNotificationOrders([item, { ...item, id: 'notice2' }])
  expect(authorizedAxios.get).toHaveBeenCalledTimes(1)
  expect(result[0]).toEqual({ ...item, displayOrderCode: 'WG2611168921' })
  expect(item.displayOrderCode).toBeUndefined()
})
it('keeps the inbox usable on lookup failure and rejects mismatched order data', async () => {
  const item = { linkType: 'order', linkId: id, content: id }
  authorizedAxios.get.mockRejectedValueOnce(new Error('Offline'))
  expect(await resolveNotificationOrders([item])).toEqual([item])
  authorizedAxios.get.mockResolvedValueOnce({ data: { succeeded: true, data: { id: 'other', orderCode: 'WG123' } } })
  expect(await resolveNotificationOrders([item])).toEqual([item])
})
it('does not resolve unrelated UUIDs, unsafe links or notifications already carrying an order code', async () => {
  authorizedAxios.get.mockClear()
  const items = [
    { linkType: 'order', linkId: id, content: 'Order WG123', messageArgs: { orderCode: 'WG123' } },
    { linkType: 'payment-reconciliation', linkId: id, content: id },
    { linkType: 'order', linkId: '../profile', content: '../profile' }
  ]
  expect(await resolveNotificationOrders(items)).toEqual(items)
  expect(authorizedAxios.get).not.toHaveBeenCalled()
})
