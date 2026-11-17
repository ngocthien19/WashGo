import { render, screen, within } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import i18n from '~/i18n'
import OrderTimeline from './OrderTimeline'
import { formatDateTime } from '~/utils/format/formats'

beforeEach(async () => {
  await i18n.changeLanguage('en')
})

it('shows one milestone per status using its first recorded event without altering history', () => {
  const timeline = [
    { id: 'later', status: 2, timestamp: 1794100000, note: 'Repeated status audit' },
    { id: 'first', status: 2, timestamp: 1794000000, note: 'First deposit' }
  ]
  render(<OrderTimeline order={{ status: 3, timeline }} />)
  expect(screen.getByText('First deposit')).toBeVisible()
  expect(screen.queryByText('Repeated status audit')).not.toBeInTheDocument()
  const milestone = screen.getByText('First deposit').closest('li')
  expect(within(milestone).getByText(formatDateTime(1794000000))).toBeVisible()
  expect(milestone.parentElement.querySelectorAll('[aria-current="step"]')).toHaveLength(1)
  expect(timeline).toHaveLength(2)
  expect(timeline[0].id).toBe('later')
})

it('keeps one current milestone and unrecorded future steps when history repeats', () => {
  const { container } = render(<OrderTimeline order={{ status: 2, timeline: [
    { id: 'a', status: 2, timestamp: 1794000000 },
    { id: 'b', status: 2, timestamp: 1794100000 }
  ] }}
  />)
  expect(container.querySelectorAll('[aria-current="step"]')).toHaveLength(1)
  expect(container.querySelector('[aria-current="step"] time')).toBeNull()
  expect(screen.getAllByText('No event has been recorded for this step.').length).toBeGreaterThan(0)
})

it('explains processing milestones with distinct icons while preserving the actual event note', () => {
  render(<OrderTimeline order={{ status: 6, timeline: [
    { id: 'washing', status: 4, timestamp: 1794000000, note: 'Handle the silk separately' },
    { id: 'drying', status: 5, timestamp: 1794100000 }
  ] }}
  />)
  expect(screen.getByText('Your laundry is being washed according to your selected services.')).toBeVisible()
  expect(screen.getByText('Handle the silk separately')).toBeVisible()
  const washing = screen.getByText('Washing', { exact: true }).closest('li')
  const drying = screen.getByText('Drying', { exact: true }).closest('li')
  const ironing = screen.getByText('Ironing', { exact: true }).closest('li')
  expect(washing.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  expect(washing.querySelector('svg').innerHTML).not.toEqual(drying.querySelector('svg').innerHTML)
  expect(within(ironing).getByText('Your garments are being ironed for a neat, smooth finish.')).toBeVisible()
  expect(screen.queryByText('This step has been recorded.')).not.toBeInTheDocument()
})

it('uses captured transitions and workflow timestamps instead of assignment events', () => {
  render(<OrderTimeline order={{ status: 3, workflowSteps: [
    { status: 2, isApplicable: true, isCompleted: true, timestamp: 1794000000 },
    { status: 3, isApplicable: true, isCurrent: true }
  ], timeline: [
    { id: 'assigned', eventType: 'MerchantAssigned', basis: 'Captured', fromStatus: 2, status: 2, timestamp: 1793000000, note: 'Assignment is not a milestone' },
    { id: 'deposit', eventType: 'Deposited', basis: 'Captured', fromStatus: 1, status: 2, timestamp: 1794100000, note: 'Deposit confirmation' }
  ] }}
  />)
  expect(screen.queryByText('Assignment is not a milestone')).not.toBeInTheDocument()
  expect(screen.getByText('Deposit confirmation')).toBeVisible()
  expect(screen.getByText(formatDateTime(1794000000))).toBeVisible()
})
