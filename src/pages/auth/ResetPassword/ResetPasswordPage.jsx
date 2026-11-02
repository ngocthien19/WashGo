import { AUTH_ROUTES, OTP_PURPOSE, OTP_CONFIG, PASSWORD_REQUIREMENTS_HINT } from '~/utils/constants'
import { Navigate, useNavigate, useOutletContext } from 'react-router-dom'
import { LockKeyhole } from 'lucide-react'
import { toast } from 'react-toastify'
import { authApi } from '~/apis/auth/authApi'
import AuthForm from '../components/AuthForm'
import AuthHeading from '../components/AuthHeading'
import AuthBackLink from '../components/AuthBackLink'
import { resetPasswordSchema } from '../authSchemas'

const fields = [
  {
    name: 'newPassword',
    label: 'Mật khẩu mới',
    type: 'password',
    placeholder: 'Nhập mật khẩu mới',
    autoComplete: 'new-password',
    hint: PASSWORD_REQUIREMENTS_HINT
  },
  {
    name: 'confirmNewPassword',
    label: 'Xác nhận mật khẩu mới',
    type: 'password',
    placeholder: 'Nhập lại mật khẩu mới',
    autoComplete: 'new-password'
  }
]

export default function ResetPasswordPage() {
  const { flow, setFlow } = useOutletContext()
  const navigate = useNavigate()

  if (flow?.completed) {
    return (
      <Navigate
        to={AUTH_ROUTES.LOGIN}
        replace
      />
    )
  }
  if (!flow?.code || flow.purpose !== OTP_PURPOSE.FORGOT_PASSWORD) {
    return (
      <Navigate
        to={AUTH_ROUTES.FORGOT_PASSWORD}
        replace
      />
    )
  }

  const reset = async (values) => {
    await authApi.resetPassword({ email: flow.email, code: flow.code, ...values })
    setFlow({ completed: true })
    toast.success('Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.')
    navigate(AUTH_ROUTES.LOGIN, { replace: true })
  }

  return (
    <>
      <AuthHeading
        icon={LockKeyhole}
        title="Đặt lại mật khẩu"
        centered
      >
        Tạo mật khẩu mới để bảo vệ tài khoản
        <br />
        <strong className="break-words font-semibold text-foreground">
          {flow.email}
        </strong>
      </AuthHeading>
      <AuthForm
        schema={resetPasswordSchema}
        onSubmit={reset}
        submitLabel="Xác thực OTP & lưu mật khẩu"
        fields={fields}
      />
      <p className="mt-4 text-center text-xs leading-6 text-muted-foreground">
        {`Mã OTP có hiệu lực ${OTP_CONFIG.VALIDITY_MS / 60000} phút kể từ lúc gửi. Nếu mã hết hạn, hãy quay lại để nhận mã mới.`}
      </p>
      <AuthBackLink to={AUTH_ROUTES.VERIFY_OTP}>
        Nhập lại mã OTP
      </AuthBackLink>
    </>
  )
}
