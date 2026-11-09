import { Outlet } from 'react-router-dom'
import NotificationProvider from '~/components/notifications/NotificationProvider'
import { SHIPPER_ROUTES } from '~/utils/constants'

// Task pages do not exist yet; never route a Shipper to a Customer/Admin order.
const resolveHref = () => null
export default function ShipperLayout() {
  return (
    <NotificationProvider
      listHref={SHIPPER_ROUTES.NOTIFICATIONS}
      resolveHref={resolveHref}
    >
      <Outlet />
    </NotificationProvider>
  )
}
