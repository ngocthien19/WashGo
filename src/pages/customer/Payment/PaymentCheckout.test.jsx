import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import i18n from '~/i18n'
import { customerPaymentApi } from '~/apis/customer/customerPaymentApi'
import { formatCurrency } from '~/utils/format/formats'
import PaymentCheckout from './PaymentCheckout'

vi.mock('react-redux', () => ({ useSelector: selector => selector({ auth: { user: { id: 'points-test' } } }) }))
vi.mock('~/apis/customer/customerPaymentApi', () => ({ customerPaymentApi: { getSummary: vi.fn(), checkout: vi.fn() } }))

const summary = points => ({
  orderId: 'order-1', outstanding: 185000, settled: false,
  obligations: [{ purpose: 1, due: 185000, paid: 0, outstanding: 185000 }],
  quote: { maximumPoints: 800, pointsToRedeem: points, cashAmount: 185000 - points, canCreate: true, quoteToken: `quote-${points}`, methods: [{ paymentMethod: 2, enabled: true }, { paymentMethod: 3, enabled: true }] }
})

beforeEach(async () => {
  vi.clearAllMocks()
  await i18n.changeLanguage('en')
})

it('keeps the payment form mounted while applying and removing points and blocks stale checkout', async () => {
  const user = userEvent.setup()
  const refresh = vi.fn()
  let resolveQuote
  customerPaymentApi.getSummary.mockResolvedValueOnce(summary(0))
    .mockImplementation(() => new Promise(resolve => {
      resolveQuote = resolve
    }))
  render(<PaymentCheckout
    order={{ id: 'order-1', orderCode: 'WG-1' }}
    pendingRequests={{ current: new Set() }}
    refresh={refresh}
  />)
  const toggle = await screen.findByRole('checkbox', { name: /Use reward points/ })
  const method = screen.getByRole('radio', { name: 'MoMo' })
  await user.click(method)
  for (const points of [800, 0]) {
    await user.click(toggle)
    await waitFor(() => expect(customerPaymentApi.getSummary).toHaveBeenLastCalledWith('order-1', points, expect.any(AbortSignal)))
    expect(screen.getByRole('checkbox')).toBe(toggle)
    expect(screen.getByRole('radio', { name: 'MoMo' })).toBe(method)
    expect(method).toBeChecked()
    expect(toggle.checked).toBe(points > 0)
    const pay = screen.getByRole('button', { name: /^Pay / })
    expect(pay).toBeDisabled()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    await user.click(pay)
    expect(customerPaymentApi.checkout).not.toHaveBeenCalled()
    await act(async () => resolveQuote(summary(points)))
    await waitFor(() => expect(toggle).toBeEnabled())
    expect(screen.getByRole('button', { name: /^Pay / })).toHaveTextContent(formatCurrency(185000 - points))
  }
  customerPaymentApi.getSummary.mockRejectedValueOnce(new Error('customer.payment.invalidResponse'))
  await user.click(toggle)
  expect(await screen.findByRole('alert')).toBeVisible()
  expect(screen.getByRole('button', { name: /^Pay / })).toBeDisabled()
  expect(customerPaymentApi.checkout).not.toHaveBeenCalled()
  expect(refresh).not.toHaveBeenCalled()
})
