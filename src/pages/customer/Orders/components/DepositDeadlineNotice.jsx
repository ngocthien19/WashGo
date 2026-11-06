import { useTranslation } from 'react-i18next'
import { Timer } from 'lucide-react'

export default function DepositDeadlineNotice() {
  const { t } = useTranslation()
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50/70 p-4 text-amber-950 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
      <Timer className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-300" />
      <div className="space-y-1">
        <p className="text-sm font-semibold">
          {t('customer.orders.dropoff.deadlineTitle')}
        </p>
        <p className="text-xs leading-6">
          {t('customer.orders.dropoff.deadlineUnavailable')}
        </p>
      </div>
    </div>
  )
}
