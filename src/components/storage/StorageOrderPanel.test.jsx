import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import i18n from '~/i18n'
import { storageApi } from '~/apis/storage/storageApi'
import StorageOrderPanel from './StorageOrderPanel'

afterEach(() => vi.restoreAllMocks())
const order = { id: 'order-1', status: 12, revision: 1, storageWorkflowVersion: 1 }

it.each(['Admin', 'Merchant'])('hides empty history and opens existing history for %s', async role => {
  await i18n.changeLanguage('en')
  const cycles = vi.spyOn(storageApi, 'cycles').mockResolvedValue({ list: [], total: 0, totalPages: 0 })
  const { rerender } = render(<StorageOrderPanel
    order={order}
    role={role}
  />)
  await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
  expect(screen.queryByRole('button', { name: i18n.t('storage.history') })).not.toBeInTheDocument()
  cycles.mockResolvedValue({ list: [{ id: 'cycle-1', orderId: order.id, state: 5, merchantName: 'Historical shop', feeTotal: 0, feePaid: 0, outstanding: 0 }], total: 1, totalPages: 1 })
  rerender(<StorageOrderPanel
    order={{ ...order, revision: 2 }}
    role={role}
  />)
  fireEvent.click(await screen.findByRole('button', { name: i18n.t('storage.history') }))
  expect(screen.getByRole('heading', { name: i18n.t('storage.title') })).toBeVisible()
  expect(screen.getByText(/Historical shop/)).toBeVisible()
  expect(cycles).toHaveBeenCalledTimes(2)
})

it('keeps active storage actions available when a legacy order has no recorded cycle', async () => {
  await i18n.changeLanguage('en')
  vi.spyOn(storageApi, 'cycles').mockResolvedValue({ list: [], total: 0, totalPages: 0 })
  render(<StorageOrderPanel
    order={{ ...order, status: 13, storageWorkflowVersion: 0 }}
    role="Admin"
  />)
  expect(await screen.findByRole('button', { name: i18n.t('storage.actions.verify-legacy') })).toBeVisible()
  expect(screen.queryByRole('button', { name: i18n.t('storage.history') })).not.toBeInTheDocument()
})
