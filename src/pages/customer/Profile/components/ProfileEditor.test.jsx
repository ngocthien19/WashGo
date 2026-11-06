import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import auth from '~/redux/auth/authSlice'
import i18n from '~/i18n'
import { customerProfileApi } from '~/apis/customer/customerProfileApi'
import { TooltipProvider } from '~/components/ui/tooltip'
import ProfileEditor from './ProfileEditor'

vi.mock('~/components/motion/Reveal', () => ({
  default: ({ children }) => (
    <div>
      {children}
    </div>
  )
}))
vi.mock('~/utils/notifications', () => ({ notify: { success: vi.fn() } }))

const profile = {
  id: 'customer-1', email: 'alex@example.test', fullName: 'Alex Nguyen', phone: '0901234567',
  address: '123 Le Loi', district: 'Quan 1', city: 'TP. Ho Chi Minh', avatarUrl: null,
  totalOrders: 0, totalSpent: 0, loyaltyPoints: 0
}

describe('profile editing', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('keeps edits after a failed save and synchronizes identity after retry', async () => {
    const user = userEvent.setup()
    const store = configureStore({ reducer: { auth }, preloadedState: {
      auth: { user: { id: profile.id, role: 'Customer' }, accessToken: 'access', refreshToken: 'refresh' }
    } })
    const update = vi.spyOn(customerProfileApi, 'updateProfile')
      .mockRejectedValueOnce(new Error('customer.profile.requestError'))
      .mockResolvedValueOnce({ ...profile, fullName: 'Alex Updated' })
    render(
      <Provider store={store}>
        <TooltipProvider>
          <ProfileEditor profile={profile} />
        </TooltipProvider>
      </Provider>
    )
    const save = screen.getByRole('button', { name: 'Save changes', exact: true })
    expect(save).toBeDisabled()
    await user.clear(screen.getByLabelText('Full name', { exact: true }))
    await user.type(screen.getByLabelText('Full name', { exact: true }), 'Alex Updated')
    await user.click(save)
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load or update your profile')
    expect(screen.getByLabelText('Full name', { exact: true })).toHaveValue('Alex Updated')
    await user.click(save)
    await waitFor(() => expect(save).toBeDisabled())
    expect(update).toHaveBeenLastCalledWith({
      fullName: 'Alex Updated', phone: profile.phone, address: profile.address,
      city: profile.city, avatarUrl: null
    }, expect.any(AbortSignal))
    expect(store.getState().auth.user.fullName).toBe('Alex Updated')
    expect(store.getState().auth.user.role).toBe('Customer')
    expect(screen.getByLabelText('Email', { exact: true })).toHaveAttribute('readonly')
  })
})
