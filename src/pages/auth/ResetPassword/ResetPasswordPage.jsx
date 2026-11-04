import { useTranslation } from 'react-i18next'
import { AUTH_ROUTES, OTP_PURPOSE, PASSWORD_REQUIREMENTS_HINT } from '~/utils/constants'
import { Navigate, useNavigate, useOutletContext } from 'react-router-dom'
import { LockKeyhole } from 'lucide-react'
import { notify } from '~/utils/notifications'
import { authApi } from '~/apis/auth/authApi'
import AuthForm from '../components/AuthForm'
import AuthHeading from '../components/AuthHeading'
import { resetPasswordSchema } from '../authSchemas'

const fields = [
  {
    name: 'newPassword',
    label: 'auth.newPassword',
    type: 'password',
    placeholder: 'auth.enterYourNewPassword',
    autoComplete: 'new-password',
    hint: PASSWORD_REQUIREMENTS_HINT
  },
  {
    name: 'confirmNewPassword',
    label: 'auth.confirmNewPassword',
    type: 'password',
    placeholder: 'auth.enterYourNewPasswordAgain',
    autoComplete: 'new-password'
  }
]

export default function ResetPasswordPage() {
  const { t } = useTranslation()
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
  if (!flow?.verificationToken || flow.purpose !== OTP_PURPOSE.FORGOT_PASSWORD) {
    return (
      <Navigate
        to={AUTH_ROUTES.FORGOT_PASSWORD}
        replace
      />
    )
  }

  const reset = async (values) => {
    await authApi.resetPassword({ email: flow.email, verificationToken: flow.verificationToken, ...values })
    setFlow({ completed: true })
    notify.success('auth.passwordResetSuccessfullyPleaseSignInWithYourNew')
    navigate(AUTH_ROUTES.LOGIN, { replace: true })
  }

  return (
    <>
      <AuthHeading
        icon={LockKeyhole}
        title={t('auth.resetPassword')}
        centered
      >
        {t('auth.createANewPasswordToProtectYourAccount')}
        <br />
        <strong className="break-words font-semibold text-foreground">
          {flow.email}
        </strong>
      </AuthHeading>
      <AuthForm
        schema={resetPasswordSchema}
        onSubmit={reset}
        submitLabel={t('auth.saveNewPassword')}
        fields={fields}
      />
    </>
  )
}
