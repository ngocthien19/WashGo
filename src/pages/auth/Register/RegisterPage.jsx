import { useTranslation } from 'react-i18next'
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
    label: 'auth.fullName',
    placeholder: 'auth.alexNguyen',
    autoComplete: 'name',
    maxLength: AUTH_LIMITS.NAME_MAX
  },
  {
    name: 'email',
    label: 'common.email',
    type: 'email',
    placeholder: 'ban@example.com',
    autoComplete: 'email'
  },
  {
    name: 'phone',
    label: 'auth.phoneNumber',
    type: 'tel',
    placeholder: '0901 234 567',
    autoComplete: 'tel'
  },
  {
    name: 'password',
    label: 'auth.password',
    type: 'password',
    placeholder: 'auth.createYourPassword',
    autoComplete: 'new-password',
    hint: PASSWORD_REQUIREMENTS_HINT
  },
  {
    name: 'confirmPassword',
    label: 'auth.confirmPassword',
    type: 'password',
    placeholder: 'auth.enterYourPasswordAgain',
    autoComplete: 'new-password'
  }
]

export default function RegisterPage() {
  const { t } = useTranslation()
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
        title={t('auth.createAnAccount')}
        className="text-center"
      >
        {t('auth.createAccountDescription')}
      </AuthHeading>
      <AuthForm
        schema={registerSchema}
        onSubmit={register}
        submitLabel={t('auth.registerReceiveOtp')}
        fields={fields}
      />
      <AuthSwitchLink
        to={AUTH_ROUTES.LOGIN}
        prompt={t('auth.alreadyHaveAnAccount')}
      >
        {t('auth.signIn')}
      </AuthSwitchLink>
    </>
  )
}
