import { act, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import i18n from '~/i18n'
import { customerPaymentApi } from '~/apis/customer/customerPaymentApi'
import { OrderRealtimeContext } from '~/hooks/useOrderRealtime'
import { createOrderRealtimeStore } from '~/utils/orders/orderRealtime'
import { formatCurrency } from '~/utils/format/formats'
import OrderPaymentAction from './OrderPaymentAction'

vi.mock('~/apis/customer/customerPaymentApi', () => ({ customerPaymentApi: { getSummary: vi.fn() } }))

it('retains the amount and actions during background resync and applies the fresh server amount', async () => {
  await i18n.changeLanguage('en')
  const store = createOrderRealtimeStore()
  let finish
  customerPaymentApi.getSummary.mockResolvedValueOnce({ outstanding: 185000, quote: {} })
    .mockImplementationOnce(() => new Promise(resolve => {
      finish = resolve
    }))
  const view = render(<OrderRealtimeContext.Provider value={store}>
    <OrderPaymentAction
      order={{ id: 'order-1', revision: 1 }}
      compact
      secondaryAction={<button type="button">Details</button>}
    />
  </OrderRealtimeContext.Provider>)
  const amount = await screen.findByText(formatCurrency(185000))
  const pay = screen.getByRole('button', { name: i18n.t('customer.orders.pay'), exact: true })
  const details = screen.getByRole('button', { name: 'Details' })
  act(() => store.revalidate())
  await waitFor(() => expect(customerPaymentApi.getSummary).toHaveBeenCalledTimes(2))
  expect(screen.getByText(formatCurrency(185000))).toBe(amount)
  expect(screen.getByRole('button', { name: i18n.t('customer.orders.pay'), exact: true })).toBe(pay)
  expect(pay).toBeEnabled()
  expect(screen.getByRole('button', { name: 'Details' })).toBe(details)
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  await act(async () => finish({ outstanding: 180000, quote: {} }))
  expect(await screen.findByText(formatCurrency(180000))).toBe(amount)
  expect(screen.queryByText(formatCurrency(185000))).not.toBeInTheDocument()
  view.unmount()
  store.dispose()
})
