import { useTranslation } from 'react-i18next'
import { Bell } from 'lucide-react'
import Reveal from '~/components/motion/Reveal'
import NotificationCenter from '~/components/notifications/NotificationCenter'
import { MERCHANT_NOTIFICATION_TYPES } from './notificationModel'

export default function NotificationsPage() {
  const { t } = useTranslation()
  return (
    <Reveal className="mx-auto max-w-[1600px] space-y-6">
      <header>
        <h1 className="flex items-center gap-3 text-3xl font-bold">
          <Bell className="text-primary" />
          {t('customer.profile.allNotifications')}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          {t('customer.notification.description')}
        </p>
      </header>
      <NotificationCenter
        filterClassName="workspace-filters"
        advanced
        types={MERCHANT_NOTIFICATION_TYPES}
      />
    </Reveal>
  )
}
