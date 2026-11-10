import { useTranslation } from 'react-i18next'
import Reveal from '~/components/motion/Reveal'
import NotificationCenter from '~/components/notifications/NotificationCenter'
import { notificationTypesFor } from '~/components/notifications/notificationCatalog'

const types = notificationTypesFor('Shipper')
export default function NotificationsPage() {
  const { t } = useTranslation()
  return (
    <Reveal className="mx-auto max-w-[1440px] space-y-6">
      <h1 className="text-3xl font-bold">
        {t('customer.profile.allNotifications')}
      </h1>
      <NotificationCenter
        advanced
        types={types}
        descriptionKey="notificationNav.shipperDescription"
        filterClassName="workspace-filters"
      />
    </Reveal>
  )
}
