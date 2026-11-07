import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { customerOrderApi } from '~/apis/customer/customerOrderApi'
import useOrderEstimates from './useOrderEstimates'

vi.mock('~/apis/customer/customerOrderApi', () => ({ customerOrderApi: { get: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())
it('renders safely before the order list has loaded', () => {
  const { result } = renderHook(() => useOrderEstimates(undefined))
  expect(result.current).toEqual({})
  expect(customerOrderApi.get).not.toHaveBeenCalled()
})
it('loads only the visible page, caps concurrency and retains only ETA fields', async () => {
  const orders = Array.from({ length: 8 }, (_, index) => ({ id: String(index), status: 2 }))
  const complete = []
  customerOrderApi.get.mockImplementation((id) => new Promise((resolve) => complete.push(() => resolve({ id, predictionStatus: 'predicted', predictedFinishAt: '2026-11-08T10:00:00Z', depositPinCode: 'secret' }))))
  const { result } = renderHook(() => useOrderEstimates(orders))
  expect(customerOrderApi.get).toHaveBeenCalledTimes(3)
  await act(async () => complete.splice(0).forEach((resolve) => resolve()))
  expect(customerOrderApi.get).toHaveBeenCalledTimes(6)
  await act(async () => complete.splice(0).forEach((resolve) => resolve()))
  expect(Object.keys(result.current)).toHaveLength(6)
  expect(result.current['0']).not.toHaveProperty('depositPinCode')
  expect(result.current['0'].predictionStatus).toBe('predicted')
})
it('skips cancelled orders and list responses which already include ETA', () => {
  const orders = [{ id: 'cancelled', status: 99 }, { id: 'enriched', status: 2, predictionStatus: 'rule' }]
  renderHook(() => useOrderEstimates(orders))
  expect(customerOrderApi.get).not.toHaveBeenCalled()
})
it('aborts old page requests and ignores stale results when filters change', async () => {
  let finish
  customerOrderApi.get.mockImplementationOnce(() => new Promise((resolve) => {
    finish = resolve
  })).mockResolvedValueOnce({ id: 'new', predictionStatus: 'rule' })
  const { result, rerender } = renderHook(({ orders }) => useOrderEstimates(orders), { initialProps: { orders: [{ id: 'old', status: 2 }] } })
  const signal = customerOrderApi.get.mock.calls[0][1]
  rerender({ orders: [{ id: 'new', status: 2 }] })
  expect(signal.aborted).toBe(true)
  await act(async () => finish({ id: 'old', predictionStatus: 'predicted' }))
  await waitFor(() => expect(result.current.new?.predictionStatus).toBe('rule'))
  expect(result.current).not.toHaveProperty('old')
})
it('isolates a detail failure and rejects a response for a different order', async () => {
  customerOrderApi.get.mockResolvedValueOnce({ id: 'other', predictionStatus: 'predicted' }).mockRejectedValueOnce(new Error('network'))
  const orders = [{ id: 'own', status: 2 }, { id: 'failed', status: 2 }]
  const { result } = renderHook(() => useOrderEstimates(orders))
  await waitFor(() => expect(result.current).toEqual({ own: null, failed: null }))
})
