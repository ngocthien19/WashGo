import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import useNotificationFeed from './useNotificationFeed'

const page = (currentPage, list) => ({ currentPage, list: list.map(id => ({ id })), totalPages: 3, total: 5 })

it('appends pages once, deduplicates IDs and refreshes all loaded pages', async () => {
  const load = vi.fn(async number => page(number, number === 1 ? ['a', 'b'] : number === 2 ? ['b', 'c'] : ['d', 'e']))
  const { result, rerender } = renderHook(({ revision }) => useNotificationFeed(load, revision, true), { initialProps: { revision: 0 } })
  await waitFor(() => expect(result.current.loading).toBe(false))
  await act(async () => {
    await Promise.all([result.current.loadMore(), result.current.loadMore()])
  })
  expect(load.mock.calls.map(([number]) => number)).toEqual([1, 2])
  expect(result.current.data.list.map(item => item.id)).toEqual(['a', 'b', 'c'])
  rerender({ revision: 1 })
  await waitFor(() => expect(result.current.loading).toBe(false))
  expect(load.mock.calls.map(([number]) => number)).toEqual([1, 2, 1, 2])
  await act(async () => {
    await result.current.loadMore()
  })
  expect(result.current.hasMore).toBe(false)
  await act(async () => {
    await result.current.loadMore()
  })
  expect(load).toHaveBeenCalledTimes(5)
})

it('preserves loaded items after an append error and retries the same page', async () => {
  let fail = true
  const load = vi.fn(async number => {
    if (number === 2 && fail) {
      fail = false; throw new Error('Offline')
    }
    return page(number, [String(number)])
  })
  const { result } = renderHook(() => useNotificationFeed(load, 0, true))
  await waitFor(() => expect(result.current.loading).toBe(false))
  await act(async () => {
    await result.current.loadMore()
  })
  expect(result.current.data.list).toEqual([{ id: '1' }])
  expect(result.current.moreError).toBe('Offline')
  await act(async () => {
    await result.current.loadMore()
  })
  expect(load.mock.calls.map(([number]) => number)).toEqual([1, 2, 2])
  expect(result.current.moreError).toBe('')
  expect(result.current.data.list).toEqual([{ id: '1' }, { id: '2' }])
})

it('ignores an obsolete append after a refresh and aborts on unmount', async () => {
  let finish, appendSignal
  const load = vi.fn((number, signal) => {
    if (number === 2) {
      appendSignal = signal; return new Promise(resolve => {
        finish = resolve
      })
    }
    return Promise.resolve(page(1, ['current']))
  })
  const { result, rerender, unmount } = renderHook(({ revision }) => useNotificationFeed(load, revision, true), { initialProps: { revision: 0 } })
  await waitFor(() => expect(result.current.loading).toBe(false))
  let pending
  act(() => {
    pending = result.current.loadMore()
  })
  rerender({ revision: 1 })
  await waitFor(() => expect(result.current.loading).toBe(false))
  expect(appendSignal.aborted).toBe(true)
  await act(async () => {
    finish(page(2, ['obsolete'])); await pending
  })
  expect(result.current.data.list).toEqual([{ id: 'current' }])
  const lastSignal = load.mock.calls.at(-1)[1]
  unmount()
  expect(lastSignal.aborted).toBe(true)
})

it('does not fetch when the paged full inbox is in use', () => {
  const load = vi.fn()
  renderHook(() => useNotificationFeed(load, 0, false))
  expect(load).not.toHaveBeenCalled()
})
