import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, Outlet } from 'react-router-dom'
import { authApi } from '~/apis/auth/authApi'
import { setUser, clearSession } from '~/redux/auth/authSlice'
import { AUTH_ROUTES } from '~/utils/constants'
import { getRoleHome, normalizeRole } from '~/utils/roles'
import { getApiError } from '~/utils/apiError'
import LoadingScreen from '~/components/LoadingScreen/LoadingScreen'
import { Button } from '~/components/ui/button'
import FormError from '~/components/ui/FormError'

export default function ProtectedRoleRoute({ role }) {
  const dispatch = useDispatch()
  const auth = useSelector((state) => state.auth)
  const hasSession = !!auth.accessToken
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
    return (
      <Navigate
        to={AUTH_ROUTES.LOGIN}
        replace
      />
    )
  }
  if (error || (profile && !getRoleHome(profile.role))) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background p-6">
        <div className="w-full max-w-md space-y-3">
          <FormError>
            {error || 'Vai trò tài khoản chưa được hỗ trợ. Vui lòng liên hệ quản trị viên.'}
          </FormError>
          <Button
            className="w-full"
            onClick={() => {
              setError('')
              setAttempt((value) => value + 1)
            }}
          >
            Thử lại
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => dispatch(clearSession())}
          >
            Trở về đăng nhập
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
