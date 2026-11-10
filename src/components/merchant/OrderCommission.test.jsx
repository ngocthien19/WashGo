import { render, screen } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import i18n from '~/i18n'
import { formatCurrency } from '~/utils/formats'
import OrderCommission from './OrderCommission'

beforeEach(async () => {
  await i18n.changeLanguage('en')
})
it('never substitutes the current merchant rate for an unknown legacy order rate', () => {
  render(<OrderCommission order={{ commissionRateApplied: null, commissionRate: 25, merchantNetAmount: 100000 }} />)
  expect(screen.getByText('The historical commission rate for this order has not been confirmed.')).toBeVisible()
  expect(screen.queryByText('25%')).not.toBeInTheDocument()
  expect(screen.queryByText(formatCurrency(100000))).not.toBeInTheDocument()
})
it('accepts a locked zero rate and keeps actual collections separate from the final-price estimate', () => {
  render(<OrderCommission order={{ commissionRateApplied: 0, commissionStatus: 'Locked', collectedLaundryAmount: 60000, refundedAmount: 10000, commissionOnCollected: 0, merchantPayoutOnCollected: 50000, financialStatus: 'Adjusted', commissionBaseAmount: 100000, commissionAmount: 0, merchantNetAmount: 100000 }} />)
  expect(screen.getByText('0%')).toBeVisible()
  expect(screen.getByText(formatCurrency(50000))).toBeVisible()
  expect(screen.getByText('Adjusted for refunds')).toBeVisible()
  expect(screen.queryByText('The historical commission rate for this order has not been confirmed.')).not.toBeInTheDocument()
})
it('displays amounts supplied by the server without recalculating them from the final price', () => {
  render(<OrderCommission order={{ commissionRateApplied: 20, finalAmount: 999999, commissionBaseAmount: 100000, commissionAmount: 20000, merchantNetAmount: 80000 }} />)
  expect(screen.getByText('20%')).toBeVisible()
  expect(screen.getByText(formatCurrency(20000))).toBeVisible()
  expect(screen.getByText(formatCurrency(80000))).toBeVisible()
  expect(screen.getByText(/before refund and settlement adjustments/)).toBeVisible()
})
