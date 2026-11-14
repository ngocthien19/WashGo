import { beforeEach, expect, it, vi } from 'vitest'
import authorizedAxios from '~/utils/http/authorizedAxios'
import { storageApi } from './storageApi'
vi.mock('~/utils/http/authorizedAxios', () => ({ default: { post: vi.fn(), get: vi.fn() } }))
const ok = data => ({ data: { succeeded: true, data } })
const row = id => ({ id: 'cycle', orderId: id, orderRevision: 12, state: 2 })
beforeEach(() => vi.resetAllMocks())

it('keeps one operation and exact payload across unknown lookup and explicit replay', async () => {
  const id = 'unknown'
  authorizedAxios.post.mockRejectedValueOnce(new Error('offline'))
  await expect(storageApi.execute(id, 'collect', 11, { taskId: 'task', pinCode: '123456', customerId: 'spoof', quoteToken: 'not-for-this-action' })).rejects.toMatchObject({ uncertain: true })
  const original = authorizedAxios.post.mock.calls[0]
  expect(original).toEqual(['/storage/unknown/collect', { expectedRevision: 11, operationId: expect.any(String), taskId: 'task', pinCode: '123456' }])
  await expect(storageApi.execute(id, 'handover', 12, {})).rejects.toMatchObject({ uncertain: true })
  expect(authorizedAxios.post).toHaveBeenCalledTimes(1)
  authorizedAxios.get.mockRejectedValueOnce({ response: { status: 404 } })
  await expect(storageApi.check(id)).rejects.toMatchObject({ uncertain: true })
  expect(storageApi.hasPending(id)).toBe(true)
  authorizedAxios.post.mockResolvedValueOnce(ok(row(id)))
  await storageApi.replay(id)
  expect(authorizedAxios.post.mock.calls[1]).toEqual(original)
  expect(storageApi.hasPending(id)).toBe(false)
})

it('clears a definite conflict and allows a new intent only with the reloaded revision', async () => {
  authorizedAxios.post.mockRejectedValueOnce({ response: { status: 409 } })
  await expect(storageApi.execute('conflict', 'place', 8, { taskId: 'task', qrCode: 'qr' })).rejects.toMatchObject({ response: { status: 409 } })
  expect(storageApi.hasPending('conflict')).toBe(false)
  authorizedAxios.post.mockResolvedValueOnce(ok(row('conflict')))
  await storageApi.execute('conflict', 'place', 9, { taskId: 'task', qrCode: 'qr' })
  expect(authorizedAxios.post.mock.calls[1][1].operationId).not.toBe(authorizedAxios.post.mock.calls[0][1].operationId)
})

it('rejects both credentials and verifies order identity in recovered results', async () => {
  await expect(storageApi.execute('credentials', 'collect', 1, { pinCode: '123456', qrCode: 'qr' })).rejects.toThrow('storage.invalidResponse')
  expect(authorizedAxios.post).not.toHaveBeenCalled()
  authorizedAxios.post.mockResolvedValueOnce(ok(row('different-order')))
  await expect(storageApi.execute('identity', 'cancel-return', 1)).rejects.toMatchObject({ uncertain: true })
  authorizedAxios.get.mockResolvedValueOnce(ok(row('different-order')))
  await expect(storageApi.check('identity')).rejects.toMatchObject({ uncertain: true })
  authorizedAxios.get.mockResolvedValueOnce(ok(row('identity')))
  await expect(storageApi.check('identity')).resolves.toMatchObject({ orderId: 'identity' })
})

it('only accepts a server quote bound to the selected order and locker', async () => {
  authorizedAxios.get.mockResolvedValueOnce(ok({ orderId: 'order', lockerId: 'other', quoteToken: 'token', feeTotal: 12, outstanding: 2, expiresAt: '2099-01-01T00:00:00Z' }))
  await expect(storageApi.quote('order', 'locker')).rejects.toThrow('storage.invalidResponse')
  authorizedAxios.get.mockResolvedValueOnce(ok({ orderId: 'order', lockerId: 'locker', quoteToken: 'token', feeTotal: 12, outstanding: 2, expiresAt: '2099-01-01T00:00:00Z' }))
  await expect(storageApi.quote('order', 'locker')).resolves.toMatchObject({ quoteToken: 'token', outstanding: 2 })
})
