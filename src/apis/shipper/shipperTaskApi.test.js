import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/authorizedAxios'
import { shipperTaskApi } from './shipperTaskApi'
vi.mock('~/utils/authorizedAxios', () => ({ default: { post: vi.fn(), get: vi.fn() } }))
const order = { id: 'task-1', orderCode: 'WG1', shipperId: 'shipper-1', assignedTaskType: 1, status: 2, boxNumber: '3', items: [] }
beforeEach(() => vi.clearAllMocks())
it('whitelists scoped active-task filters and removes list credentials and customer data', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, total: 30, list: [{ ...order, taskLockerAddress: 'Task address', taskLockerImageUrls: ['task.png'], shipperTaskPinCode: 'secret', customerName: 'private' }] } })
  const result = await shipperTaskApi.list({ keyword: 'WG', page: 2, take: 12, taskType: 1, shipperId: 'other', pendingOnly: false })
  expect(authorizedAxios.post.mock.calls[0][1]).toEqual({ keyword: 'WG', page: 2, take: 12, taskType: 1, pendingOnly: true, sortBy: [{ field: 'CreatedOn', isDescending: false }] })
  expect(result.totalPages).toBe(3)
  expect(result.list[0]).not.toHaveProperty('shipperTaskPinCode')
  expect(result.list[0]).not.toHaveProperty('customerName')
  expect(result.list[0]).toMatchObject({ taskLockerAddress: 'Task address', taskLockerImageUrls: ['task.png'] })
})
it('uses authorized order detail but discards all locker/task credentials', async () => {
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: { ...order, shipperTaskPinCode: 'secret', shipperTaskQrString: 'secret', depositPinCode: 'secret' } } })
  const result = await shipperTaskApi.detail(order.id)
  expect(result).not.toHaveProperty('shipperTaskPinCode')
  expect(result).not.toHaveProperty('shipperTaskQrString')
  expect(result).not.toHaveProperty('depositPinCode')
})
it('sends only a credential and verifies collection and allocated return compartment', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: { ...order, status: 3 } } })
  expect(await shipperTaskApi.complete(order, 1, { pinCode: '123456', expectedRevision: 5 })).toEqual({ status: 3, boxNumber: '3' })
  expect(authorizedAxios.post.mock.calls[0][1]).toEqual({ pinCode: '123456', qrCode: undefined })
  const returned = { ...order, assignedTaskType: 2, status: 10, returnBoxNumber: '12' }
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: returned } })
  expect(await shipperTaskApi.complete({ ...order, assignedTaskType: 2 }, 2, { qrCode: 'mock-qr' })).toEqual({ status: 10, boxNumber: '12' })
})
it('treats mismatched or incomplete acknowledgements as unknown', async () => {
  for (const result of [{ ...order, id: 'other', status: 3 }, { ...order, status: 2 }, { ...order, assignedTaskType: 2, status: 10 }]) {
    authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: result } })
    await expect(shipperTaskApi.complete(order, 1, { pinCode: '123456' })).rejects.toMatchObject({ uncertain: true })
  }
})
