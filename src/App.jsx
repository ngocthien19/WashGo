import { AUTH_ROUTES, CUSTOMER_ROUTES, MERCHANT_ROUTES, ROLE_HOME_ROUTES, USER_ROLES } from '~/utils/constants'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import LoadingScreen from '~/components/LoadingScreen/LoadingScreen'
import ProtectedRoleRoute from '~/routes/ProtectedRoleRoute'
import DisplayControls from '~/components/DisplayControls/DisplayControls'
import AppToaster from '~/components/LocalizedMessage/AppToaster'

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
const CustomerProfilePage = lazy(() => import('~/pages/customer/Profile/ProfilePage'))
const CustomerCreateOrderPage = lazy(() => import('~/pages/customer/CreateOrder/CreateOrderPage'))
const CustomerPaymentPage = lazy(() => import('~/pages/customer/Payment/PaymentPage'))
const CustomerOrdersPage = lazy(() => import('~/pages/customer/Orders/OrdersPage'))
const CustomerOrderDetailPage = lazy(() => import('~/pages/customer/Orders/OrderDetailPage'))
const CustomerOrderReceiptPage = lazy(() => import('~/pages/customer/Orders/OrderReceiptPage'))
const CustomerComplaintsPage = lazy(() => import('~/pages/customer/Complaints/ComplaintsPage'))
const CustomerComplaintDetailPage = lazy(() => import('~/pages/customer/Complaints/ComplaintDetailPage'))
const CustomerLayout = lazy(() => import('~/layouts/customer/CustomerLayout'))
const CustomerNotificationsPage = lazy(() => import('~/pages/customer/Notifications/NotificationsPage'))
const AdminHomePage = lazy(() => import('~/pages/admin/Home/HomePage'))
const MerchantHomePage = lazy(() => import('~/pages/merchant/Home/HomePage'))
const MerchantShippersPage = lazy(() => import('~/pages/merchant/Shippers/ShippersPage'))
const MerchantOrdersPage = lazy(() => import('~/pages/merchant/Orders/OrdersPage'))
const MerchantOrderDetailPage = lazy(() => import('~/pages/merchant/Orders/OrderDetailPage'))
const MerchantProfilePage = lazy(() => import('~/pages/merchant/Profile/ProfilePage'))
const MerchantLayout = lazy(() => import('~/layouts/merchant/MerchantLayout'))
const MerchantNotificationsPage = lazy(() => import('~/pages/merchant/Notifications/NotificationsPage'))
const ShipperHomePage = lazy(() => import('~/pages/shipper/Home/HomePage'))

export default function App() {

  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route element={<ProtectedRoleRoute role={USER_ROLES.CUSTOMER} />}>
            <Route element={<CustomerLayout />}>
              <Route
                path={CUSTOMER_ROUTES.NOTIFICATIONS}
                element={<CustomerNotificationsPage />}
              />
              <Route
                path={CUSTOMER_ROUTES.COMPLAINTS}
                element={<CustomerComplaintsPage />}
              />
              <Route
                path={CUSTOMER_ROUTES.COMPLAINT_DETAIL}
                element={<CustomerComplaintDetailPage />}
              />
              <Route
                path={CUSTOMER_ROUTES.ORDER_RECEIPT}
                element={<CustomerOrderReceiptPage />}
              />
              <Route
                path={CUSTOMER_ROUTES.ORDERS}
                element={<CustomerOrdersPage />}
              />
              <Route
                path={CUSTOMER_ROUTES.ORDER_DETAIL}
                element={<CustomerOrderDetailPage />}
              />
              <Route
                path={CUSTOMER_ROUTES.PAYMENT}
                element={<CustomerPaymentPage />}
              />
              <Route
                path={CUSTOMER_ROUTES.PAYMENT_RETURN}
                element={<CustomerPaymentPage />}
              />
              <Route
                path={CUSTOMER_ROUTES.CREATE_ORDER}
                element={<CustomerCreateOrderPage />}
              />
              <Route
                path={CUSTOMER_ROUTES.PROFILE}
                element={<CustomerProfilePage />}
              />
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
          <Route element={<ProtectedRoleRoute role={USER_ROLES.MERCHANT} />}>
            <Route element={<MerchantLayout />}>
              <Route
                path={MERCHANT_ROUTES.HOME}
                element={<MerchantHomePage />}
              />
              <Route
                path={MERCHANT_ROUTES.SHIPPERS}
                element={<MerchantShippersPage />}
              />
              <Route
                path={MERCHANT_ROUTES.ORDERS}
                element={<MerchantOrdersPage />}
              />
              <Route
                path={MERCHANT_ROUTES.ORDER_DETAIL}
                element={<MerchantOrderDetailPage />}
              />
              <Route
                path={MERCHANT_ROUTES.PROFILE}
                element={<MerchantProfilePage />}
              />
              <Route
                path={MERCHANT_ROUTES.NOTIFICATIONS}
                element={<MerchantNotificationsPage />}
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
      <AppToaster />
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
