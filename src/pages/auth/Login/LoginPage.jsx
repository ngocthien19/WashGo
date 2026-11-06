import { useTranslation } from 'react-i18next'
import { AUTH_ROUTES, CUSTOMER_ROUTES, USER_ROLES, UI_TRANSITIONS } from '~/utils/constants'
import { cn } from '~/lib/utils'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { notify } from '~/utils/notifications'
import { authApi } from '~/apis/auth/authApi'
import { setSession } from '~/redux/auth/authSlice'
import AuthForm from '../components/AuthForm'
import AuthHeading from '../components/AuthHeading'
import AuthSwitchLink from '../components/AuthSwitchLink'
import { loginSchema } from '../authSchemas'
import { useCallback } from 'react'
import GoogleSignInButton from './components/GoogleSignInButton'
import AuthBrand from '../components/AuthBrand'
import { getRoleHome } from '~/utils/roles'

const fields = [
  {
    name: 'email',
    label: 'common.email',
    type: 'email',
    placeholder: 'ban@example.com',
    autoComplete: 'username'
  },
  {
    name: 'password',
    label: 'auth.password',
    type: 'password',
    placeholder: 'auth.enterYourPassword',
    autoComplete: 'current-password'
  }
]

export default function LoginPage() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const auth = useSelector((state) => state.auth)
  const { state } = useLocation()
  const paymentReturn = auth.user?.role === USER_ROLES.CUSTOMER && typeof state?.paymentReturn === 'string'
    && (state.paymentReturn === CUSTOMER_ROUTES.PAYMENT_RETURN || state.paymentReturn.startsWith(`${CUSTOMER_ROUTES.PAYMENT_RETURN}?`))
    ? state.paymentReturn : null
  const completeLogin = useCallback((data) => {
    if (!getRoleHome(data.user?.role)) {
      throw new Error('auth.yourAccountDoesNotHaveASupportedRolePlease')
    }
    dispatch(setSession(data))
    notify.success('auth.signedInSuccessfully')
  }, [dispatch])

  if (auth.accessToken) {
    return (
      <Navigate
        to={paymentReturn || getRoleHome(auth.user?.role) || AUTH_ROUTES.ACCOUNT}
        replace
      />
    )
  }

  const login = async (values) => {
    const data = await authApi.login(values)
    completeLogin(data)
  }

  return (
    <>
      <div className="mb-7 md:hidden">
        <AuthBrand />
      </div>
      <AuthHeading
        title={t('auth.signIn')}
        className="text-center"
      >
        {t('auth.signInDescription')}
      </AuthHeading>
      <AuthForm
        schema={loginSchema}
        onSubmit={login}
        submitLabel={t('auth.signIn')}
        fields={fields}
      >
        <div className="mb-6 flex justify-end text-sm">
          <Link
            to={AUTH_ROUTES.FORGOT_PASSWORD}
            className={cn(
              'cursor-pointer font-semibold text-blue-700 underline decoration-transparent underline-offset-4 hover:text-blue-800 hover:decoration-current dark:text-blue-300 dark:hover:text-blue-200',
              UI_TRANSITIONS.LINK
            )}
          >
            {t('auth.forgotPasswordTitle')}
          </Link>
        </div>
      </AuthForm>
      <GoogleSignInButton onSuccess={completeLogin} />
      <AuthSwitchLink
        to={AUTH_ROUTES.REGISTER}
        prompt={t('auth.donTHaveAnAccount')}
      >
        {t('auth.registerNow')}
      </AuthSwitchLink>
    </>
  )
}
