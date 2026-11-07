import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell } from 'lucide-react'
import NotificationInbox from '~/components/notifications/NotificationInbox'
import { Button } from '~/components/ui/button'

export default function NotificationsPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const rawPage = Number(params.get('page') || 1)
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1
  const unreadOnly = params.get('unread') === 'true'
  const change = ({ page, unreadOnly }) => setParams({ ...(page > 1 ? { page: String(page) } : {}), ...(unreadOnly ? { unread: 'true' } : {}) })
  useEffect(() => {
    document.title = `${t('customer.profile.allNotifications')} | WashGo`
  }, [t])
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="flex items-center gap-3 text-3xl font-bold">
        <Bell className="text-primary" />
        {t('customer.profile.allNotifications')}
      </h1>
      <div className="flex gap-2">
        {[false, true].map((value) => (
          <Button
            key={String(value)}
            variant={unreadOnly === value ? 'default' : 'secondary'}
            className="h-11 px-4"
            aria-pressed={unreadOnly === value}
            onClick={() => change({ page: 1, unreadOnly: value })}
          >
            {t(value ? 'customer.notification.unread' : 'customer.notification.all')}
          </Button>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <NotificationInbox
          page={page}
          unreadOnly={unreadOnly}
          onChange={change}
        />
      </div>
    </div>
  )
}
