import { useTranslation } from 'react-i18next'
import { Clock } from 'lucide-react'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import { formatDateTime } from '~/utils/formats'
import ShipperPanel from '../components/ShipperPanel'
import DeliveryLocker from '../components/DeliveryLocker'
import { taskLocker } from '../components/deliveryLockerModel'

export default function TaskPreview({ resource, type, icon }) {
  const { t } = useTranslation()
  return (
    <ShipperPanel
      title={t(type === 1 ? 'shipper.collect' : 'shipper.return')}
      icon={icon}
      tone={type === 1 ? 'blue' : 'violet'}
    >
      {resource.loading || resource.error || !resource.data?.list.length ? (
        <ResourceFeedback
          {...resource}
          empty="shipper.noTasks"
        />
      ) : (
        <div className="p-5">
          <p className="mb-4 text-sm text-muted-foreground">
            {t('shipper.previewCount', { count: resource.data.list.length, total: resource.data.total })}
          </p>
          <ul className="divide-y divide-border">
            {resource.data.list.map((row) => (
              <li
                key={row.id}
                className="space-y-2 py-4 first:pt-0 last:pb-0"
              >
                <p className="flex flex-wrap items-center gap-2">
                  <strong className="rounded-lg bg-primary/10 px-3 py-1 text-primary">
                    {row.orderCode}
                  </strong>
                  {row.merchantOrderCode && (
                    <span className="text-sm text-muted-foreground">
                      {row.merchantOrderCode}
                    </span>
                  )}
                </p>
                <DeliveryLocker
                  {...taskLocker(row)}
                  fallback={t('shipper.returnLockerUnavailable')}
                />
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock size={15} />
                  {t('shipper.assignedAt', { date: formatDateTime(row.assignedAt) })}
                </p>
                {row.note && (
                  <p className="break-words rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                    {row.note}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </ShipperPanel>
  )
}
