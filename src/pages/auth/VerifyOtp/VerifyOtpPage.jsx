import { AUTH_ROUTES, OTP_PURPOSE, OTP_CONFIG } from '~/utils/constants'
import { formatCountdown } from '~/utils/formats'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useOutletContext } from 'react-router-dom'
import { ShieldHalf, RotateCw } from 'lucide-react'
import { Controller } from 'react-hook-form'
import { toast } from 'react-toastify'
import { authApi } from '~/apis/auth/authApi'
import { getApiError } from '~/utils/apiError'
import { Button } from '~/components/ui/button'
import FormError from '~/components/ui/FormError'
import AuthForm from '../components/AuthForm'
import AuthHeading from '../components/AuthHeading'
import AuthBackLink from '../components/AuthBackLink'
import { otpSchema } from '../authSchemas'
import OtpInput from '~/components/ui/OtpInput'

export default function VerifyOtpPage() {
  const { flow, setFlow } = useOutletContext()
  const navigate = useNavigate()
  const [now, setNow] = useState(Date.now)
  const [resending, setResending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [resendError, setResendError] = useState('')
  const [formVersion, setFormVersion] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (flow?.completed) {
    return (
      <Navigate
        to={AUTH_ROUTES.LOGIN}
        replace
      />
    )
  }
  if (!flow) {
    return (
      <Navigate
        to={AUTH_ROUTES.FORGOT_PASSWORD}
        replace
      />
    )
  }

  const isRegister = flow.purpose === OTP_PURPOSE.REGISTER
  const remaining = Math.max(0, Math.ceil((flow.sentAt + OTP_CONFIG.VALIDITY_MS - now) / 1000))
  const cooldown = Math.max(0, Math.ceil((flow.sentAt + OTP_CONFIG.RESEND_DELAY_MS - now) / 1000))
  const remainingTime = formatCountdown(remaining)
  const resendLabel = resending ? 'Đang gửi...' : cooldown ? `Gửi lại sau ${cooldown}s` : 'Gửi lại mã'

  const verify = async ({ code }) => {
    setVerifying(true)
    try {
      if (!remaining) {
        throw new Error('Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.')
      }
      if (!isRegister) {
        // reset-password verifies and consumes the code; verifying here would consume it twice.
        setFlow({ ...flow, code })
        navigate(AUTH_ROUTES.RESET_PASSWORD)
        return
      }

      const verified = flow.verificationToken
        ? { verified: true, verificationToken: flow.verificationToken }
        : await authApi.verifyOtp({ email: flow.email, code, purpose: flow.purpose })

      if (!verified.verified || !verified.verificationToken) {
        throw new Error('Chưa thể xác minh email. Vui lòng thử lại.')
      }

      setFlow({ ...flow, verificationToken: verified.verificationToken })
      await authApi.register({ ...flow.registration, verificationToken: verified.verificationToken })
      setFlow({ completed: true })
      toast.success('Đăng ký thành công! Vui lòng đăng nhập.')
      navigate(AUTH_ROUTES.LOGIN, { replace: true })
    } finally {
      setVerifying(false)
    }
  }

  const resend = async () => {
    setResending(true)
    setResendError('')
    try {
      await authApi.sendOtp({ ...flow.registration, email: flow.email, purpose: flow.purpose })
      setFlow({ ...flow, sentAt: Date.now(), verificationToken: null, code: null })
      setNow(Date.now())
      setFormVersion((version) => version + 1)
      toast.success('Đã gửi lại mã OTP. Vui lòng kiểm tra email.')
    } catch (error) {
      setResendError(getApiError(error))
    } finally {
      setResending(false)
    }
  }

  return (
    <>
      <AuthHeading
        icon={ShieldHalf}
        title="Xác nhận mã OTP"
        centered
      >
        {`Nhập mã ${OTP_CONFIG.CODE_LENGTH} chữ số được gửi đến`}
        <br />
        <strong className="break-words font-semibold text-foreground">
          {flow.email}
        </strong>
      </AuthHeading>
      <AuthForm
        key={formVersion}
        schema={otpSchema}
        onSubmit={verify}
        disabled={resending || !remaining}
        submitLabel={isRegister ? 'Xác nhận' : 'Tiếp tục'}
        defaultValues={{ code: '' }}
        renderFields={({ control, errors }) => (
          <Controller
            name="code"
            control={control}
            render={({ field }) => (
              <OtpInput
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                error={errors.code}
              />
            )}
          />
        )}
      >
        <p
          className="text-center text-xs text-muted-foreground"
          data-testid="otp-expiry"
        >
          {remaining ? (
            <>
              Mã hết hạn sau
              {' '}
              <strong className="text-foreground">
                {remainingTime}
              </strong>
            </>
          ) : 'Mã đã hết hạn. Vui lòng gửi lại mã mới.'}
        </p>
        <div className="mb-6 mt-1 flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-orange-700 dark:text-orange-300"
            disabled={cooldown > 0 || resending || verifying}
            onClick={resend}
            data-testid="resend-otp"
          >
            <RotateCw
              size={14}
              className={resending ? 'animate-spin motion-reduce:animate-none' : ''}
            />
            {resendLabel}
          </Button>
        </div>
      </AuthForm>
      <FormError>
        {resendError}
      </FormError>
      <AuthBackLink to={isRegister ? AUTH_ROUTES.REGISTER : AUTH_ROUTES.FORGOT_PASSWORD}>
        Thay đổi địa chỉ email
      </AuthBackLink>
      <AuthBackLink to={AUTH_ROUTES.LOGIN}>
        Quay lại đăng nhập
      </AuthBackLink>
      {!isRegister && (
        <p className="mt-4 text-center text-xs leading-6 text-muted-foreground">
          Mã OTP sẽ được xác thực khi bạn lưu mật khẩu mới ở bước tiếp theo.
        </p>
      )}
      <p className="mt-4 text-center text-xs leading-6 text-muted-foreground">
        Kiểm tra cả thư mục Spam nếu bạn chưa thấy email từ WashGo.
      </p>
    </>
  )
}
