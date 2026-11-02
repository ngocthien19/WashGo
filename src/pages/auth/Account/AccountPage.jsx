import { AUTH_ROUTES } from '~/utils/constants'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import { CircleCheck, LogOut } from 'lucide-react'
import { authApi } from '~/apis/auth/authApi'
import { clearSession, setUser } from '~/redux/auth/authSlice'
import { getApiError } from '~/utils/apiError'
import { Button } from '~/components/ui/button'
import FormError from '~/components/ui/FormError'
import AuthHeading from '../components/AuthHeading'
import { getRoleHome } from '~/utils/roles'

export default function AccountPage() {
  const auth = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const hasSession = !!auth.accessToken

  useEffect(() => {
    let active = true
    if (!hasSession) {
      return
    }

    authApi.getMe()
      .then((user) => {
        if (active) {
          dispatch(setUser(user))
          setStatus('ready')
        }
      })
      .catch((err) => {
        if (active) {
          setError(getApiError(err))
          setStatus('error')
        }
      })

    return () => {
      active = false
    }
  }, [dispatch, hasSession])

  if (!hasSession) {
    return (
      <Navigate
        to={AUTH_ROUTES.LOGIN}
        replace
      />
    )
  }
  if (status === 'ready' && getRoleHome(auth.user?.role)) {
    return (
      <Navigate
        to={getRoleHome(auth.user.role)}
        replace
      />
    )
  }

  const logout = async () => {
    setLoggingOut(true)
    setError('')
    try {
      await authApi.logout(auth.refreshToken)
      dispatch(clearSession())
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setLoggingOut(false)
    }
  }

  const description = status === 'loading'
    ? 'Đang kiểm tra phiên đăng nhập...'
    : status === 'ready'
      ? 'Bạn đã đăng nhập thành công.'
      : 'Chưa thể tải thông tin tài khoản.'

  return (
    <>
      <AuthHeading
        icon={CircleCheck}
        eyebrow="TÀI KHOẢN WASHGO"
        title={`Chào ${auth.user?.fullName || 'bạn'}!`}
        success
      >
        {description}
      </AuthHeading>
      <dl className="mb-6 mt-4 text-sm">
        <div className="flex justify-between gap-4 border-b border-border py-3">
          <dt className="text-muted-foreground">Email</dt>
          <dd className="min-w-0 break-words text-right">
            {auth.user?.email}
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-border py-3">
          <dt className="text-muted-foreground">Vai trò</dt>
          <dd className="text-right">
            {auth.user?.role}
          </dd>
        </div>
      </dl>
      <p className="mb-4 text-xs leading-6 text-muted-foreground">
        Trang chức năng cho từng vai trò sẽ được bổ sung trong các phần tiếp theo.
      </p>
      <FormError>
        {error}
      </FormError>
      <Button
        type="button"
        size="lg"
        className="min-h-12 w-full gap-2 rounded-lg"
        disabled={loggingOut}
        onClick={logout}
      >
        <LogOut size={18} />
        {loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
      </Button>
    </>
  )
}
