import { useTranslation } from 'react-i18next'
import { AUTH_ROUTES } from '~/utils/config/constants'
import Brand from '~/components/Brand/Brand'

export default function AuthBrand() {
  const { t } = useTranslation()
  return (
    <Brand
      to={AUTH_ROUTES.LOGIN}
      label={t('auth.washgoSignIn')}
    />
  )
}
