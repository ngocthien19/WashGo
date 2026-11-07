import { useTranslation } from 'react-i18next'
import { Bell } from 'lucide-react'
import Breadcrumb from '~/components/Breadcrumb/Breadcrumb'
import SectionHeading from '~/components/customer/SectionHeading/SectionHeading'
import NotificationCenter from '~/components/notifications/NotificationCenter'
import { CUSTOMER_ROUTES } from '~/utils/constants'

export default function NotificationsPage() {
  const { t } = useTranslation()
  return (
    <div className="min-h-[70dvh] bg-muted/30">
      <div className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: t('common.home'), to: CUSTOMER_ROUTES.HOME }, { label: t('customer.profile.allNotifications') }]} />
        <SectionHeading
          as="h1"
          icon={Bell}
          title={t('customer.profile.allNotifications')}
          description={t('customer.notification.description')}
        />
        <NotificationCenter stickyClassName="lg:top-[var(--customer-header-offset)]" />
      </div>
    </div>
  )
}
