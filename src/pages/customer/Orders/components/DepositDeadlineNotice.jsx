import { useTranslation } from 'react-i18next'
import { Timer } from 'lucide-react'
import useDepositDeadline from '~/hooks/customer/useDepositDeadline'
import { formatCountdown, formatDateTime } from '~/utils/format/formats'

export default function DepositDeadlineNotice({ order }) {
  const { t } = useTranslation()
  const deadline = useDepositDeadline(order)
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-950 dark:text-amber-100">
      <Timer className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-300" />
      <div className="grid gap-2">
        <p className="text-sm font-semibold">
          {t('customer.orders.dropoff.deadlineTitle')}
        </p>
        <p className="text-sm leading-6">
          {deadline.expired ? t('customer.sync.depositExpired') : deadline.available ? t('customer.sync.depositRemaining', { time: formatCountdown(deadline.seconds), date: formatDateTime(order.depositDeadline) }) : t('customer.orders.dropoff.deadlineUnavailable')}
        </p>
        {Number.isFinite(order?.depositWindowMinutes) && (
          <p className="text-xs">
            {t('customer.sync.depositWindow', { minutes: order.depositWindowMinutes })}
          </p>
        )}
      </div>
    </div>
  )
}
