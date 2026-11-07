import { render, screen } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import i18n from '~/i18n'
import { formatDateTime } from '~/utils/formats'
import OrderCardSummary from './OrderCardSummary'

beforeEach(async () => {
  await i18n.changeLanguage('en')
})
it('shows the drop-off deadline instead of the processing estimate for pending orders', () => {
  const deadline = '2026-11-07T10:30:00Z'
  render(<OrderCardSummary order={{ status: 1, depositDeadline: deadline, estimatedFinishAt: '2026-11-09T10:00:00Z', isDepositExpired: true }} />)
  expect(screen.getByText('Drop-off deadline')).toBeVisible()
  expect(screen.getByText(formatDateTime(deadline))).toBeVisible()
  expect(screen.getByText('Drop-off deadline passed')).toBeVisible()
  expect(screen.queryByText(/Nov 9/)).not.toBeInTheDocument()
})
it('keeps an active order estimate explicitly labelled under its current stage', () => {
  render(<OrderCardSummary
    order={{ status: 2 }}
    estimate={{ predictionStatus: 'predicted', predictedFinishAt: '2026-11-08T10:00:00Z' }}
  />)
  expect(screen.getByText('Deposited · Awaiting collection')).toBeVisible()
  expect(screen.getByText(/^Estimated: /)).toBeVisible()
  expect(screen.getByText('Estimated from processing history')).toBeVisible()
})
it('uses the actual order completion milestone, never the laundry ETA, as completion time', () => {
  const recordedAt = 1794132000
  const view = render(<OrderCardSummary
    order={{ status: 12 }}
    estimate={{ predictedFinishAt: '2026-11-01T10:00:00Z', predictionStatus: 'done', recordedAt }}
  />)
  expect(screen.getByText(formatDateTime(recordedAt))).toBeVisible()
  expect(screen.queryByText(/Nov 1,/)).not.toBeInTheDocument()
  view.rerender(<OrderCardSummary
    order={{ status: 12 }}
    estimate={{ predictedFinishAt: '2026-11-01T10:00:00Z', predictionStatus: 'done' }}
  />)
  expect(screen.getByText('Order completed', { exact: true })).toBeVisible()
})
it('shows cancellation reason with no completion date or estimate', () => {
  render(<OrderCardSummary order={{ status: 99, cancellationReason: 'Changed plans', predictedFinishAt: '2026-11-08T10:00:00Z' }} />)
  expect(screen.getByText('Cancellation reason')).toBeVisible()
  expect(screen.getByText('Changed plans')).toBeVisible()
  expect(screen.queryByText(/Estimated/)).not.toBeInTheDocument()
})
