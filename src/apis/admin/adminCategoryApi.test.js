import { expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/http/authorizedAxios'
import { adminCategoryApi } from './adminCategoryApi'
import { categoryLookup } from '~/apis/categories/categoryLookupApi'

vi.mock('~/utils/http/authorizedAxios', () => ({ default: { post: vi.fn(), get: vi.fn(), put: vi.fn() } }))
const id = 'ca000000-0000-0000-0000-000000000001'
const operationId = '10000000-0000-4000-8000-000000000001'
const row = { id, code: 'WASH', name: 'Wash', isActive: true, version: 'v1' }
it('loads all lookup pages instead of silently truncating at 100', async () => {
  authorizedAxios.get.mockImplementation((_path, { params }) => Promise.resolve({ data: { succeeded: true, list: [{ ...row, id: `${id}-${params.page}` }], totalPages: 2 } }))
  const result = await categoryLookup('Admin', undefined, true)
  expect(result).toHaveLength(2)
  expect(authorizedAxios.get).toHaveBeenCalledWith('/admin/lookups/service-categories', expect.objectContaining({ params: { page: 2, take: 100, includeInactive: true } }))
})
it('preserves the batch operation and payload through unknown, Processing and explicit resume', async () => {
  const body = { operationId, isActive: false, items: [{ id, expectedVersion: 'v1' }] }
  const intent = { key: 'batch', batch: true, action: 'status', body }
  authorizedAxios.post.mockRejectedValueOnce({ response: { status: 503 } })
  await expect(adminCategoryApi.execute(intent)).rejects.toMatchObject({ uncertain: true })
  expect(adminCategoryApi.pending()[0].body).toEqual(body)
  authorizedAxios.get.mockResolvedValueOnce({ data: { succeeded: true, data: { operationId, state: 'Processing', items: [] } } })
  expect((await adminCategoryApi.check('batch')).state).toBe('Processing')
  expect(adminCategoryApi.pending()).toHaveLength(1)
  const result = { operationId, state: 'Completed', items: [{ id, succeeded: false, statusCode: 409, outcome: 'Failed', reasonCode: 'VersionMismatch' }] }
  authorizedAxios.post.mockResolvedValueOnce({ data: { succeeded: true, data: result } })
  expect(await adminCategoryApi.resume('batch')).toEqual(result)
  expect(authorizedAxios.post).toHaveBeenLastCalledWith('/admin/service-categories/batch/status', body)
  expect(adminCategoryApi.pending()).toHaveLength(0)
})
it('rejects unrelated batch results without releasing the pending operation', async () => {
  const body = { operationId, items: [{ id, expectedVersion: 'v1' }], isActive: false }
  authorizedAxios.post.mockResolvedValueOnce({ data: { succeeded: true, data: { operationId: 'other', state: 'Completed', items: [] } } })
  await expect(adminCategoryApi.execute({ key: 'batch', batch: true, action: 'delete', body })).rejects.toMatchObject({ uncertain: true })
  const result = { operationId, state: 'Completed', items: [{ id, succeeded: false, statusCode: 409, outcome: 'Failed', dependencyCounts: { services: 2 } }] }
  authorizedAxios.get.mockResolvedValueOnce({ data: { succeeded: true, data: result } })
  expect((await adminCategoryApi.check('batch')).items[0].dependencyCounts.services).toBe(2)
  expect(adminCategoryApi.pending()).toHaveLength(0)
})
it('sends a guarded edit and does not send audit fields or mutate the provided operation', async () => {
  authorizedAxios.put.mockResolvedValueOnce({ data: { succeeded: true, data: { ...row, version: 'v2' } } })
  const body = { operationId, expectedVersion: 'v1', code: 'WASH', name: 'Renamed', description: '', sortOrder: 0, isActive: true }
  expect((await adminCategoryApi.execute({ key: id, id, batch: false, body })).version).toBe('v2')
  expect(authorizedAxios.put).toHaveBeenCalledWith(`/admin/service-categories/${id}`, body)
})
