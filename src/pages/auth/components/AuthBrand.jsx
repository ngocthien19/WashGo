import { useTranslation } from 'react-i18next'
import { AUTH_ROUTES } from '~/utils/constants'
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
