import { useTranslation } from 'react-i18next'
import { AUTH_ROUTES, OTP_PURPOSE, OTP_CONFIG } from '~/utils/config/constants'
import { formatCountdown } from '~/utils/format/formats'
import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useOutletContext } from 'react-router-dom'
import { ShieldHalf, RotateCw } from 'lucide-react'
import { Controller } from 'react-hook-form'
import { notify } from '~/utils/notifications/notifications'
import { authApi } from '~/apis/auth/authApi'
import { getApiError } from '~/utils/http/apiError'
import { Button } from '~/components/ui/button'
import FormError from '~/components/ui/FormError'
import AuthForm from '../components/AuthForm'
import AuthHeading from '../components/AuthHeading'
import AuthBackLink from '../components/AuthBackLink'
import { otpSchema } from '../authSchemas'
import OtpInput from '~/components/ui/OtpInput'

export default function VerifyOtpPage() {
  const { t } = useTranslation()
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
  const resendLabel = resending ? t('auth.sending') : cooldown ? t('auth.resendInS', { cooldown: cooldown }) : t('auth.resendCode')

  const verify = async ({ code }) => {
    setVerifying(true)
    try {
      if (!remaining) {
        throw new Error('auth.theOtpHasExpiredPleaseRequestANewCode')
      }
      if (!isRegister) {
        const result = await authApi.verifyOtp({ email: flow.email, code, purpose: flow.purpose })
        if (result?.verified !== true) {
          throw new Error('auth.theOtpIsIncorrectOrHasExpiredPleaseTry')
        }
        if (!result.verificationToken) {
          throw new Error('auth.theSystemDidNotReturnAPasswordResetVerification')
        }

        setFlow({ ...flow, verificationToken: result.verificationToken })
        navigate(AUTH_ROUTES.RESET_PASSWORD)
        return
      }

      const verified = flow.verificationToken
        ? { verified: true, verificationToken: flow.verificationToken }
        : await authApi.verifyOtp({ email: flow.email, code, purpose: flow.purpose })

      if (!verified.verified || !verified.verificationToken) {
        throw new Error('auth.unableToVerifyYourEmailYetPleaseTryAgain')
      }

      setFlow({ ...flow, verificationToken: verified.verificationToken })
      await authApi.register({ ...flow.registration, verificationToken: verified.verificationToken })
      setFlow({ completed: true })
      notify.success('auth.registrationSuccessfulPleaseSignIn')
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
      setFlow({ ...flow, sentAt: Date.now(), verificationToken: null })
      setNow(Date.now())
      setFormVersion((version) => version + 1)
      notify.success('auth.aNewOtpHasBeenSentPleaseCheckYour')
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
        title={t('auth.verifyOtp')}
        centered
      >
        {t('auth.enterTheDigitCodeSentTo', { CODE_LENGTH: OTP_CONFIG.CODE_LENGTH })}
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
        submitLabel={isRegister ? t('auth.confirm') : t('auth.continue')}
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
              {t('auth.codeExpiresIn')}
              {' '}
              <strong className="text-foreground">
                {remainingTime}
              </strong>
            </>
          ) : t('auth.theCodeHasExpiredPleaseRequestANewOne')}
        </p>
        <div className="mb-6 mt-1 flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-blue-700 dark:text-blue-300"
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
        {t('auth.changeEmailAddress')}
      </AuthBackLink>
      <AuthBackLink to={AUTH_ROUTES.LOGIN}>
        {t('auth.backToSignIn')}
      </AuthBackLink>
      <p className="mt-4 text-center text-xs leading-6 text-muted-foreground">
        {t('auth.checkYourSpamFolderIfYouCannotFindThe')}
      </p>
    </>
  )
}
