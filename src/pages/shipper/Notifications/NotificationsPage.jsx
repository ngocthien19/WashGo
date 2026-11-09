import { useTranslation } from 'react-i18next'
import RoleHome from '~/components/RoleHome/RoleHome'
import NotificationCenter from '~/components/notifications/NotificationCenter'
import { notificationTypesFor } from '~/components/notifications/notificationCatalog'
import NotificationNavigation from '~/layouts/shipper/NotificationNavigation'

const types = notificationTypesFor('Shipper')
export default function NotificationsPage() {
  const { t } = useTranslation()
  return (
    <RoleHome
      title={t('customer.profile.allNotifications')}
      description={t('notificationNav.shipperDescription')}
      actions={<NotificationNavigation />}
      showIdentity={false}
    >
      <NotificationCenter
        advanced
        types={types}
        descriptionKey="notificationNav.shipperDescription"
        filterClassName="workspace-filters"
      />
    </RoleHome>
  )
}
