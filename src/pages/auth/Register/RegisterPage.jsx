import { AUTH_ROUTES, AUTH_LIMITS, OTP_PURPOSE, PASSWORD_REQUIREMENTS_HINT } from '~/utils/constants'
import { normalizePhone } from '~/utils/formats'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { authApi } from '~/apis/auth/authApi'
import AuthForm from '../components/AuthForm'
import AuthHeading from '../components/AuthHeading'
import AuthSwitchLink from '../components/AuthSwitchLink'
import { registerSchema } from '../authSchemas'
import AuthBrand from '../components/AuthBrand'

const fields = [
  {
    name: 'fullName',
    label: 'Họ và tên',
    placeholder: 'Nguyễn Văn An',
    autoComplete: 'name',
    maxLength: AUTH_LIMITS.NAME_MAX
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    placeholder: 'ban@example.com',
    autoComplete: 'email'
  },
  {
    name: 'phone',
    label: 'Số điện thoại',
    type: 'tel',
    placeholder: '0901 234 567',
    autoComplete: 'tel'
  },
  {
    name: 'password',
    label: 'Mật khẩu',
    type: 'password',
    placeholder: 'Tạo mật khẩu của bạn',
    autoComplete: 'new-password',
    hint: PASSWORD_REQUIREMENTS_HINT
  },
  {
    name: 'confirmPassword',
    label: 'Xác nhận mật khẩu',
    type: 'password',
    placeholder: 'Nhập lại mật khẩu',
    autoComplete: 'new-password'
  }
]

export default function RegisterPage() {
  const { setFlow } = useOutletContext()
  const navigate = useNavigate()

  const register = async (values) => {
    const registration = { ...values, phone: normalizePhone(values.phone) }
    await authApi.sendOtp({ ...registration, purpose: OTP_PURPOSE.REGISTER })
    setFlow({
      email: values.email,
      purpose: OTP_PURPOSE.REGISTER,
      registration,
      sentAt: Date.now()
    })
    navigate(AUTH_ROUTES.VERIFY_OTP)
  }

  return (
    <>
      <div className="mb-7 md:hidden">
        <AuthBrand />
      </div>
      <AuthHeading
        title="Tạo tài khoản"
        className="text-center"
      />
      <AuthForm
        schema={registerSchema}
        onSubmit={register}
        submitLabel="Đăng ký & nhận mã OTP"
        fields={fields}
      />
      <AuthSwitchLink
        to={AUTH_ROUTES.LOGIN}
        prompt="Đã có tài khoản?"
      >
        Đăng nhập
      </AuthSwitchLink>
    </>
  )
}
