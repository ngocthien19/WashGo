import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/http/authorizedAxios'
import { shipperWorkspaceApi } from './shipperWorkspaceApi'

vi.mock('~/utils/http/authorizedAxios', () => ({ default: { get: vi.fn(), put: vi.fn(), post: vi.fn() } }))
const profile = { revision: 'v1', id: 'shipper-1', fullName: 'Delivery staff', email: 'staff@example.test', vehicleType: 1, status: 1, isActive: true, totalDeliveries: 0 }
beforeEach(() => vi.clearAllMocks())
it('only sends Available/Offline with self-profile guards and reconciles uncertain status changes', async () => {
  await expect(shipperWorkspaceApi.updateWorkStatus({ id: 'work-test', status: 2, expectedRevision: 'v1', operationId: 'op-work' })).rejects.toThrow('shipper.invalidResponse')
  expect(authorizedAxios.put).not.toHaveBeenCalled()
  authorizedAxios.put.mockRejectedValueOnce({ response: { status: 503 } })
  await expect(shipperWorkspaceApi.updateWorkStatus({ id: 'work-test', status: 3, expectedRevision: 'v1', operationId: 'op-work', merchantId: 'spoof', isActive: false })).rejects.toMatchObject({ uncertain: true })
  expect(authorizedAxios.put).toHaveBeenCalledWith('/shipper-profile/work-status', { status: 3, expectedRevision: 'v1', operationId: 'op-work' })
  await expect(shipperWorkspaceApi.updateProfile({ id: 'work-test', expectedRevision: 'v1', operationId: 'different' })).rejects.toMatchObject({ uncertain: true })
  authorizedAxios.get.mockResolvedValueOnce({ data: { succeeded: true, data: { ...profile, id: 'work-test', status: 3, revision: 'v2' } } })
  await expect(shipperWorkspaceApi.checkProfile('work-test')).resolves.toMatchObject({ status: 3 })
  expect(authorizedAxios.put).toHaveBeenCalledTimes(1)
})
it('reports a missing domain profile without treating the authenticated account as a shipper record', async () => {
  authorizedAxios.get.mockRejectedValue({ response: { status: 404, data: { message: 'Không tìm thấy hồ sơ Shipper.' } } })
  await expect(shipperWorkspaceApi.profile()).rejects.toThrow('shipper.profileMissing')
})
it('loads the current shipper profile and accepts legitimate zero metrics', async () => {
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: profile } })
  const signal = new AbortController().signal
  expect(await shipperWorkspaceApi.profile(signal)).toEqual(profile)
  expect(authorizedAxios.get).toHaveBeenCalledWith('/shipper-profile', { signal })
})
it('excludes work permissions and identity metadata from the profile PUT', async () => {
  authorizedAxios.put.mockResolvedValue({ data: { succeeded: true, data: profile } })
  await shipperWorkspaceApi.updateProfile({ ...profile, expectedRevision: 'v1', operationId: 'operation', phone: '0901234567', avatarUrl: '', vehiclePlate: '59-X1 12345', merchantId: 'other', role: 'Admin' })
  expect(authorizedAxios.put).toHaveBeenCalledWith('/shipper-profile', { expectedRevision: 'v1', operationId: 'operation', fullName: profile.fullName, phone: '0901234567', avatarUrl: '', vehicleType: 1, vehiclePlate: '59-X1 12345' })
})
it('uses server totals for scoped pending tasks and discards credentials', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, total: 18, list: [{ taskId: 'task-1', orderId: 'order-1', orderCode: 'WG1', taskType: 2, status: 1, canCollect: false, canReturn: true, shipperTaskPinCode: 'secret', customerPhoneNumber: 'secret' }] } })
  const result = await shipperWorkspaceApi.pending(2)
  expect(result.total).toBe(18)
  expect(result.list[0]).not.toHaveProperty('shipperTaskPinCode')
  expect(result.list[0]).not.toHaveProperty('customerPhoneNumber')
  expect(authorizedAxios.post.mock.calls[0][1]).toMatchObject({ taskType: 2, taskStatus: 1, take: 5 })
  expect(authorizedAxios.post.mock.calls[0][1]).not.toHaveProperty('shipperId')
})
it('does not turn broken payloads into an empty dashboard', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, total: 0 } })
  await expect(shipperWorkspaceApi.pending(1)).rejects.toThrow('shipper.invalidResponse')
})
