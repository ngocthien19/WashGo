import { useTranslation } from 'react-i18next'
import RoleHome from '~/components/RoleHome/RoleHome'
import NotificationNavigation from '~/layouts/shipper/NotificationNavigation'

export default function HomePage() {
  const { t } = useTranslation()
  return (
    <RoleHome
      actions={<NotificationNavigation />}
      title={t('common.shipperHome')}
      description={t('common.workspaceForWashgoDeliveryStaff')}
    />
  )
}
