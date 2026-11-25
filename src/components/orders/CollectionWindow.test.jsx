import { render, screen } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import i18n from '~/i18n'
import CollectionWindow from './CollectionWindow'

beforeEach(() => i18n.changeLanguage('en'))
it('shows missing schedule explicitly without fabricating a deadline from deposit time', () => {
  render(<CollectionWindow order={{ collectionDeadlineState: 'ScheduleMissing', depositedAt: '2026-11-24T14:00:00Z', collectSlaHoursSnapshot: 4 }} />)
  expect(screen.getByText('The shop needs valid opening hours to determine the collection deadline.')).toBeVisible()
  expect(screen.queryByText(/Collection deadline:/)).not.toBeInTheDocument()
})
it('retains the backend shift start and deadline and uses only the authoritative overdue flag', () => {
  render(<CollectionWindow order={{ collectionDeadlineState: 'Scheduled', collectionStartsAt: '2026-11-25T01:00:00Z', collectionDeadlineAt: '2026-11-25T05:00:00Z', collectSlaHoursSnapshot: 4, isCollectionOverdue: true }} />)
  expect(screen.getByText(/Collection clock starts:/)).toBeVisible()
  expect(screen.getByText(/Collection deadline:/)).toBeVisible()
  expect(screen.getByRole('alert')).toHaveTextContent('Collection is overdue.')
})
