import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import UserAvatar from '~/components/UserAvatar/UserAvatar'
import useCatalogResource from '~/hooks/useCatalogResource'
import { merchantShipperApi } from '~/apis/merchant/merchantShipperApi'
import { Button } from '~/components/ui/button'

export default function ShipperInfo({ order }) {
  const { t } = useTranslation()
  const load = useCallback(signal => order.shipperId ? merchantShipperApi.detail(order.shipperId, signal) : Promise.resolve(null), [order.shipperId])
  const resource = useCatalogResource(load)
  const shipper = resource.data
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <UserAvatar
          avatar={shipper?.avatar}
          fullName={shipper?.fullName || order.shipperName}
          className="size-12"
        />
        <p className="font-semibold">
          {shipper?.fullName || order.shipperName || t('merchant.orders.unassigned')}
        </p>
      </div>
      {order.shipperId && (
        <dl className="grid gap-4 sm:grid-cols-2">
          {[['email', shipper?.email], ['phone', shipper?.phone], ['vehicleType', shipper ? t(`merchant.shippers.vehicles.${shipper.vehicleType}`, { defaultValue: '—' }) : null], ['vehiclePlate', shipper?.vehiclePlate]].map(([key, value]) => (
            <div
              key={key}
              className="min-w-0"
            >
              <dt className="text-sm text-muted-foreground">
                {t(`merchant.shippers.${key}`)}
              </dt>
              <dd className="mt-2 break-words text-sm font-semibold">
                {resource.loading ? '…' : value || '—'}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {resource.error && (
        <Button
          variant="link"
          className="h-auto p-0 text-sm text-destructive"
          onClick={resource.retry}
        >
          {t('common.tryAgain')}
        </Button>
      )}
    </div>
  )
}
