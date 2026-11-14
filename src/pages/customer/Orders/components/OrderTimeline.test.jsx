import { render, screen, within } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import i18n from '~/i18n'
import OrderTimeline from './OrderTimeline'
import { formatDateTime } from '~/utils/formats'

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
