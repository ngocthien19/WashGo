import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { authApi } from '~/apis/auth/authApi'
import { setUser, clearSession } from '~/redux/auth/authSlice'
import { AUTH_ROUTES, CUSTOMER_ROUTES } from '~/utils/config/constants'
import { getRoleHome, normalizeRole } from '~/utils/auth/roles'
import { getApiError } from '~/utils/http/apiError'
import LoadingScreen from '~/components/LoadingScreen/LoadingScreen'
import { Button } from '~/components/ui/button'
import FormError from '~/components/ui/FormError'

export default function ProtectedRoleRoute({ role, allowGuestPaths = [] }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const location = useLocation()
  const auth = useSelector((state) => state.auth)
  const hasSession = !!auth.accessToken
  // Keep the session that opened this route until logout has reached Home.
  const [sessionRoute, setSessionRoute] = useState({ key: location.key, hasSession })
  if (sessionRoute.key !== location.key || hasSession && !sessionRoute.hasSession) {
    setSessionRoute({ key: location.key, hasSession })
  }
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!hasSession) {
      return
    }
    let active = true
    authApi.getMe().then((user) => {
      if (active) {
        dispatch(setUser(user))
        setProfile(user)
      }
    }).catch((err) => {
      if (active) {
        setError(getApiError(err))
      }
    })
    return () => {
      active = false
    }
  }, [hasSession, dispatch, attempt])

  if (!hasSession) {
    if (auth.signedOut && sessionRoute.hasSession) {
      return (
        <Navigate
          to={CUSTOMER_ROUTES.HOME}
          replace
        />
      )
    }
    if (allowGuestPaths.includes(location.pathname)) {
      return <Outlet />
    }
    return (
      <Navigate
        to={AUTH_ROUTES.LOGIN}
        state={location.pathname === CUSTOMER_ROUTES.PAYMENT_RETURN
          ? { paymentReturn: `${location.pathname}${location.search}`, loginRequired: true }
          : allowGuestPaths.length ? { returnTo: `${location.pathname}${location.search}`, loginRequired: true } : undefined}
        replace
      />
    )
  }
  if (error || (profile && !getRoleHome(profile.role))) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background p-6">
        <div className="w-full max-w-md space-y-3">
          <FormError>
            {error || t('common.yourAccountRoleIsNotSupportedPleaseContactAn')}
          </FormError>
          <Button
            className="w-full"
            onClick={() => {
              setError('')
              setAttempt((value) => value + 1)
            }}
          >
            {t('common.tryAgain')}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => dispatch(clearSession())}
          >
            {t('common.backToSignIn')}
          </Button>
        </div>
      </main>
    )
  }
  if (!profile) {
    return <LoadingScreen />
  }
  if (normalizeRole(profile.role) !== role) {
    return (
      <Navigate
        to={getRoleHome(profile.role)}
        replace
      />
    )
  }

  return <Outlet />
}
