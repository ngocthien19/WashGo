import { useTranslation } from 'react-i18next'
import RoleHome from '~/components/RoleHome/RoleHome'

export default function HomePage() {
  const { t } = useTranslation()
  return (
    <RoleHome
      title={t('common.shipperHome')}
      description={t('common.workspaceForWashgoDeliveryStaff')}
    />
  )
}
