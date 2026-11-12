import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/authorizedAxios'
import { adminWrite, administrativeBatch, versionGuard } from './adminWrite'
vi.mock('~/utils/authorizedAxios', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))
const operationId = '10000000-0000-4000-8000-000000000001', id = '20000000-0000-4000-8000-000000000001'
beforeEach(() => vi.resetAllMocks())
it('rejects missing versions before a mutation and keeps opaque version digits', () => {
  expect(() => versionGuard(null)).toThrow('admin.sync.missingVersion')
  expect(versionGuard('63935071200123457', operationId)).toEqual({ expectedVersion: '63935071200123457', operationId })
  expect(authorizedAxios.put).not.toHaveBeenCalled()
})
it('recovers a committed write once using actor-scoped operation lookup without resending', async () => {
  authorizedAxios.put.mockRejectedValue(new Error('Disconnected after commit'))
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: { operationId, action: 'Status', resourceId: id, state: 'Completed', result: { succeeded: true, data: { id, isActive: false } } } } })
  expect(await adminWrite('Promotion', 'Status', id, 'put', `/promotion/${id}/status`, { operationId })).toMatchObject({ data: { data: { id, isActive: false } } })
  expect(authorizedAxios.put).toHaveBeenCalledTimes(1)
  expect(authorizedAxios.get).toHaveBeenCalledWith(`/admin-operations/Promotion/${operationId}`)
})
it('keeps a missing or mismatched lookup uncertain and never treats 404 as permission to retry', async () => {
  authorizedAxios.post.mockRejectedValue(new Error('Lost connection'))
  authorizedAxios.get.mockRejectedValue({ response: { status: 404 } })
  await expect(adminWrite('Service', 'Create', 'new', 'post', '/wash-service', { operationId })).rejects.toMatchObject({ uncertain: true })
  expect(authorizedAxios.post).toHaveBeenCalledTimes(1)
})
it('returns a partial batch result intact and rejects duplicate or unrelated result IDs', async () => {
  const items = [{ id, expectedVersion: 'v1' }, { id: operationId, expectedVersion: 'v2' }]
  const result = { operationId, state: 'Completed', items: [{ id, succeeded: true, statusCode: 200 }, { id: operationId, succeeded: false, statusCode: 409 }] }
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: result } })
  expect(await administrativeBatch('Locker', '/locker/batch', { operationId, action: 'Delete', items })).toEqual(result)
  expect(authorizedAxios.post).toHaveBeenCalledTimes(1)
  authorizedAxios.post.mockResolvedValue({ data: { succeeded: true, data: { ...result, items: [result.items[0], result.items[0]] } } })
  await expect(administrativeBatch('Locker', '/locker/batch', { operationId, action: 'Delete', items })).rejects.toMatchObject({ uncertain: true })
})
