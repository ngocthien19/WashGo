import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/http/authorizedAxios'
import { adminServiceApi } from './adminServiceApi'
vi.mock('~/utils/http/authorizedAxios', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))
const id = '10000000-0000-4000-8000-000000000001'
const service = { id, version: 'v1', name: 'Wash', code: 'SVC1', approvalStatus: 2, isActive: true }
beforeEach(() => vi.clearAllMocks())
it('preserves false availability and whitelists catalog filters', async () => {
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, list: [service], total: 13 } })
  expect(await adminServiceApi.catalog({ page: 2, take: 12, isActive: false, role: 'Admin', imageUrls: ['bad'] })).toMatchObject({ currentPage: 2, totalPages: 2 })
  expect(authorizedAxios.post.mock.calls[0][1]).toEqual({ page: 2, take: 12, isActive: false })
})
it('does not submit owned image references without approval or identity fields when editing', async () => {
  authorizedAxios.put.mockResolvedValue({ data: { succeeded: true, data: service } })
  await adminServiceApi.update({ id, expectedVersion: 'v1', code: 'SVC1', name: 'Wash', isActive: true, imageUrls: ['bad'], approvalStatus: 3, approvedBy: id })
  expect(authorizedAxios.put).toHaveBeenCalledWith('/wash-service', expect.objectContaining({ id, code: 'SVC1', name: 'Wash', isActive: true, imageUrls: ['bad'], expectedVersion: 'v1', operationId: expect.any(String) }))
})
it('availability changes preserve approval and malformed writes are uncertain', async () => {
  authorizedAxios.put.mockResolvedValue({ data: { succeeded: true, data: { ...service, isActive: false } } })
  await adminServiceApi.status(service, false)
  expect(authorizedAxios.put).toHaveBeenCalledWith('/wash-service/status', expect.objectContaining({ serviceId: id, approvalStatus: 2, isActive: false, expectedVersion: 'v1', operationId: expect.any(String) }))
  authorizedAxios.put.mockResolvedValue({ data: { succeeded: true, data: service } })
  await expect(adminServiceApi.status(service, false)).rejects.toMatchObject({ uncertain: true })
})
it('proposal review verifies the expected returned proposal and outcome', async () => {
  const proposal = { id, merchantId: id, status: 3, requestType: 1, proposed: { name: 'New wash' } }
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: proposal } })
  await adminServiceApi.review(id, false, 'Duplicate', 'p1')
  expect(authorizedAxios.post).toHaveBeenCalledWith(`/service-proposal/${id}/reject`, expect.objectContaining({ reason: 'Duplicate', expectedVersion: 'p1', operationId: expect.any(String) }))
  await expect(adminServiceApi.review(id, true, '', 'p1')).rejects.toMatchObject({ uncertain: true })
})
