import { useTranslation } from 'react-i18next'
import Reveal from '~/components/motion/Reveal'
import NotificationCenter from '~/components/notifications/NotificationCenter'
import { notificationTypesFor } from '~/components/notifications/notificationCatalog'

const types = notificationTypesFor('Shipper')
export default function NotificationsPage() {
  const { t } = useTranslation()
  return (
    <Reveal className="mx-auto max-w-[1440px] space-y-6">
      <header>
        <h1 className="font-bold text-[30px]">
          {t('customer.profile.allNotifications')}
        </h1>
        <p className="mt-2 text-[16px] text-muted-foreground">
          {t('notificationNav.shipperDescription')}
        </p>
      </header>
      <NotificationCenter
        advanced
        types={types}
        descriptionKey="notificationNav.shipperDescription"
        filterClassName="workspace-filters"
      />
    </Reveal>
  )
}
