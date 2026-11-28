import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import i18n from '~/i18n'
import { loadGoogleIdentity } from '~/utils/auth/googleIdentity'
import GoogleSignInButton from './GoogleSignInButton'

vi.mock('~/hooks/useTheme', () => ({ useTheme: () => ({ theme: 'light' }) }))
vi.mock('~/utils/config/constants', async importOriginal => ({
  ...await importOriginal(), GOOGLE_SIGN_IN: { CLIENT_ID: 'test-client', BUTTON_MAX_WIDTH: 400 }
}))
vi.mock('~/utils/auth/googleIdentity', () => ({ loadGoogleIdentity: vi.fn(), subscribeGoogleCredential: () => () => {} }))
afterEach(() => vi.restoreAllMocks())

it('renders and re-renders the Google button in the selected website language', async () => {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(320)
  const sdk = { renderButton: vi.fn((container, options) => {
    const button = document.createElement('button')
    button.textContent = options.locale === 'en' ? 'Sign in with Google' : 'Đăng nhập bằng Google'
    container.appendChild(button)
  }) }
  loadGoogleIdentity.mockResolvedValue(sdk)
  await i18n.changeLanguage('en')
  render(<GoogleSignInButton onSuccess={() => {}} />)
  expect(await screen.findByRole('button', { name: 'Sign in with Google', exact: true })).toBeVisible()
  expect(loadGoogleIdentity).toHaveBeenLastCalledWith('en')
  await act(async () => {
    await i18n.changeLanguage('vi')
  })
  expect(await screen.findByRole('button', { name: 'Đăng nhập bằng Google', exact: true })).toBeVisible()
  await waitFor(() => expect(sdk.renderButton).toHaveBeenLastCalledWith(expect.any(HTMLElement), expect.objectContaining({ locale: 'vi' })))
  expect(loadGoogleIdentity).toHaveBeenLastCalledWith('vi')
  expect(screen.queryByRole('button', { name: 'Sign in with Google', exact: true })).not.toBeInTheDocument()
})
