import { useTranslation } from 'react-i18next'
import OrderStatus from './OrderStatus'
import { capturedEvent, eventKey, orderedEvents } from '~/utils/orders/orderEvents'
import { formatDateTime } from '~/utils/format/formats'
import { ORDER_STATUS_OPTIONS } from '~/utils/config/constants'

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
        const statusLabel = status => t(ORDER_STATUS_OPTIONS.find(option => Number(option.value) === status)?.label || 'customer.orders.unknown')
        const description = captured && key === 'StatusChanged' && changesStatus
          ? t('orderEvents.transition', { from: statusLabel(entry.fromStatus), to: statusLabel(entry.status) })
          : captured && key !== 'Unknown' ? t(`orderEvents.descriptions.${key}`) : ''
        return (
          <li
            key={entry.id || index}
            className="space-y-2 border-l-2 border-primary/40 pl-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {captured && changesStatus && (
                  <>
                    <OrderStatus status={entry.fromStatus} />
                    <span aria-hidden="true">→</span>
                  </>
                )}
                <OrderStatus status={entry.status} />
              </div>
              {entry.timestamp != null && (
                <time className="text-sm text-muted-foreground">
                  {formatDateTime(entry.timestamp)}
                </time>
              )}
            </div>
            {entry.actorName && (
              <p className="break-words text-sm font-bold text-foreground">
                {entry.actorName}
              </p>
            )}
            {description && (
              <p className="text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            )}
            {captured && (entry.merchantName || entry.shipperName) && (
              <dl className="space-y-2 text-sm">
                {['merchantName', 'shipperName'].filter(field => entry[field]).map(field => (
                  <div
                    key={field}
                    className="flex flex-wrap items-baseline gap-x-2 gap-y-1"
                  >
                    <dt className="text-muted-foreground">
                      {t(`orderEvents.${field}`)}
                      :
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
            {entry.note && entry.note.trim() !== description.trim() && (
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
