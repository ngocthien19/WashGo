import { useTranslation } from 'react-i18next'
import { CUSTOMER_ROUTES } from '~/utils/config/constants'
import Brand from '~/components/Brand/Brand'

export default function AuthBrand() {
  const { t } = useTranslation()
  return (
    <Brand
      to={CUSTOMER_ROUTES.HOME}
      label={t('customer.washgoHome')}
    />
  )
}
