import { expect, it, vi } from 'vitest'
import { notificationApi } from './notificationApi'
import authorizedAxios from '~/utils/http/authorizedAxios'
vi.mock('~/utils/http/authorizedAxios', () => ({ default: { post: vi.fn(), get: vi.fn() } }))
const result = total => ({ data: { succeeded: true, data: { items: [], total, page: 1, take: 1, unreadTotal: 0, counts: [] } } })
it('counts each category from the server total with take1 independently of list filters', async () => {
  authorizedAxios.post.mockImplementation((_path, body) => Promise.resolve(result(body.types.includes(45) ? 34 : 8)))
  const signal = new AbortController().signal
  expect(await notificationApi.categoryCounts([{ id: 'order', types: [43, 45] }, { id: 'services', types: [46] }], signal)).toEqual([{ id: 'order', total: 34 }, { id: 'services', total: 8 }])
  expect(authorizedAxios.post).toHaveBeenCalledWith('/notification/filter', { types: [43, 45], page: 1, take: 1 }, { signal })
})
it('a failed category count stays unknown while successful counts remain usable', async () => {
  authorizedAxios.post.mockImplementation((_path, body) => body.types.includes(46) ? Promise.reject(new Error('Offline')) : Promise.resolve(result(0)))
  expect(await notificationApi.categoryCounts([{ id: 'order', types: [43] }, { id: 'services', types: [46] }])).toEqual([{ id: 'order', total: 0 }, { id: 'services', total: null }])
})

it('reads delivery health without writes and rejects invalid counters', async () => {
  const summary = { pending: 2, sending: 1, deadLetter: 0, oldestPendingAt: null, serverNow: '2026-11-17T02:00:00Z' }
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: summary } })
  expect(await notificationApi.deliverySummary()).toEqual(summary)
  expect(authorizedAxios.get).toHaveBeenCalledWith('/notification/outbox/summary', { signal: undefined })
  authorizedAxios.get.mockResolvedValue({ data: { succeeded: true, data: { ...summary, pending: -1 } } })
  await expect(notificationApi.deliverySummary()).rejects.toThrow()
})
