import { useTranslation } from 'react-i18next'
import { hasShipperCapacity } from '~/utils/orders/shipperCapacity'

export default function ShipperCapacity({ shipper, compact = false }) {
  const { t } = useTranslation()
  if (!hasShipperCapacity(shipper)) {
    return (
      <span className="text-sm text-muted-foreground">
        {t('shipperCapacity.unknown')}
      </span>
    )
  }
  return (
    <span className="block space-y-1">
      <span className="block font-semibold">
        {t('shipperCapacity.load', { count: shipper.activeTaskCount, limit: shipper.maxActiveTasks })}
      </span>
      {!compact && (
        <span className="block text-sm text-muted-foreground">
          {t('shipperCapacity.remaining', { count: shipper.remainingTaskCapacity })}
        </span>
      )}
    </span>
  )
}
