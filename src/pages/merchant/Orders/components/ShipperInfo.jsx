import { useTranslation } from 'react-i18next'
import UserAvatar from '~/components/UserAvatar/UserAvatar'

export default function ShipperInfo({ order }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <UserAvatar
          avatar={order.shipperAvatarUrl}
          fullName={order.shipperName}
          className="size-12"
        />
        <p className="font-semibold">
          {order.shipperName || t('merchant.orders.unassigned')}
        </p>
      </div>
      {order.shipperId && (
        <dl className="grid gap-4 sm:grid-cols-2">
          {[['email', order.shipperEmail], ['phone', order.shipperPhone], ['vehicleType', order.shipperVehicleType != null ? t(`merchant.shippers.vehicles.${order.shipperVehicleType}`, { defaultValue: '—' }) : null], ['vehiclePlate', order.shipperVehiclePlate]].map(([key, value]) => (
            <div
              key={key}
              className="min-w-0"
            >
              <dt className="text-sm text-muted-foreground">
                {t(`merchant.shippers.${key}`)}
              </dt>
              <dd className="mt-2 break-words text-base font-semibold">
                {value || '—'}
              </dd>
            </div>
          ))}
        </dl>
      )}

    </div>
  )
}
