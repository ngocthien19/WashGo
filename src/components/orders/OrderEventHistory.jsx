import { useTranslation } from 'react-i18next'
import { ClipboardList, Store, Truck, Scale, Warehouse } from 'lucide-react'
import OrderStatus from './OrderStatus'
import OrderStatusDescription from './OrderStatusDescription'
import { capturedEvent, eventKey, orderedEvents } from '~/utils/orders/orderEvents'
import { formatDateTime } from '~/utils/format/formats'

export default function OrderEventHistory({ entries = [] }) {
  const { t } = useTranslation()
  if (!entries.length) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('customer.orders.noTimeline')}
      </p>
    )
  }
  return (
    <ol className="space-y-5">
      {orderedEvents(entries).map((entry, index) => {
        const captured = capturedEvent(entry)
        const key = eventKey(entry)
        const changesStatus = entry.fromStatus != null && entry.fromStatus !== entry.status
        const Icon = entry.eventType?.startsWith('Storage.') ? Warehouse : entry.eventType === 'MerchantAssigned' ? Store
          : ['ShipperAssigned', 'ShipperReassigned'].includes(entry.eventType) ? Truck : entry.eventType === 'ActualWeightConfirmed' ? Scale : ClipboardList
        return (
          <li
            key={entry.id || index}
            className="space-y-2 border-l-2 border-primary/40 pl-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              {captured ? (
                <strong className="flex items-center gap-2 text-foreground">
                  <Icon
                    size={18}
                    aria-hidden="true"
                  />
                  {t(`orderEvents.labels.${key}`)}
                </strong>
              )
                : (
                  <OrderStatus
                    status={entry.status}
                    showDot={false}
                  />
                )}
              {entry.timestamp != null && (
                <time className="text-sm text-muted-foreground">
                  {formatDateTime(entry.timestamp)}
                </time>
              )}
            </div>
            {captured && changesStatus && (
              <div className="flex flex-wrap items-center gap-2">
                <OrderStatus status={entry.fromStatus} />
                <span aria-hidden="true">→</span>
                <OrderStatus status={entry.status} />
              </div>
            )}
            {entry.actorName && (
              <p className="break-words text-sm font-bold text-foreground">
                {entry.actorName}
              </p>
            )}
            {captured && key !== 'Unknown' && (
              <p className="text-sm leading-6 text-muted-foreground">
                {t(`orderEvents.descriptions.${key}`)}
              </p>
            )}
            {!captured && (
              <p className="text-sm text-muted-foreground">
                <OrderStatusDescription status={entry.status} />
              </p>
            )}
            {captured && (entry.merchantName || entry.shipperName) && (
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                {['merchantName', 'shipperName'].filter(field => entry[field]).map(field => (
                  <div key={field}>
                    <dt className="text-muted-foreground">
                      {t(`orderEvents.${field}`)}
                    </dt>
                    <dd className="font-semibold text-foreground">
                      {entry[field]}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {captured && entry.taskType && (
              <p className="text-sm text-muted-foreground">
                {t(`orderEvents.tasks.${entry.taskType}`, { defaultValue: t('orderEvents.tasks.unknown') })}
              </p>
            )}
            {entry.note && (
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                {entry.note}
              </p>
            )}
          </li>
        )
      })}
    </ol>
  )
}
