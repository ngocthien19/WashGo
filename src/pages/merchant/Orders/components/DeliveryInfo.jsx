import { useTranslation } from 'react-i18next'
import ResourceThumbnail from '~/components/ResourceThumbnail/ResourceThumbnail'
import { formatDateTime, formatNumber } from '~/utils/formats'

export default function DeliveryInfo({ order, depositImages, returnImages }) {
  const { t } = useTranslation()
  const sameLocker = !order.returnLockerId || order.returnLockerId === order.lockerId
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {[{ key: 'dropoff', name: order.lockerName, address: order.lockerAddress, box: order.boxNumber, images: depositImages }, { key: 'pickup', name: order.returnLockerName || (sameLocker ? order.lockerName : null), address: order.returnLockerAddress || (sameLocker ? order.lockerAddress : null), box: order.returnBoxNumber, images: returnImages }].map(slot => (
          <section
            key={slot.key}
            className="min-w-0 rounded-xl border border-border p-4"
          >
            <h3 className="mb-4 border-b border-border pb-3 font-semibold text-primary">
              {t(`merchant.orderView.${slot.key}`)}
            </h3>
            <div className="flex items-center gap-3">
              <ResourceThumbnail
                urls={slot.images}
                name={slot.name}
              />
              <div className="min-w-0">
                <p className="break-words font-semibold">
                  {slot.name || '—'}
                </p>
                <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
                  {slot.address || '—'}
                </p>
              </div>
            </div>
            <dl className="mt-4 space-y-4">
              <div>
                <dt className="text-sm text-muted-foreground">
                  {t(slot.key === 'dropoff' ? 'merchant.orders.box' : 'merchant.orders.returnBox')}
                </dt>
                <dd className="mt-2 font-semibold">
                  {slot.box || '—'}
                </dd>
              </div>
            </dl>
          </section>
        ))}
      </div>
      <dl className="grid gap-5 sm:grid-cols-2">
        {[['weight', order.actualWeightKg == null ? t('customer.orders.notWeighed') : `${formatNumber(order.actualWeightKg)} kg`], ['eta', order.predictedFinishAt || order.estimatedFinishAt ? formatDateTime(order.predictedFinishAt || order.estimatedFinishAt) : t('merchant.orders.noEta')], ['storage', order.storageLocation], ['storageReference', order.storageReference]].map(([key, value]) => (
          <div key={key}>
            <dt className="text-sm text-muted-foreground">
              {t(key === 'storageReference' ? 'merchant.orderView.storageReference' : `merchant.orders.${key}`)}
            </dt>
            <dd className="mt-2 break-words text-sm font-semibold leading-6">
              {value || '—'}
            </dd>
          </div>
        ))}
      </dl>
      {order.shipperNote && (
        <p className="rounded-xl bg-muted/50 p-4 text-sm font-semibold">
          {order.shipperNote}
        </p>
      )}
    </div>
  )
}
