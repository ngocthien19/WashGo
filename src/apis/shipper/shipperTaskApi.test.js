import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/http/authorizedAxios'
import { shipperTaskApi, taskView } from './shipperTaskApi'
vi.mock('~/utils/http/authorizedAxios', () => ({ default: { post: vi.fn(), get: vi.fn() } }))
const dto = { taskId: 'task-1', assignmentVersion: 'task-1', orderId: 'order-1', orderCode: 'WG1', orderRevision: 5, status: 1, taskType: 1, orderStatus: 2, canCollect: true, canReturn: false, taskBoxNumber: '3', order: { shipperId: 'shipper-1', customerName: 'PRIVATE', shipperTaskPinCode: 'SECRET', items: [] } }
const ok = data => ({ data: { succeeded: true, data } })
beforeEach(() => vi.clearAllMocks())
it('supports storage types without sending them to normal collect/return endpoints', async () => {
  const storage = taskView({ ...dto, taskType: 3, canCollect: false, canStorageHandover: true, storageShopAddress: 'Current shop', storageCycleId: 'cycle' })
  expect(storage).toMatchObject({ assignedTaskType: 3, nextAction: 3, canStorageHandover: true, storageShopAddress: 'Current shop' })
  await expect(shipperTaskApi.complete(storage, 3, { pinCode: '123456' })).rejects.toThrow('shipper.tasks.changed')
  expect(authorizedAxios.post).not.toHaveBeenCalled()
  authorizedAxios.post.mockResolvedValue(ok({ totalPending: 10, collectPending: 1, returnPending: 2, storageTransferPending: 3, storageReturnPending: 4 }))
  await expect(shipperTaskApi.summary({})).resolves.toMatchObject({ totalPending: 10 })
})
it('uses dedicated assignment filters and excludes credentials/customer fields', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, total: 30, list: [dto] } })
  const result = await shipperTaskApi.list({ keyword: 'WG', page: 2, take: 12, taskType: 1, assignedFrom: 100, assignedTo: 200, shipperId: 'other' })
  expect(authorizedAxios.post.mock.calls[0]).toEqual(['/shipper-tasks/filter', { keyword: 'WG', page: 2, take: 12, taskType: 1, assignedFrom: 100, assignedTo: 200, taskStatus: 1, sortBy: [{ field: 'AssignedAt', isDescending: false }] }, { signal: undefined }])
  expect(result.list[0]).toMatchObject({ id: 'order-1', taskId: 'task-1', revision: 5 })
  expect(result.list[0]).not.toHaveProperty('customerName')
  expect(result.list[0]).not.toHaveProperty('shipperTaskPinCode')
})
it('reads one pending summary without type/status/page overriding its scope', async () => {
  authorizedAxios.post.mockResolvedValue(ok({ totalPending: 5, collectPending: 3, returnPending: 2 }))
  expect(await shipperTaskApi.summary({ keyword: 'WG', taskType: 2, page: 9 })).toMatchObject({ totalPending: 5 })
  expect(authorizedAxios.post.mock.calls[0][1]).toEqual({ keyword: 'WG' })
})
it('reads task detail and checks the credential revision from the separate no-cache endpoint', async () => {
  authorizedAxios.get.mockResolvedValue(ok(dto))
  const order = await shipperTaskApi.detail('task-1')
  authorizedAxios.get.mockResolvedValue(ok({ taskId: 'task-1', assignmentVersion: 'task-1', orderRevision: 6, pinCode: '123456' }))
  await expect(shipperTaskApi.credentials(order)).rejects.toThrow('shipper.tasks.changed')
  expect(authorizedAxios.get.mock.calls[1][0]).toBe('/shipper-tasks/task-1/credentials')
})
it('sends assignment and revision guards with a fresh operation, never identity overrides', async () => {
  authorizedAxios.post.mockResolvedValue(ok({ id: 'order-1', shipperId: 'shipper-1', assignedTaskType: 1, status: 3 }))
  expect(await shipperTaskApi.complete(taskView(dto), 1, { pinCode: '123456', taskId: 'other' })).toEqual({ status: 3, boxNumber: '3' })
  expect(authorizedAxios.post.mock.calls[0][1]).toEqual({ pinCode: '123456', taskId: 'task-1', expectedAssignmentVersion: 'task-1', expectedTaskType: 1, expectedRevision: 5, expectedStatus: 2, operationId: expect.any(String) })
})
it('keeps an uncertain operation, blocks another POST and only resolves the matching task operation', async () => {
  const order = taskView({ ...dto, taskId: 'unknown-task', assignmentVersion: 'unknown-task' })
  authorizedAxios.post.mockRejectedValue({ response: { status: 503 } })
  await expect(shipperTaskApi.complete(order, 1, { pinCode: '123456' })).rejects.toMatchObject({ uncertain: true })
  const operationId = authorizedAxios.post.mock.calls[0][1].operationId
  await expect(shipperTaskApi.complete(order, 1, { pinCode: '123456' })).rejects.toMatchObject({ uncertain: true })
  expect(authorizedAxios.post).toHaveBeenCalledTimes(1)
  authorizedAxios.get.mockResolvedValue(ok({ taskId: 'unknown-task', operationId, state: 'unknown' }))
  await expect(shipperTaskApi.check(order)).rejects.toThrow('shipper.tasks.unknown')
  expect(shipperTaskApi.hasPending(order)).toBe(true)
  authorizedAxios.get.mockResolvedValue(ok({ taskId: 'unknown-task', operationId, state: 'succeeded', result: { id: 'order-1', assignedTaskType: 1, status: 3 } }))
  expect(await shipperTaskApi.check(order)).toMatchObject({ status: 3 })
  expect(shipperTaskApi.hasPending(order)).toBe(false)
})
