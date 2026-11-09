import { useCallback } from 'react'
import { LayoutDashboard, Store, Package, PanelsTopLeft, Shirt, Tags, MessageSquareWarning, Wallet, Settings } from 'lucide-react'
import WorkspaceLayout from '~/components/workspace/WorkspaceLayout'
import useCatalogResource from '~/hooks/useCatalogResource'
import { adminDashboardApi } from '~/apis/admin/adminDashboardApi'
import { ADMIN_ROUTES } from '~/utils/constants'
import { adminNotificationHref } from '~/utils/adminNotifications'

const navigation = [['overview', LayoutDashboard, ADMIN_ROUTES.HOME], ['merchants', Store, ADMIN_ROUTES.MERCHANTS], ['orders', Package, ADMIN_ROUTES.ORDERS], ['lockers', PanelsTopLeft, ADMIN_ROUTES.LOCKERS], ['services', Shirt, ADMIN_ROUTES.SERVICES], ['promotions', Tags, ADMIN_ROUTES.PROMOTIONS], ['complaints', MessageSquareWarning, ADMIN_ROUTES.COMPLAINTS], ['finance', Wallet, ADMIN_ROUTES.FINANCE], ['settings', Settings, ADMIN_ROUTES.SETTINGS]]
export default function AdminLayout() {
  const load = useCallback((signal) => adminDashboardApi.profile(signal), [])
  const profile = useCatalogResource(load)
  return (
    <WorkspaceLayout
      admin
      prefix="admin"
      navigation={navigation}
      homeHref={ADMIN_ROUTES.HOME}
      profileHref={ADMIN_ROUTES.PROFILE}
      notificationsHref={ADMIN_ROUTES.NOTIFICATIONS}
      resolveNotificationHref={adminNotificationHref}
      context={{ profile }}
    />
  )
}
