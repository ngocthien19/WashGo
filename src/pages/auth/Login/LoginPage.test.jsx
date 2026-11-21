import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import authReducer, { clearSession } from '~/redux/auth/authSlice'
import ProtectedRoleRoute from '~/routes/ProtectedRoleRoute'
import { AUTH_ROUTES } from '~/utils/config/constants'
import { authApi } from '~/apis/auth/authApi'
import LoginPage from './LoginPage'

vi.mock('~/apis/auth/authApi', () => ({ authApi: { login: vi.fn(), getMe: vi.fn() } }))
vi.mock('~/utils/notifications/notifications', () => ({ notify: { info: vi.fn(), success: vi.fn() } }))
vi.mock('./components/GoogleSignInButton', () => ({ default: ({ onError }) => <button onClick={() => onError({ response: { data: { meta: { code: 'AccountLocked' } } } })}>Google test</button> }))
beforeEach(() => vi.clearAllMocks())

function setup(notice) {
  const store = configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { user: null, accessToken: null, refreshToken: null, expiresAt: null, ...(notice ? { notice } : {}) } } })
  render(<Provider store={store}>
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  </Provider>)
  return store
}

async function signIn() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Email'), 'person@gmail.com')
  await user.type(screen.getByLabelText('Mật khẩu'), 'Password123!')
  await user.click(screen.getByRole('button', { name: 'Đăng nhập' }))
}

it('shows a locked account notice only in a modal and removes it after closing', async () => {
  authApi.login.mockRejectedValue({ response: { status: 400, data: { message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.' } } })
  const store = setup()
  await signIn()
  expect(await screen.findByRole('dialog')).toHaveTextContent('Tài khoản đã bị khóa')
  expect(screen.getByRole('dialog')).toHaveTextContent('Chưa có lý do được cung cấp.')
  await userEvent.click(screen.getAllByRole('button', { name: 'Đóng' }).at(-1))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.queryByText('Tài khoản đã bị khóa')).not.toBeInTheDocument()
  expect(store.getState().auth.accessToken).toBeNull()
})

it('shows the server-provided deletion reason inside the modal as plain text', async () => {
  const reason = 'Xóa theo yêu cầu của chủ tài khoản <b>đã xác nhận</b>'
  authApi.login.mockRejectedValue({ response: { status: 403, data: { meta: { code: 'AccountDeleted', accountAccessReason: reason } } } })
  setup()
  await signIn()
  const dialog = await screen.findByRole('dialog')
  expect(dialog).toHaveTextContent('Lý do xóa tài khoản')
  expect(dialog).toHaveTextContent(reason)
  expect(dialog.querySelector('b')).toBeNull()
})

it('shows the same account notice for Google login', async () => {
  setup()
  await userEvent.click(screen.getByRole('button', { name: 'Google test' }))
  expect(screen.getByRole('dialog')).toHaveTextContent('Tài khoản đã bị khóa')
})

it('clears an old lock notice when a new attempt fails for invalid credentials', async () => {
  authApi.login.mockRejectedValue({ response: { status: 400, data: { message: 'Email hoặc mật khẩu không đúng.' } } })
  setup('locked')
  await userEvent.click(screen.getAllByRole('button', { name: 'Đóng' }).at(-1))
  await signIn()
  expect(await screen.findByText('Email hoặc mật khẩu không đúng.')).toBeInTheDocument()
  expect(screen.queryByText('Tài khoản đã bị khóa')).not.toBeInTheDocument()
})

it.each(['Customer', 'Merchant', 'Shipper', 'Admin'])('redirects a revoked %s session to sign-in, including guest-accessible Home', async role => {
  const user = { id: 'test-user', role }
  authApi.getMe.mockResolvedValue(user)
  const store = configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { user, accessToken: 'access', refreshToken: 'refresh' } } })
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={(
            <ProtectedRoleRoute
              role={role}
              allowGuestPaths={['/']}
            />
          )}
          >
            <Route
              path="/"
              element={<p>Private workspace</p>}
            />
          </Route>
          <Route
            path={AUTH_ROUTES.LOGIN}
            element={<LoginPage />}
          />
        </Routes>
      </MemoryRouter>
    </Provider>
  )
  expect(await screen.findByText('Private workspace')).toBeInTheDocument()
  act(() => {
    store.dispatch(clearSession({ notice: 'sessionEnded' }))
  })
  expect(await screen.findByRole('dialog')).toHaveTextContent('Phiên đăng nhập đã kết thúc')
  expect(screen.queryByText('Private workspace')).not.toBeInTheDocument()
  await userEvent.click(screen.getAllByRole('button', { name: 'Đóng' }).at(-1))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(store.getState().auth.accessToken).toBeNull()
})

it('lets the signed-out user dismiss the notice and return Home', async () => {
  const store = configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { accessToken: null, user: null, notice: 'locked' } } })
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[AUTH_ROUTES.LOGIN]}>
        <Routes>
          <Route
            path={AUTH_ROUTES.LOGIN}
            element={<LoginPage />}
          />
          <Route
            path="/"
            element={<p>Public Home</p>}
          />
        </Routes>
      </MemoryRouter>
    </Provider>
  )
  expect(screen.getByRole('dialog')).toHaveTextContent('Tài khoản đã bị khóa')
  await userEvent.click(screen.getByRole('button', { name: 'Về trang chủ' }))
  expect(await screen.findByText('Public Home')).toBeInTheDocument()
  expect(store.getState().auth.notice).toBeUndefined()
  expect(store.getState().auth.accessToken).toBeNull()
})
