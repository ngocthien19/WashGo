import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import i18n from '~/i18n'
import TermsContent from './TermsContent'

it('keeps server clauses and places each dynamic rule under its related heading', async () => {
  await i18n.changeLanguage('en')
  render(<TermsContent policy={{ terms: { content: ['1. Booking and deposit: Deposit your items.', '2. Pricing and payment: Pay within 7 days.', '3. Cancellation: Fees may apply.', '4. Pickup: Collect your items.', '5. Compensation: Report an incident.', '6. Personal data: Your data stays private.'].join('\n') }, rules: { depositWindowMinutes: 45, unpaidStorageAfterDays: 7, cancelDepositedPercent: 25, freePickupHours: 24, compensationLostPercent: 70 } }} />)
  const clause = (title) => within(screen.getByRole('heading', { name: title }).closest('section'))
  expect(clause('1. Booking and deposit').getByText('45', { selector: 'strong' })).toBeVisible()
  expect(clause('3. Cancellation').getByText('25', { selector: 'strong' })).toBeVisible()
  expect(clause('4. Pickup').getByText('24', { selector: 'strong' })).toBeVisible()
  expect(clause('5. Compensation').getByText('70', { selector: 'strong' })).toBeVisible()
  expect(clause('2. Pricing and payment').getAllByText('7', { selector: 'strong' })).toHaveLength(2)
  expect(clause('1. Booking and deposit').queryByText('25')).not.toBeInTheDocument()
  expect(screen.getByText('Your data stays private.')).toBeVisible()
  expect(screen.queryByText('Current rules')).not.toBeInTheDocument()
})
