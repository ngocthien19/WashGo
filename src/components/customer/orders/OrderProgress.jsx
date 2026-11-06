import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'framer-motion'
import { getOrderProgress } from './orderWorkflow'
import { ORDER_STATUSES } from '~/utils/constants'
import { cn } from '~/lib/utils'

export default function OrderProgress({ order, compact = false }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const progress = getOrderProgress(order)
  return (
    <div className="space-y-2">
      <div
        role="progressbar"
        aria-label={t('customer.orders.stageProgress')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress ?? undefined}
        aria-valuetext={progress == null ? t('customer.orders.unknown') : t('customer.orders.progressValue', { percent: progress })}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <motion.div
          initial={false}
          animate={{ width: `${progress ?? 0}%` }}
          transition={{ duration: reduce ? 0 : 0.35, ease: 'easeOut' }}
          className={cn('h-full rounded-full bg-primary', order.status === ORDER_STATUSES.COMPLETED && 'bg-emerald-500', order.status === ORDER_STATUSES.CANCELLED && 'bg-muted-foreground/40')}
        />
      </div>
      {!compact && (
        <p className="text-xs text-muted-foreground">
          {progress == null ? t('customer.orders.unknown') : t('customer.orders.progressValue', { percent: progress })}
        </p>
      )}
    </div>
  )
}
