import { useCallback } from 'react'
import { Warehouse, LayoutDashboard, Package, Truck, PanelsTopLeft, Shirt, ChartNoAxesCombined } from 'lucide-react'
import WorkspaceLayout from '~/components/workspace/WorkspaceLayout'
import useCatalogResource from '~/hooks/useCatalogResource'
import { merchantDashboardApi } from '~/apis/merchant/merchantDashboardApi'
import { MERCHANT_ROUTES } from '~/utils/constants'
import { merchantNotificationHref } from '~/pages/merchant/Notifications/notificationModel'

const navigation = [['overview', LayoutDashboard, MERCHANT_ROUTES.HOME], ['orders', Package, MERCHANT_ROUTES.ORDERS], ['storage', Warehouse, MERCHANT_ROUTES.STORAGE], ['shippers', Truck, MERCHANT_ROUTES.SHIPPERS], ['lockers', PanelsTopLeft, MERCHANT_ROUTES.LOCKERS], ['services', Shirt, MERCHANT_ROUTES.SERVICES], ['reports', ChartNoAxesCombined, MERCHANT_ROUTES.REPORTS]]
export default function MerchantLayout() {
  const load = useCallback((signal) => merchantDashboardApi.profile(signal), [])
  const profile = useCatalogResource(load)
  return (
    <WorkspaceLayout
      navigation={navigation}
      homeHref={MERCHANT_ROUTES.HOME}
      profileHref={MERCHANT_ROUTES.PROFILE}
      notificationsHref={MERCHANT_ROUTES.NOTIFICATIONS}
      resolveNotificationHref={merchantNotificationHref}
      context={{ profile }}
    />
  )
}
