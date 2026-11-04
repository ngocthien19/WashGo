import { AUTH_ROUTES, CUSTOMER_ROUTES, ROLE_HOME_ROUTES, USER_ROLES } from '~/utils/constants'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import { lazy, Suspense } from 'react'
import { useTheme } from '~/hooks/useTheme'
import LoadingScreen from '~/components/LoadingScreen/LoadingScreen'
import ProtectedRoleRoute from '~/routes/ProtectedRoleRoute'
import DisplayControls from '~/components/DisplayControls/DisplayControls'
import ToastCloseButton from '~/components/LocalizedMessage/ToastCloseButton'

const AuthLayout = lazy(() => import('~/layouts/auth/AuthLayout'))
const LoginPage = lazy(() => import('~/pages/auth/Login/LoginPage'))
const RegisterPage = lazy(() => import('~/pages/auth/Register/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('~/pages/auth/ForgotPassword/ForgotPasswordPage'))
const VerifyOtpPage = lazy(() => import('~/pages/auth/VerifyOtp/VerifyOtpPage'))
const ResetPasswordPage = lazy(() => import('~/pages/auth/ResetPassword/ResetPasswordPage'))
const AccountPage = lazy(() => import('~/pages/auth/Account/AccountPage'))
const CustomerHomePage = lazy(() => import('~/pages/customer/Home/HomePage'))
const CustomerServicesPage = lazy(() => import('~/pages/customer/Services/ServicesPage'))
const CustomerLockersPage = lazy(() => import('~/pages/customer/Lockers/LockersPage'))
const CustomerLayout = lazy(() => import('~/layouts/customer/CustomerLayout'))
const AdminHomePage = lazy(() => import('~/pages/admin/Home/HomePage'))
const MerchantHomePage = lazy(() => import('~/pages/merchant/Home/HomePage'))
const ShipperHomePage = lazy(() => import('~/pages/shipper/Home/HomePage'))

export default function App() {
  const { theme } = useTheme()

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route element={<ProtectedRoleRoute role={USER_ROLES.CUSTOMER} />}>
            <Route element={<CustomerLayout />}>
              <Route
                path={ROLE_HOME_ROUTES[USER_ROLES.CUSTOMER]}
                element={<CustomerHomePage />}
              />
              <Route
                path={CUSTOMER_ROUTES.SERVICES}
                element={<CustomerServicesPage />}
              />
              <Route
                path={CUSTOMER_ROUTES.LOCKERS}
                element={<CustomerLockersPage />}
              />
            </Route>
          </Route>
          <Route element={<StandaloneThemeLayout />}>
            <Route element={<ProtectedRoleRoute role={USER_ROLES.ADMIN} />}>
              <Route
                path={ROLE_HOME_ROUTES[USER_ROLES.ADMIN]}
                element={<AdminHomePage />}
              />
            </Route>
            <Route element={<ProtectedRoleRoute role={USER_ROLES.MERCHANT} />}>
              <Route
                path={ROLE_HOME_ROUTES[USER_ROLES.MERCHANT]}
                element={<MerchantHomePage />}
              />
            </Route>
            <Route element={<ProtectedRoleRoute role={USER_ROLES.SHIPPER} />}>
              <Route
                path={ROLE_HOME_ROUTES[USER_ROLES.SHIPPER]}
                element={<ShipperHomePage />}
              />
            </Route>
            <Route element={<AuthLayout />}>
              <Route
                index
                element={(
                  <Navigate
                    to={AUTH_ROUTES.LOGIN}
                    replace
                  />
                )}
              />
              <Route
                path={AUTH_ROUTES.LOGIN}
                element={<LoginPage />}
              />
              <Route
                path={AUTH_ROUTES.REGISTER}
                element={<RegisterPage />}
              />
              <Route
                path={AUTH_ROUTES.FORGOT_PASSWORD}
                element={<ForgotPasswordPage />}
              />
              <Route
                path={AUTH_ROUTES.VERIFY_OTP}
                element={<VerifyOtpPage />}
              />
              <Route
                path={AUTH_ROUTES.RESET_PASSWORD}
                element={<ResetPasswordPage />}
              />
              <Route
                path={AUTH_ROUTES.ACCOUNT}
                element={<AccountPage />}
              />
              <Route
                path="*"
                element={(
                  <Navigate
                    to={AUTH_ROUTES.LOGIN}
                    replace
                  />
                )}
              />
            </Route>
          </Route>
        </Routes>
      </Suspense>
      <ToastContainer
        closeButton={ToastCloseButton}
        position="top-right"
        autoClose={4000}
        theme={theme}
      />
    </BrowserRouter>
  )
}

function StandaloneThemeLayout() {
  return (
    <>
      <DisplayControls />
      <Outlet />
    </>
  )
}
