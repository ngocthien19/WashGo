import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import toast from 'react-hot-toast'
import i18n from '~/i18n'
import { notify } from '~/utils/notifications/notifications'
import { TooltipProvider } from '~/components/ui/tooltip'
import AppToaster from './AppToaster'

beforeEach(() => {
  // Hot Toast waits for a measured height before showing a toast; jsdom has no layout.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 320, 64))
})
afterEach(() => {
  act(() => toast.remove())
  vi.restoreAllMocks()
})

it('translates an already visible success toast and its dismiss action when language changes', async () => {
  const user = userEvent.setup()
  render(<TooltipProvider>
    <AppToaster />
  </TooltipProvider>)
  act(() => {
    notify.success('customer.profile.saved', undefined, { duration: 60000, removeDelay: 1 })
  })
  const vietnamese = i18n.t('customer.profile.saved')
  expect(await screen.findByText(vietnamese)).toBeVisible()
  await act(async () => i18n.changeLanguage('en'))
  const english = i18n.t('customer.profile.saved')
  expect(screen.getByText(english)).toBeVisible()
  expect(screen.queryByText(vietnamese)).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: i18n.t('common.closeNotification'), exact: true }))
  await waitFor(() => expect(screen.queryByText(english)).not.toBeInTheDocument())
})

it('supports error, information and warning notifications through the existing notify API', async () => {
  render(<AppToaster />)
  act(() => {
    notify.error('customer.orders.access.copyError')
    notify.info('customer.thisContentIsBeingUpdated')
    notify.warning('common.tooManyRequestsPleaseWaitAMomentAndTry')
  })
  expect(await screen.findByRole('alert')).toHaveTextContent(i18n.t('customer.orders.access.copyError'))
  expect(screen.getByText(i18n.t('customer.thisContentIsBeingUpdated'))).toBeVisible()
  expect(screen.getByText(i18n.t('common.tooManyRequestsPleaseWaitAMomentAndTry'))).toBeVisible()
})
