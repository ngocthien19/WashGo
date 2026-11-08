import { useTranslation } from 'react-i18next'
import NotificationCenter from '~/components/notifications/NotificationCenter'
import { Bell } from 'lucide-react'

// Notification types published to Admin accounts by the backend.
const types = [17, 22, 23, 40, 41, 42, 43, 44, 45, 46, 47]

export default function NotificationsPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <header>
        <h1 className="flex items-center gap-3 text-3xl font-bold">
          <Bell className="text-primary" />
          {t('customer.profile.allNotifications')}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          {t('admin.notificationDescription')}
        </p>
      </header>
      <NotificationCenter
        advanced
        types={types}
        descriptionKey="admin.notificationDescription"
      />
    </div>
  )
}
