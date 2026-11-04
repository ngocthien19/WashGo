import { useTranslation } from 'react-i18next'
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
    label: 'auth.yourEmail',
    type: 'email',
    placeholder: 'ban@example.com',
    autoComplete: 'email'
  }
]

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
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
        title={t('auth.forgotPasswordTitle')}
        centered
      >
        {t('auth.enterYourRegisteredEmailToReceiveAPasswordReset')}
      </AuthHeading>
      <AuthForm
        schema={forgotPasswordSchema}
        onSubmit={sendOtp}
        submitLabel={t('auth.sendOtp')}
        fields={fields}
      />
      <AuthBackLink to={AUTH_ROUTES.LOGIN}>
        {t('auth.backToSignIn')}
      </AuthBackLink>
    </>
  )
}
