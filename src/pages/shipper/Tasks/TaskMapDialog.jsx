import { useCallback } from 'react'
import useCatalogResource from '~/hooks/useCatalogResource'
import LocationMapDialog from '~/components/maps/LocationMapDialog'
import { shipperTaskApi } from '~/apis/shipper/shipperTaskApi'
import { taskLocker } from '../components/deliveryLockerModel'

export default function TaskMapDialog({ id, onClose }) {
  const resource = useCatalogResource(useCallback((signal) => shipperTaskApi.detail(id, signal), [id]))
  return (
    <LocationMapDialog
      location={resource.data ? taskLocker(resource.data) : null}
      loading={resource.loading}
      error={resource.error}
      onRetry={resource.retry}
      onClose={onClose}
    />
  )
}
