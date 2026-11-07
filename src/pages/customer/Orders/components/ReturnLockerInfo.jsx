import { useTranslation } from 'react-i18next'
import { MapPin } from 'lucide-react'
import { getLockerMapLink } from '~/utils/formats'

export default function ReturnLockerInfo({ order }) {
  const { t } = useTranslation()
  if (order.status === 99 && order.cancelledGoodsStatus === 1) {
    order = { ...order, returnLockerName: order.lockerName, returnBoxNumber: order.boxNumber, returnLockerAddress: order.lockerAddress, returnLockerLatitude: order.lockerLatitude, returnLockerLongitude: order.lockerLongitude }
  }
  if (!order.returnLockerName) {
    return null
  }
  const href = getLockerMapLink({ latitude: order.returnLockerLatitude, longitude: order.returnLockerLongitude })
  return (
    <section className="grid gap-2 rounded-xl border border-primary/15 bg-primary/5 p-4 text-sm">
      <h3 className="flex items-center gap-2 font-bold">
        <MapPin
          size={18}
          className="text-primary"
        />
        {t('customer.sync.returnLocker')}
      </h3>
      <p className="font-semibold">
        {order.returnLockerName}
        {order.returnBoxNumber ? ` · ${t('customer.order.box', { number: order.returnBoxNumber })}` : ''}
      </p>
      {order.returnLockerAddress && (
        <p className="text-muted-foreground">
          {order.returnLockerAddress}
        </p>
      )}
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-primary underline"
        >
          {t('customer.sync.openMap')}
        </a>
      )}
    </section>
  )
}
