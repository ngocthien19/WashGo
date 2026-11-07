import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import useCatalogResource from './useCatalogResource'

it('retains a loaded inbox during background refresh but never leaks results into a different query', async () => {
  let finish
  const load = vi.fn().mockResolvedValueOnce(['notification']).mockImplementationOnce(() => new Promise((resolve) => {
    finish = resolve
  }))
  const nextQuery = vi.fn().mockImplementation(() => new Promise(() => {}))
  const { result, rerender } = renderHook(({ query, revision }) => useCatalogResource(query, revision, true), { initialProps: { query: load, revision: 0 } })
  await waitFor(() => expect(result.current.data).toEqual(['notification']))
  rerender({ query: load, revision: 1 })
  expect(result.current.loading).toBe(true)
  expect(result.current.data).toEqual(['notification'])
  await act(async () => finish(['updated']))
  expect(result.current.data).toEqual(['updated'])
  rerender({ query: nextQuery, revision: 1 })
  expect(result.current.data).toBeNull()
})
