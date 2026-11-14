import { Trans, useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'framer-motion'
import { getOrderProgress } from './orderWorkflow'
import { ORDER_STATUSES } from '~/utils/config/constants'
import { cn } from '~/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'

const progressColors = {
  [ORDER_STATUSES.PENDING]: 'bg-slate-400 dark:bg-slate-400',
  [ORDER_STATUSES.DEPOSITED]: 'bg-sky-500 dark:bg-sky-400',
  [ORDER_STATUSES.COLLECTED]: 'bg-cyan-500 dark:bg-cyan-400',
  [ORDER_STATUSES.WASHING]: 'bg-blue-500 dark:bg-blue-400',
  [ORDER_STATUSES.DRYING]: 'bg-indigo-500 dark:bg-indigo-400',
  [ORDER_STATUSES.IRONING]: 'bg-purple-500 dark:bg-purple-400',
  [ORDER_STATUSES.FOLDING]: 'bg-fuchsia-500 dark:bg-fuchsia-400',
  [ORDER_STATUSES.AWAITING_PAYMENT]: 'bg-amber-500 dark:bg-amber-400',
  [ORDER_STATUSES.PAID]: 'bg-lime-500 dark:bg-lime-400',
  [ORDER_STATUSES.READY_TO_RETURN]: 'bg-violet-500 dark:bg-violet-400',
  [ORDER_STATUSES.RETURNED]: 'bg-teal-500 dark:bg-teal-400',
  [ORDER_STATUSES.COMPLETED]: 'bg-emerald-500 dark:bg-emerald-400',
  [ORDER_STATUSES.MOVED_TO_STORAGE]: 'bg-orange-400 dark:bg-orange-400',
  [ORDER_STATUSES.CANCELLED]: 'bg-red-400 dark:bg-red-400'
}

export default function OrderProgress({ order, compact = false }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const progress = getOrderProgress(order)
  return (
    <div className="space-y-2">
      <Tooltip>
        <TooltipTrigger
          render={<div />}
          tabIndex={0}
          role="progressbar"
          aria-label={t('customer.orders.stageProgress')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress ?? undefined}
          aria-valuetext={progress == null ? t('customer.orders.unknown') : t('customer.orders.progressValue', { percent: progress })}
          className="-my-2 cursor-help rounded-full py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={false}
              animate={{ width: `${progress ?? 0}%` }}
              transition={{ duration: reduce ? 0 : 0.35, ease: 'easeOut' }}
              className={cn('h-full rounded-full', progressColors[order.status] || 'bg-primary')}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {progress == null ? t('customer.orders.unknown') : (
            <Trans
              i18nKey="customer.orders.progressCompleted"
              values={{ percent: progress }}
              components={{ strong: <strong className="font-bold" /> }}
            />
          )}
          <span className="block text-[11px] opacity-75">
            {t('customer.orders.progressSuffix')}
          </span>
        </TooltipContent>
      </Tooltip>
      {!compact && (
        <p className="text-xs text-muted-foreground">
          {progress == null ? t('customer.orders.unknown') : (
            <>
              <strong className="font-bold text-foreground">
                {progress}
                %
              </strong>
              {' '}
              {t('customer.orders.progressSuffix')}
            </>
          )}
        </p>
      )}
    </div>
  )
}
