import { AUTH_ROUTES, OTP_PURPOSE } from '~/utils/constants'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { LockKeyholeOpen } from 'lucide-react'
import { authApi } from '~/apis/auth/authApi'
import AuthForm from '../components/AuthForm'
import AuthHeading from '../components/AuthHeading'
import AuthBackLink from '../components/AuthBackLink'
import { forgotPasswordSchema } from '../authSchemas'

const fields = [
  {
    name: 'email',
    label: 'Email của bạn',
    type: 'email',
    placeholder: 'ban@example.com',
    autoComplete: 'email'
  }
]

export default function ForgotPasswordPage() {
  const { setFlow } = useOutletContext()
  const navigate = useNavigate()

  const sendOtp = async ({ email }) => {
    await authApi.sendOtp({ email, purpose: OTP_PURPOSE.FORGOT_PASSWORD })
    setFlow({ email, purpose: OTP_PURPOSE.FORGOT_PASSWORD, sentAt: Date.now() })
    navigate(AUTH_ROUTES.VERIFY_OTP)
  }

  return (
    <>
      <AuthHeading
        icon={LockKeyholeOpen}
        title="Quên mật khẩu?"
        centered
      >
        Nhập email đã đăng ký để nhận mã OTP đặt lại mật khẩu.
      </AuthHeading>
      <AuthForm
        schema={forgotPasswordSchema}
        onSubmit={sendOtp}
        submitLabel="Gửi OTP"
        fields={fields}
      />
      <AuthBackLink to={AUTH_ROUTES.LOGIN}>
        Quay lại đăng nhập
      </AuthBackLink>
    </>
  )
}
