import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import i18n from '~/i18n'
import { customerLoyaltyApi } from '~/apis/customer/customerLoyaltyApi'
import LoyaltyPaymentChoice from './LoyaltyPaymentChoice'
import { formatCurrency } from '~/utils/format/formats'

vi.mock('~/apis/customer/customerLoyaltyApi', () => ({ customerLoyaltyApi: { quote: vi.fn() } }))

beforeEach(async () => {
  await i18n.changeLanguage('en')
  vi.clearAllMocks()
  customerLoyaltyApi.quote.mockImplementation(async (orderId, pointsToRedeem) => ({
    orderId, availablePoints: 1000, maximumPoints: 1000, pointsToRedeem,
    cashAmount: 50000 - pointsToRedeem, expectedEarnedPoints: pointsToRedeem ? 490 : 500
  }))
})

it('starts off, applies the maximum automatically, and restores the server quote when switched off', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  render(<LoyaltyPaymentChoice
    orderId="order-1"
    onChange={onChange}
  />)
  const toggle = screen.getByRole('switch', { name: 'Use reward points' })
  await waitFor(() => expect(toggle).toBeEnabled())
  expect(toggle).not.toBeChecked()
  expect(screen.getByText('500', { exact: true })).toBeVisible()
  expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Apply points' })).not.toBeInTheDocument()
  await user.click(toggle)
  expect(toggle).toBeChecked()
  await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ dirty: false, loading: false, quote: expect.objectContaining({ pointsToRedeem: 1000, cashAmount: 49000 }) })))
  expect(screen.getByText('490', { exact: true })).toBeVisible()
  expect(screen.getByText('Reward points used (1,000 points)').closest('div')).toHaveTextContent(`−${formatCurrency(1000)}`)
  toggle.focus()
  await user.keyboard(' ')
  await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ dirty: false, loading: false, quote: expect.objectContaining({ pointsToRedeem: 0, cashAmount: 50000 }) })))
  expect(toggle).not.toBeChecked()
  expect(screen.getByText('Reward points used (0 points)').closest('div')).toHaveTextContent(formatCurrency(0))
})

it('keeps the switch off for an empty wallet and still shows the expected reward', async () => {
  customerLoyaltyApi.quote.mockResolvedValue({ availablePoints: 0, maximumPoints: 0, pointsToRedeem: 0, cashAmount: 45000, expectedEarnedPoints: 450 })
  render(<LoyaltyPaymentChoice
    orderId="order-1"
    onChange={vi.fn()}
  />)
  expect(await screen.findByText('450', { exact: true })).toBeVisible()
  expect(screen.getByRole('switch')).toBeDisabled()
  expect(screen.getByRole('switch')).not.toBeChecked()
})

it('allows switching off after a rejected points quote without making the old quote payable', async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  customerLoyaltyApi.quote.mockImplementation(async (_id, points) => {
    if (points) {
      throw new Error('loyalty.invalidResponse')
    }
    return { availablePoints: 1000, maximumPoints: 1000, pointsToRedeem: 0, cashAmount: 50000, expectedEarnedPoints: 500 }
  })
  render(<LoyaltyPaymentChoice
    orderId="order-1"
    onChange={onChange}
  />)
  const toggle = screen.getByRole('switch')
  await waitFor(() => expect(toggle).toBeEnabled())
  await user.click(toggle)
  await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({ quote: null, dirty: true, loading: false }))
  await user.click(toggle)
  await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ dirty: false, quote: expect.objectContaining({ pointsToRedeem: 0 }) })))
  expect(toggle).not.toBeChecked()
})
