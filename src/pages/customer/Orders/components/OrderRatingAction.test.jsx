import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { customerRatingApi } from '~/apis/customer/customerRatingApi'
import OrderRatingAction from './OrderRatingAction'

vi.mock('~/apis/customer/customerRatingApi', () => ({ customerRatingApi: { getByOrder: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())

it('checks an existing rating before offering an action, including after remount', async () => {
  let resolve
  customerRatingApi.getByOrder.mockImplementationOnce(() => new Promise((done) => {
    resolve = done
  }))
  const view = render(<OrderRatingAction order={{ id: 'one', status: 12 }} />)
  expect(screen.getByRole('button')).toBeDisabled()
  expect(screen.queryByRole('button', { name: 'Đánh giá dịch vụ', exact: true })).not.toBeInTheDocument()
  await act(async () => resolve({ id: 'rating-one' }))
  expect(screen.getByRole('button', { name: 'Xem đánh giá của bạn', exact: true })).toBeEnabled()
  view.unmount()
  customerRatingApi.getByOrder.mockResolvedValue({ id: 'rating-one' })
  render(<OrderRatingAction order={{ id: 'one', status: 12 }} />)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Xem đánh giá của bạn', exact: true })).toBeEnabled())
})

it('offers a new rating only for explicit empty data, not for lookup failures', async () => {
  customerRatingApi.getByOrder.mockResolvedValue(null)
  const view = render(<OrderRatingAction order={{ id: 'one', status: 12 }} />)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Đánh giá dịch vụ', exact: true })).toBeEnabled())
  customerRatingApi.getByOrder.mockRejectedValue(new Error('customer.rating.invalidResponse'))
  view.rerender(<OrderRatingAction order={{ id: 'two', status: 12 }} />)
  await waitFor(() => expect(screen.getByRole('button')).toBeEnabled())
  expect(screen.queryByRole('button', { name: 'Đánh giá dịch vụ', exact: true })).not.toBeInTheDocument()
})

it('does not query ratings before completion or apply an old order response to a different order', async () => {
  let resolveOld
  const view = render(<OrderRatingAction order={{ id: 'one', status: 1 }} />)
  expect(customerRatingApi.getByOrder).not.toHaveBeenCalled()
  customerRatingApi.getByOrder.mockImplementationOnce(() => new Promise((done) => {
    resolveOld = done
  })).mockResolvedValue(null)
  view.rerender(<OrderRatingAction order={{ id: 'one', status: 12 }} />)
  view.rerender(<OrderRatingAction order={{ id: 'two', status: 12 }} />)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Đánh giá dịch vụ', exact: true })).toBeEnabled())
  await act(async () => resolveOld({ id: 'old-rating' }))
  expect(screen.getByRole('button', { name: 'Đánh giá dịch vụ', exact: true })).toBeEnabled()
})
