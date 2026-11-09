import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import NotificationBell from '~/components/notifications/NotificationBell'
import { SHIPPER_ROUTES } from '~/utils/constants'

export default function NotificationNavigation() {
  const { t } = useTranslation()
  return (
    <>
      <nav
        aria-label={t('notificationNav.shipperNavigation')}
        className="flex flex-wrap gap-2 text-sm font-medium"
      >
        {[[SHIPPER_ROUTES.HOME, 'common.home'], [SHIPPER_ROUTES.NOTIFICATIONS, 'customer.notification.title']].map(([to, key]) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) => `rounded-xl px-3 py-2 transition-colors delay-0 duration-150 ease-out ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
          >
            {t(key)}
          </NavLink>
        ))}
      </nav>
      <NotificationBell />
    </>
  )
}
