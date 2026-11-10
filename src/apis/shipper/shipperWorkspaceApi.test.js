import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/authorizedAxios'
import { shipperWorkspaceApi } from './shipperWorkspaceApi'

vi.mock('~/utils/authorizedAxios', () => ({ default: { get: vi.fn(), put: vi.fn(), post: vi.fn() } }))
const profile = { id: 'shipper-1', fullName: 'Delivery staff', email: 'staff@example.test', vehicleType: 1, status: 1, isActive: true, totalDeliveries: 0, rating: 0 }
beforeEach(() => vi.clearAllMocks())
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
  await shipperWorkspaceApi.updateProfile({ ...profile, phone: '0901234567', avatarUrl: '', vehiclePlate: '59-X1 12345', merchantId: 'other', role: 'Admin' })
  expect(authorizedAxios.put).toHaveBeenCalledWith('/shipper-profile', { fullName: profile.fullName, phone: '0901234567', avatarUrl: '', vehicleType: 1, vehiclePlate: '59-X1 12345' })
})
it('uses server totals for scoped pending tasks and discards credentials', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, total: 18, list: [{ id: 'order-1', orderCode: 'WG1', assignedTaskType: 2, shipperTaskPinCode: 'secret', customerPhoneNumber: 'secret' }] } })
  const result = await shipperWorkspaceApi.pending(2)
  expect(result.total).toBe(18)
  expect(result.list[0]).not.toHaveProperty('shipperTaskPinCode')
  expect(result.list[0]).not.toHaveProperty('customerPhoneNumber')
  expect(authorizedAxios.post.mock.calls[0][1]).toMatchObject({ taskType: 2, pendingOnly: true, take: 5 })
  expect(authorizedAxios.post.mock.calls[0][1]).not.toHaveProperty('shipperId')
})
it('does not turn broken payloads into an empty dashboard', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, total: 0 } })
  await expect(shipperWorkspaceApi.pending(1)).rejects.toThrow('shipper.invalidResponse')
})
