import { beforeEach, describe, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/http/authorizedAxios'
import { adminAccountApi, accountOperations } from './adminAccountApi'
vi.mock('~/utils/http/authorizedAxios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }))
const id = 'aa000000-0000-0000-0000-000000000001'
const caps = { canEdit: true, canChangeEmail: true, canLock: true, canUnlock: false, canDelete: true, canRestore: false, canManagePermissions: false, requiresReauthentication: false, blocked: [] }
const row = { id, revision: 2, role: 'Customer', fullName: 'Test Customer', email: 'customer@example.test', signInMethod: 'Password', isActive: true, isDeleted: false, isProtected: false, capabilities: caps }
const ok = data => ({ data: { succeeded: true, data } })
beforeEach(() => vi.clearAllMocks())
describe('account API contracts', () => {
  it('reads the new account pagination envelope and preserves deleted-count permission', async () => {
    authorizedAxios.get.mockResolvedValueOnce(ok({ items: [row], total: 23, page: 1, take: 20, hasMore: true }))
    expect((await adminAccountApi.list({ page: 1 })).total).toBe(23)
    authorizedAxios.get.mockResolvedValueOnce(ok({ total: 23, active: 20, locked: 3, deleted: null }))
    expect((await adminAccountApi.summary()).deleted).toBeNull()
  })
  it('rejects unsafe revisions and another account returned as the requested detail', async () => {
    authorizedAxios.get.mockResolvedValueOnce(ok({ ...row, revision: Number.MAX_SAFE_INTEGER + 1, obligations: { deleteBlockers: [] } }))
    await expect(adminAccountApi.detail(id)).rejects.toThrow('admin.invalidResponse')
    authorizedAxios.get.mockResolvedValueOnce(ok({ ...row, id: 'aa000000-0000-0000-0000-000000000002', obligations: { deleteBlockers: [] } }))
    await expect(adminAccountApi.detail(id)).rejects.toThrow('admin.invalidResponse')
  })
  it('uses the separate paginated activity envelope', async () => {
    authorizedAxios.get.mockResolvedValueOnce({ data: { succeeded: true, list: [], currentPage: 1, total: 0 } })
    expect((await adminAccountApi.activities(id, 1)).list).toEqual([])
    expect(authorizedAxios.get).toHaveBeenCalledWith(`/admin/accounts/${id}/activities`, expect.objectContaining({ params: { page: 1, take: 10 } }))
  })
  it('keeps unknown writes locked through 404, Processing and unrelated lookup responses without resending', async () => {
    authorizedAxios.post.mockRejectedValueOnce({ response: { status: 503 } })
    const request = { action: 'Lock', resourceId: id, suffix: `/${id}/status`, body: { isActive: false, expectedRevision: 2, reason: 'Review' } }
    await expect(accountOperations.send(request)).rejects.toMatchObject({ uncertain: true })
    const [intent] = accountOperations.snapshot()
    expect(intent.body).toMatchObject({ ...request.body, operationId: expect.any(String) })
    await expect(accountOperations.send(request)).rejects.toThrow('accounts.unknown')
    authorizedAxios.get.mockRejectedValueOnce({ response: { status: 404 } })
    await expect(accountOperations.check(intent)).rejects.toBeTruthy()
    authorizedAxios.get.mockResolvedValueOnce(ok({ operationId: intent.operationId, action: 'Unlock', resourceId: id, state: 'Completed', result: { succeeded: true, data: row } }))
    await expect(accountOperations.check(intent)).rejects.toThrow('admin.invalidResponse')
    authorizedAxios.get.mockResolvedValueOnce(ok({ operationId: intent.operationId, action: 'Lock', resourceId: id, state: 'Processing' }))
    await expect(accountOperations.check(intent)).rejects.toThrow('accounts.processing')
    expect(accountOperations.blocked([id])).toBe(true)
    authorizedAxios.get.mockResolvedValueOnce(ok({ operationId: intent.operationId, action: 'Lock', resourceId: id, state: 'Completed', result: { succeeded: true, data: { ...row, isActive: false } } }))
    expect((await accountOperations.check(intent)).isActive).toBe(false)
    expect(accountOperations.snapshot()).toHaveLength(0)
    expect(authorizedAxios.post).toHaveBeenCalledTimes(1)
  })
  it('releases explicit denials and preserves the revision in a successful patch', async () => {
    authorizedAxios.post.mockRejectedValueOnce({ response: { status: 403, data: { meta: { code: 'ReauthenticationRequired' } } } })
    await expect(accountOperations.send({ action: 'Lock', resourceId: id, suffix: `/${id}/status`, body: { expectedRevision: 2 } })).rejects.toBeTruthy()
    expect(accountOperations.snapshot()).toHaveLength(0)
    authorizedAxios.patch.mockResolvedValueOnce(ok(row))
    await accountOperations.send({ action: 'Update', resourceId: id, method: 'patch', suffix: `/${id}`, body: { expectedRevision: 2, fullName: 'Edited Customer' } })
    expect(authorizedAxios.patch).toHaveBeenCalledWith(`/admin/accounts/${id}`, expect.objectContaining({ expectedRevision: 2, fullName: 'Edited Customer', operationId: expect.any(String) }))
  })
  it('rejects incomplete batch results and accepts only the exact submitted IDs during recovery', async () => {
    authorizedAxios.post.mockResolvedValueOnce(ok({ operationId: 'wrong', state: 'Completed', items: [] }))
    await expect(accountOperations.send({ action: 'Batch', resourceId: 'batch', ids: [id], suffix: '/bulk', body: { action: 'SoftDelete', items: [{ id, expectedRevision: 2 }], reason: 'Cleanup' } })).rejects.toMatchObject({ uncertain: true })
    const [intent] = accountOperations.snapshot()
    const value = { operationId: intent.operationId, state: 'Completed', items: [{ id, succeeded: false, outcome: 'Failed', reasonCode: 'AccountHasOpenObligations' }], totals: { changed: 0, unchanged: 0, skipped: 0, failed: 1, succeeded: 0 } }
    authorizedAxios.get.mockResolvedValueOnce(ok({ operationId: intent.operationId, action: 'Batch', resourceId: 'batch', state: 'Completed', result: { succeeded: true, data: value } }))
    expect((await accountOperations.check(intent)).items[0].succeeded).toBe(false)
    expect(accountOperations.snapshot()).toHaveLength(0)
  })
  it.each(['Merchant', 'Shipper'])('recovers a committed %s create through the Account bridge without creating again', async role => {
    authorizedAxios.post.mockRejectedValueOnce({ response: { status: 503 } })
    await expect(accountOperations.send({ action: 'Create', resourceId: 'new', body: { role } })).rejects.toMatchObject({ uncertain: true })
    const [intent] = accountOperations.snapshot()
    const operation = { operationId: intent.operationId, action: 'Create', resourceId: `new:${role}`, state: 'Processing', completedAt: null }
    authorizedAxios.get.mockResolvedValueOnce(ok(operation))
    await expect(accountOperations.check(intent)).rejects.toThrow('accounts.processing')
    expect(accountOperations.blocked(['new'])).toBe(true)
    authorizedAxios.get.mockResolvedValueOnce(ok({ ...operation, resourceId: 'new:OtherRole', state: 'Completed', result: { succeeded: true, data: { ...row, role } } }))
    await expect(accountOperations.check(intent)).rejects.toThrow('admin.invalidResponse')
    authorizedAxios.get.mockResolvedValueOnce(ok({ ...operation, state: 'Completed', result: { succeeded: true, data: row } }))
    await expect(accountOperations.check(intent)).rejects.toThrow('admin.invalidResponse')
    authorizedAxios.get.mockResolvedValueOnce(ok({ ...operation, state: 'Completed', result: { succeeded: true, data: { ...row, role } } }))
    expect((await accountOperations.check(intent)).role).toBe(role)
    expect(authorizedAxios.get).toHaveBeenCalledTimes(4)
    expect(authorizedAxios.get.mock.calls.every(([path]) => path === `/admin/accounts/operations/${intent.operationId}`)).toBe(true)
    expect(authorizedAxios.post).toHaveBeenCalledTimes(1)
    expect(accountOperations.snapshot()).toHaveLength(0)
  })
  it('keeps a 202 Processing create locked until its own lookup completes', async () => {
    authorizedAxios.post.mockResolvedValueOnce({ status: 202, data: { succeeded: true, meta: { state: 'Processing' } } })
    await expect(accountOperations.send({ action: 'Create', resourceId: 'new', body: { role: 'Shipper' } })).rejects.toMatchObject({ message: 'accounts.processing', uncertain: true })
    const [intent] = accountOperations.snapshot()
    authorizedAxios.get.mockResolvedValueOnce(ok({ operationId: intent.operationId, action: 'Create', resourceId: 'new:Shipper', state: 'Completed', result: { succeeded: true, data: { ...row, role: 'Shipper' } } }))
    await accountOperations.check(intent)
    expect(accountOperations.snapshot()).toHaveLength(0)
  })
})
