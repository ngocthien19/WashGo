import { act, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { customerOrderApi } from '~/apis/customer/customerOrderApi'
import OrderCardActuals from './OrderCardActuals'

vi.mock('~/apis/customer/customerOrderApi', () => ({ customerOrderApi: { get: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())

it('loads confirmed counts per service and shows order weight only once for mixed units', async () => {
  customerOrderApi.get.mockResolvedValue({ actualWeightKg: 10, items: [
    { id: 'kg-a', serviceName: 'Giặt kg', isWeightBased: true, unitSnapshot: 'kg' },
    { id: 'kg-b', serviceName: 'Sấy kg', isWeightBased: true, unitSnapshot: 'kg' },
    { id: 'item', serviceName: 'Giặt áo', isWeightBased: false, unitSnapshot: 'item', quantity: 5, actualQuantity: 3 },
    { id: 'pair', serviceName: 'Giặt giày', isWeightBased: false, unitSnapshot: 'pair', quantity: 2, actualQuantity: 0 }
  ] })
  render(<OrderCardActuals order={{ id: 'order', revision: 1 }} />)
  expect(await screen.findByText('3 cái')).toBeVisible()
  expect(screen.getByText('0 đôi')).toBeVisible()
  expect(screen.getByText('Giặt áo')).toBeVisible()
  expect(screen.getByText('Giặt giày')).toBeVisible()
  expect(screen.getAllByText('10 kg')).toHaveLength(1)
  expect(screen.queryByText('5 cái')).not.toBeInTheDocument()
})

it('does not substitute ordered counts for unconfirmed actual counts', async () => {
  render(<OrderCardActuals order={{ id: 'order', items: [
    { id: 'item', serviceName: 'Giặt áo', unitSnapshot: 'item', isWeightBased: false, quantity: 5, actualQuantity: null }
  ] }}
  />)
  expect(await screen.findByText('Chưa xác nhận')).toBeVisible()
  expect(screen.queryByText('5 cái')).not.toBeInTheDocument()
  expect(customerOrderApi.get).not.toHaveBeenCalled()
})

it('keeps quantities visible while fetching a new revision', async () => {
  customerOrderApi.get.mockResolvedValueOnce({ items: [
    { id: 'pair', serviceName: 'Giặt giày', isWeightBased: false, unitSnapshot: 'pair', actualQuantity: 2 }
  ] })
  const view = render(<OrderCardActuals order={{ id: 'order', revision: 1 }} />)
  const quantity = await screen.findByText('2 đôi')
  let resolve
  customerOrderApi.get.mockImplementationOnce(() => new Promise(done => {
    resolve = done
  }))
  view.rerender(<OrderCardActuals order={{ id: 'order', revision: 2 }} />)
  expect(screen.getByText('2 đôi')).toBe(quantity)
  await act(async () => resolve({ items: [
    { id: 'pair', serviceName: 'Giặt giày', isWeightBased: false, unitSnapshot: 'pair', actualQuantity: 3 }
  ] }))
  expect(await screen.findByText('3 đôi')).toBeVisible()
})
