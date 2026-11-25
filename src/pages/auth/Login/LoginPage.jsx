import { safePaymentReturn } from '~/pages/customer/Payment/paymentOutcome'
import { useTranslation } from 'react-i18next'
import { AUTH_ROUTES, CUSTOMER_ROUTES, USER_ROLES, UI_TRANSITIONS } from '~/utils/config/constants'
import { cn } from '~/lib/utils'
import { Link, Navigate, matchPath, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { notify } from '~/utils/notifications/notifications'
import { authApi } from '~/apis/auth/authApi'
import { setSession, clearSession } from '~/redux/auth/authSlice'
import AuthForm from '../components/AuthForm'
import AuthHeading from '../components/AuthHeading'
import AuthSwitchLink from '../components/AuthSwitchLink'
import { loginSchema } from '../authSchemas'
import { useCallback, useEffect, useState } from 'react'
import GoogleSignInButton from './components/GoogleSignInButton'
import { getRoleHome } from '~/utils/auth/roles'
import { accountAccessIssue, accountAccessReason } from '~/utils/auth/accountAccess'
import SessionEndedDialog from './components/SessionEndedDialog'

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
  const navigate = useNavigate()
  const auth = useSelector((state) => state.auth)
  const [loginIssue, setLoginIssue] = useState(null)
  const [loginReason, setLoginReason] = useState(null)
  const [loginDialogOpen, setLoginDialogOpen] = useState(false)
  const accessIssue = loginIssue || auth.notice
  const { state } = useLocation()
  useEffect(() => {
    if (!auth.accessToken && !accessIssue && state?.loginRequired) {
      notify.info('auth.signInToContinue', undefined, { id: 'sign-in-required' })
    }
  }, [auth.accessToken, accessIssue, state?.loginRequired])
  const returnTo = auth.user?.role === USER_ROLES.CUSTOMER && typeof state?.returnTo === 'string'
    && Object.values(CUSTOMER_ROUTES).some(path => matchPath({ path, end: true }, state.returnTo.split(/[?#]/)[0]))
    && !state.returnTo.includes('\\')
    ? state.returnTo : null
  const paymentReturn = auth.user?.role === USER_ROLES.CUSTOMER
    ? safePaymentReturn(state?.paymentReturn) || (typeof state?.paymentReturn === 'string'
      && (state.paymentReturn === CUSTOMER_ROUTES.PAYMENT_RETURN || state.paymentReturn.startsWith(`${CUSTOMER_ROUTES.PAYMENT_RETURN}?`))
      ? state.paymentReturn : null)
    : null
  const completeLogin = useCallback((data) => {
    if (!getRoleHome(data.user?.role)) {
      throw new Error('auth.yourAccountDoesNotHaveASupportedRolePlease')
    }
    dispatch(setSession(data))
    notify.success('auth.signedInSuccessfully')
  }, [dispatch])

  const handleGoogleError = useCallback(error => {
    const issue = accountAccessIssue(error)
    setLoginIssue(issue)
    setLoginReason(accountAccessReason(error))
    setLoginDialogOpen(Boolean(issue))
    if (auth.notice) {
      dispatch(clearSession())
    }
    return Boolean(issue)
  }, [auth.notice, dispatch])

  if (auth.accessToken) {
    return (
      <Navigate
        to={paymentReturn || returnTo || getRoleHome(auth.user?.role) || AUTH_ROUTES.ACCOUNT}
        replace
      />
    )
  }

  const login = async (values) => {
    setLoginIssue(null)
    setLoginReason(null)
    setLoginDialogOpen(false)
    if (auth.notice) {
      dispatch(clearSession())
    }
    try {
      const data = await authApi.login(values)
      completeLogin(data)
    } catch (error) {
      const issue = accountAccessIssue(error)
      if (!issue) {
        throw error
      }
      setLoginIssue(issue)
      setLoginReason(accountAccessReason(error))
      setLoginDialogOpen(true)
    }
  }

  return (
    <>
      <AuthHeading
        title={t('auth.signIn')}
        className="text-center"
      >
        {t('auth.signInDescription')}
      </AuthHeading>
      <SessionEndedDialog
        issue={auth.notice || (loginDialogOpen ? loginIssue : null)}
        reason={auth.notice ? auth.noticeReason : loginReason}
        onClose={() => {
          setLoginDialogOpen(false)
          setLoginIssue(null)
          setLoginReason(null)
          dispatch(clearSession())
        }}
        onHome={() => {
          setLoginDialogOpen(false)
          setLoginIssue(null)
          setLoginReason(null)
          dispatch(clearSession())
          navigate(CUSTOMER_ROUTES.HOME, { replace: true })
        }}
      />
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
      <GoogleSignInButton
        onSuccess={completeLogin}
        onError={handleGoogleError}
      />
      <AuthSwitchLink
        to={AUTH_ROUTES.REGISTER}
        prompt={t('auth.donTHaveAnAccount')}
      >
        {t('auth.registerNow')}
      </AuthSwitchLink>
    </>
  )
}
