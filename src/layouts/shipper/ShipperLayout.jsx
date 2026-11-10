import { LayoutDashboard, Truck, History } from 'lucide-react'
import WorkspaceLayout from '~/components/workspace/WorkspaceLayout'
import useCatalogResource from '~/hooks/useCatalogResource'
import { shipperWorkspaceApi } from '~/apis/shipper/shipperWorkspaceApi'
import { SHIPPER_ROUTES } from '~/utils/constants'

const navigation = [['overview', LayoutDashboard, SHIPPER_ROUTES.HOME], ['tasks', Truck, SHIPPER_ROUTES.TASKS, false], ['history', History, SHIPPER_ROUTES.HISTORY, false]]
export default function ShipperLayout() {
  const profile = useCatalogResource(shipperWorkspaceApi.profile)
  return (
    <WorkspaceLayout
      prefix="shipper"
      navigation={navigation}
      homeHref={SHIPPER_ROUTES.HOME}
      profileHref={SHIPPER_ROUTES.PROFILE}
      notificationsHref={SHIPPER_ROUTES.NOTIFICATIONS}
      resolveNotificationHref={() => null}
      context={{ profile }}
    />
  )
}
