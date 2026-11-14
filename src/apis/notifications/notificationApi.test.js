import { expect, it, vi } from 'vitest'
import { notificationApi } from './notificationApi'
import authorizedAxios from '~/utils/http/authorizedAxios'
vi.mock('~/utils/http/authorizedAxios', () => ({ default: { post: vi.fn() } }))
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
