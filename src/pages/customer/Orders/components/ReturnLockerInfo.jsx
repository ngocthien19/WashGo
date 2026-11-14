import ScrollSection from '~/components/motion/ScrollSection'
import { useTranslation } from 'react-i18next'
import { MapPin } from 'lucide-react'
import { getLockerMapLink } from '~/utils/format/formats'
import ResourceThumbnail from '~/components/ResourceThumbnail/ResourceThumbnail'

export default function ReturnLockerInfo({ order, animate = false }) {
  const { t } = useTranslation()
  const Section = animate ? ScrollSection : 'section'
  if (order.status === 99 && order.cancelledGoodsStatus === 1) {
    order = { ...order, returnLockerName: order.lockerName, returnLockerImageUrls: order.lockerImageUrls, returnBoxNumber: order.boxNumber, returnLockerAddress: order.lockerAddress, returnLockerLatitude: order.lockerLatitude, returnLockerLongitude: order.lockerLongitude }
  }
  if (!order.returnLockerName) {
    return null
  }
  const href = getLockerMapLink({ latitude: order.returnLockerLatitude, longitude: order.returnLockerLongitude })
  return (
    <Section className="grid gap-2 rounded-xl border border-primary/15 bg-primary/5 p-4 text-sm">
      <h3 className="flex items-center gap-2 font-bold">
        <MapPin
          size={18}
          className="text-primary"
        />
        {t('customer.sync.returnLocker')}
      </h3>
      <div className="flex items-start gap-3">
        <ResourceThumbnail
          urls={order.returnLockerImageUrls}
          name={order.returnLockerName}
        />
        <div className="min-w-0 space-y-2">
          <p className="break-words font-semibold">
            {order.returnLockerName}
            {order.returnBoxNumber ? ` · ${t('customer.order.box', { number: order.returnBoxNumber })}` : ''}
          </p>
          {order.returnLockerAddress && (
            <p className="break-words leading-6 text-muted-foreground">
              {order.returnLockerAddress}
            </p>
          )}
        </div>
      </div>
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
    </Section>
  )
}
