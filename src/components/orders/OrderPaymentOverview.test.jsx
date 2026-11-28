import { beforeEach, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import i18n from '~/i18n'
import { formatCurrency } from '~/utils/format/formats'
import OrderPaymentOverview from './OrderPaymentOverview'

beforeEach(async () => {
  await i18n.changeLanguage('en')
})
it('shows recorded fees without presenting service value as a net cash total', () => {
  render(<OrderPaymentOverview order={{ finalAmount: 240000, overdueFeeTotal: 400000, storageFeeTotal: 100000, cancelFeeAmount: 15000, cancelFeePaidAmount: 5000 }} />)
  for (const amount of [240000, 400000, 100000, 15000, 5000]) {
    expect(screen.getByText(formatCurrency(amount))).toBeVisible()
  }
  expect(screen.getByText('Total outstanding').parentElement).toHaveTextContent('Not confirmed')
  expect(screen.getByText('Points used').parentElement).toHaveTextContent('Not confirmed')
  expect(screen.queryByText(formatCurrency(640000))).not.toBeInTheDocument()
  expect(screen.getByText('— / —')).toBeVisible()
})
it('does not infer gateway cash or redeemed points from commission collections or Paid status', () => {
  render(<OrderPaymentOverview order={{ finalAmount: 240000, paymentStatus: 2, collectedLaundryAmount: 240000, commissionAmount: 48000 }} />)
  expect(screen.getAllByText('Not confirmed')).toHaveLength(2)
  expect(screen.queryByText(formatCurrency(48000))).not.toBeInTheDocument()
  expect(screen.getByText('— / —')).toBeVisible()
})
it('distinguishes zero recorded fees from missing amounts', () => {
  render(<OrderPaymentOverview order={{ finalAmount: 45000, overdueFeeTotal: 0 }} />)
  expect(screen.getByText('Recorded overdue/storage fees').parentElement).toHaveTextContent(formatCurrency(0))
  expect(screen.getByText('Overdue/storage fees paid').parentElement).toHaveTextContent('—')
})
