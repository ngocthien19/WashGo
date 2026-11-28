import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import i18n from '~/i18n'
import { customerPaymentApi } from '~/apis/customer/customerPaymentApi'
import { OrderRealtimeContext } from '~/hooks/useOrderRealtime'
import { createOrderRealtimeStore } from '~/utils/orders/orderRealtime'
import { formatCurrency } from '~/utils/format/formats'
import OrderPaymentAction from './OrderPaymentAction'

vi.mock('~/apis/customer/customerPaymentApi', () => ({ customerPaymentApi: { getSummary: vi.fn() } }))
beforeEach(() => vi.resetAllMocks())

it.each([true, false])('shows active reward points and net outstanding on compact=%s', async compact => {
  await i18n.changeLanguage('en')
  customerPaymentApi.getSummary.mockResolvedValue({
    outstanding: 240000, settled: false,
    obligations: [{ purpose: 1, due: 240000, paid: 0, outstanding: 240000 }],
    quote: { activeSession: { purpose: 4, paymentMethod: 2, amount: 239200, pointsToRedeem: 800, canContinue: false } }
  })
  render(<OrderPaymentAction
    order={{ id: 'order-points', revision: 1 }}
    compact={compact}
  />)
  expect(await screen.findByText(formatCurrency(239200))).toBeVisible()
  if (compact) {
    expect(screen.queryByText(/Reward points used/)).not.toBeInTheDocument()
  } else {
    expect(screen.getByText(/Reward points used \(800 points\)/)).toBeVisible()
  }
  expect(screen.getByRole('button', { name: 'Pay now', exact: true })).toBeEnabled()
})

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
