import { render, screen } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import i18n from '~/i18n'
import { formatCurrency } from '~/utils/format/formats'
import PaymentSummary from './PaymentSummary'

beforeEach(async () => {
  await i18n.changeLanguage('en')
})

it.each([false, true])('deducts points from paid progress with checkout=%s', checkout => {
  const summary = {
    outstanding: 240000,
    obligations: [{ purpose: 1, due: 240000, paid: 0, outstanding: 240000 }],
    quote: { cashAmount: 239200, pointsToRedeem: 800 }
  }
  const view = render(<PaymentSummary
    summary={summary}
    checkout={checkout}
    amounts={checkout ? undefined : summary.quote}
  />)
  expect(screen.getByText(/^Paid:/)).toHaveTextContent(`${formatCurrency(0)} / ${formatCurrency(239200)}`)
  expect(screen.getByText('Total outstanding', { exact: true }).closest('div').querySelector('dd')).toHaveTextContent(formatCurrency(239200))
  view.rerender(<PaymentSummary summary={summary} />)
  expect(screen.getByText(/^Paid:/)).toHaveTextContent(`${formatCurrency(0)} / ${formatCurrency(240000)}`)
})

it.each([0, 45000])('shows one aggregate paid line below the total when paid is %s', paid => {
  render(<PaymentSummary summary={{
    outstanding: 445000 - paid,
    obligations: [
      { purpose: 1, due: 45000, paid, outstanding: 45000 - paid },
      { purpose: 2, due: 400000, paid: 0, outstanding: 400000 }
    ]
  }}
  />)
  const line = screen.getByText(/^Paid:/)
  expect(line).toHaveTextContent(`${formatCurrency(paid)} / ${formatCurrency(445000)}`)
  const total = screen.getByText('Total outstanding', { exact: true }).closest('div')
  expect(total).toContainElement(line)
  expect(total.querySelector('dd')).toHaveTextContent(formatCurrency(445000 - paid))
  expect(screen.getAllByText(/^Paid:/)).toHaveLength(1)
  expect(screen.getByText('Service amount', { exact: true }).closest('div')).not.toContainElement(line)
})
