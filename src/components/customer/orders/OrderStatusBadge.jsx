import { useTranslation } from 'react-i18next'
import { ORDER_STATUS_COLORS, ORDER_STATUS_OPTIONS, PAYMENT_STATUSES } from '~/utils/constants'
import { cn } from '~/lib/utils'

export default function OrderStatusBadge({ status, payment = false }) {
  const { t } = useTranslation()
  const option = payment
    ? { label: Object.values(PAYMENT_STATUSES).includes(status) ? `customer.orders.paymentStatus.${status}` : 'customer.orders.unknown',
      color: status === PAYMENT_STATUSES.PAID ? 'emerald' : status === PAYMENT_STATUSES.REFUNDED ? 'violet' : 'amber' }
    : ORDER_STATUS_OPTIONS.find((item) => Number(item.value) === status)
  return (
    <span className={cn('inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium', ORDER_STATUS_COLORS[option?.color || 'slate'])}>
      <span
        className="size-1.5 shrink-0 rounded-full bg-current"
        aria-hidden="true"
      />
      {t(option?.label || 'customer.orders.unknown')}
    </span>
  )
}
