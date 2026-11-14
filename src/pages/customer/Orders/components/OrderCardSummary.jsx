import { useTranslation } from 'react-i18next'
import { ORDER_STATUSES } from '~/utils/config/constants'
import { formatDateTime } from '~/utils/format/formats'
import { cn } from '~/lib/utils'
import { statusTextColors } from '../orderSummary'
import OrderEstimate from './OrderEstimate'

export default function OrderCardSummary({ order, estimate }) {
  const { t } = useTranslation()
  const status = order.status
  const processing = status >= ORDER_STATUSES.DEPOSITED && status <= ORDER_STATUSES.FOLDING
  const timestamp = {
    [ORDER_STATUSES.PENDING]: order.depositDeadline,
    [ORDER_STATUSES.AWAITING_PAYMENT]: order.paymentDeadline,
    [ORDER_STATUSES.PAID]: order.paidAt,
    [ORDER_STATUSES.READY_TO_RETURN]: order.pickupDeadline,
    [ORDER_STATUSES.RETURNED]: estimate?.recordedAt,
    [ORDER_STATUSES.COMPLETED]: estimate?.recordedAt,
    [ORDER_STATUSES.MOVED_TO_STORAGE]: order.movedToStorageAt
  }[status]
  const hasTime = typeof timestamp === 'string' && Number.isFinite(Date.parse(timestamp)) || typeof timestamp === 'number' && timestamp > 0 && Number.isFinite(new Date(timestamp * 1000).getTime())
  const cancelled = status === ORDER_STATUSES.CANCELLED
  const label = t(`customer.sync.cardStatus.${status}.title`, { defaultValue: t('customer.orders.estimatedFinish') })
  return (
    <div className="text-xs text-muted-foreground xl:text-right">
      <p>
        {label}
      </p>
      {processing ? (
        <OrderEstimate
          order={{ ...order, ...estimate }}
          compact
          showEstimateLabel
          loading={!order.predictionStatus && estimate === undefined}
        />
      ) : (
        <>
          <p className={cn('mt-1 break-words text-base font-bold', statusTextColors[status] || 'text-foreground')}>
            {cancelled ? order.cancellationReason || '—' : hasTime ? formatDateTime(timestamp) : t(`customer.sync.cardStatus.${status}.fallback`, { defaultValue: t('customer.orders.unknown') })}
          </p>
          {status === ORDER_STATUSES.PENDING && order.isDepositExpired && (
            <p className="mt-1 text-red-700 dark:text-red-300">
              {t('customer.sync.cardDepositExpired')}
            </p>
          )}
          {status === ORDER_STATUSES.MOVED_TO_STORAGE && order.storageLocation && (
            <p className="mt-1 break-words">
              {order.storageLocation}
            </p>
          )}
        </>
      )}
    </div>
  )
}
