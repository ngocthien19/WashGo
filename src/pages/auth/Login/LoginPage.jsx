import { AUTH_ROUTES, UI_TRANSITIONS } from '~/utils/constants'
import { cn } from '~/lib/utils'
import { Link, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'react-toastify'
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
    label: 'Email',
    type: 'email',
    placeholder: 'ban@example.com',
    autoComplete: 'username'
  },
  {
    name: 'password',
    label: 'Mật khẩu',
    type: 'password',
    placeholder: 'Nhập mật khẩu của bạn',
    autoComplete: 'current-password'
  }
]

export default function LoginPage() {
  const dispatch = useDispatch()
  const auth = useSelector((state) => state.auth)
  const completeLogin = useCallback((data) => {
    if (!getRoleHome(data.user?.role)) {
      throw new Error('Tài khoản chưa được cấp vai trò hỗ trợ. Vui lòng liên hệ quản trị viên.')
    }
    dispatch(setSession(data))
    toast.success('Đăng nhập thành công!')
  }, [dispatch])

  if (auth.accessToken) {
    return (
      <Navigate
        to={getRoleHome(auth.user?.role) || AUTH_ROUTES.ACCOUNT}
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
        title="Đăng nhập"
        className="text-center"
      />
      <AuthForm
        schema={loginSchema}
        onSubmit={login}
        submitLabel="Đăng nhập"
        fields={fields}
      >
        <div className="mb-6 flex justify-end text-xs">
          <Link
            to={AUTH_ROUTES.FORGOT_PASSWORD}
            className={cn(
              'cursor-pointer font-semibold text-orange-700 underline decoration-transparent underline-offset-4 hover:text-orange-800 hover:decoration-current dark:text-orange-300 dark:hover:text-orange-200',
              UI_TRANSITIONS.LINK
            )}
          >
            Quên mật khẩu?
          </Link>
        </div>
      </AuthForm>
      <GoogleSignInButton onSuccess={completeLogin} />
      <AuthSwitchLink
        to={AUTH_ROUTES.REGISTER}
        prompt="Chưa có tài khoản?"
      >
        Đăng ký ngay
      </AuthSwitchLink>
    </>
  )
}
