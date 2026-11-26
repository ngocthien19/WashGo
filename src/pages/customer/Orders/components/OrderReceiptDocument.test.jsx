import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import i18n from '~/i18n'
import OrderReceiptDocument from './OrderReceiptDocument'
import logo from '~/assets/logo-washgo.svg'

it('brands the receipt and shortens only internal payment references without changing server data', async () => {
  await i18n.changeLanguage('en')
  const reference = 'WG-TOTAL-WG2611252098-a99a52a5cdc54c57a934631a64aa2b1e'
  const receipt = {
    receiptNumber: 'BL2611252098', orderCode: 'WG2611252098', issuedAt: '2026-11-25T15:13:00Z',
    seller: { name: 'WashGo Store' }, buyer: { name: 'Customer' },
    lines: [{ description: 'Laundry', quantity: 1, amount: 80000 }], fees: [],
    servicesAmount: 80000, discountAmount: 0, weightSurchargeAmount: 0, totalPaid: 80000,
    payments: [
      { reference, amount: 80000, paidAt: '2026-11-25T15:13:00Z' },
      { reference: 'BANK-a99a52a5cdc54c57a934631a64aa2b1e', amount: 20000, paidAt: '2026-11-25T15:14:00Z' }
    ], note: 'This is not an electronic or tax invoice.'
  }
  const { container } = render(<OrderReceiptDocument order={receipt} />)
  expect(container.querySelector('img')).toHaveAttribute('src', logo)
  expect(screen.getByText('WG-TOTAL-WG2611252098', { exact: true })).toBeVisible()
  expect(screen.getByText('BANK-a99a52a5cdc54c57a934631a64aa2b1e', { exact: true })).toBeVisible()
  expect(screen.queryByText(receipt.note)).not.toBeInTheDocument()
  expect(receipt.payments[0].reference).toBe(reference)
  expect(screen.getByText('Laundry')).toBeVisible()
})
