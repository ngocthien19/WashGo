import { render, screen } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import i18n from '~/i18n'
import { formatCurrency } from '~/utils/formats'
import OrderCommission from './OrderCommission'

beforeEach(async () => {
  await i18n.changeLanguage('en')
})
it('never substitutes the current merchant rate for an unknown legacy order rate', () => {
  render(<OrderCommission order={{ commissionRateApplied: 0, commissionRate: 25, merchantNetAmount: 100000 }} />)
  expect(screen.getByText('The historical commission rate for this order has not been confirmed.')).toBeVisible()
  expect(screen.queryByText('25%')).not.toBeInTheDocument()
  expect(screen.queryByText(formatCurrency(100000))).not.toBeInTheDocument()
})
it('displays amounts supplied by the server without recalculating them from the final price', () => {
  render(<OrderCommission order={{ commissionRateApplied: 20, finalAmount: 999999, commissionBaseAmount: 100000, commissionAmount: 20000, merchantNetAmount: 80000 }} />)
  expect(screen.getByText('20%')).toBeVisible()
  expect(screen.getByText(formatCurrency(20000))).toBeVisible()
  expect(screen.getByText(formatCurrency(80000))).toBeVisible()
  expect(screen.getByText(/before refund and settlement adjustments/)).toBeVisible()
})
