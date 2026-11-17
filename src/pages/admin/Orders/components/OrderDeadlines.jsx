import { useEffect, useState } from 'react'
import { Clock3, Timer } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatDateTime, formatDurationMinutes } from '~/utils/format/formats'
import { ORDER_DEADLINES, orderDeadline } from './deadlineModel'

export default function OrderDeadlines({ order }) {
  const { t } = useTranslation()
  const [clock, setClock] = useState(() => ({ order, elapsed: 0 }))
  useEffect(() => {
    const received = performance.now()
    const timer = setInterval(() => setClock({ order, elapsed: performance.now() - received }), 1000)
    return () => clearInterval(timer)
  }, [order])
  return (
    <section
      aria-label={t('adminOrderTime.title')}
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <h2 className="flex items-center gap-3 border-b border-border bg-primary/5 p-5 text-lg font-semibold">
        <Clock3 className="size-5 text-primary" />
        {t('adminOrderTime.title')}
      </h2>
      <div className="grid gap-4 p-5 lg:grid-cols-3">
        {ORDER_DEADLINES.map(definition => {
          const state = orderDeadline(order, definition, clock.order === order ? clock.elapsed : 0)
          const duration = state.seconds == null ? null : formatDurationMinutes(state.expired ? Math.floor(Math.abs(state.seconds) / 60) : Math.ceil(state.seconds / 60))
          return (
            <div
              key={definition.key}
              data-deadline={definition.key}
              data-overdue={state.expired || undefined}
              className={`min-w-0 rounded-xl border p-4 ${state.expired ? 'border-amber-500/35 bg-amber-500/8' : 'border-border bg-muted/20'}`}
            >
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <Timer
                  aria-hidden="true"
                  className={`size-4 shrink-0 ${state.expired ? 'deposit-expired-clock text-amber-700 dark:text-amber-300' : 'text-primary'}`}
                />
                {t(`adminOrderTime.${definition.key}`)}
              </h3>
              <p className="mt-3 break-words text-sm font-semibold">
                {formatDateTime(state.date)}
              </p>
              <p className={`mt-2 text-sm font-medium ${state.expired ? 'text-amber-800 dark:text-amber-200' : 'text-muted-foreground'}`}>
                {t(state.expired ? 'adminOrderTime.overdue' : state.active && state.date ? 'adminOrderTime.active' : state.date ? 'adminOrderTime.inactive' : 'adminOrderTime.missing')}
              </p>
              {state.seconds != null && (!state.expired || state.seconds < 0) && (
                <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                  {t(state.expired ? 'adminOrderTime.lateBy' : 'adminOrderTime.remaining', { duration })}
                </p>
              )}
              {state.expired && (
                <p className="mt-3 text-sm leading-6">
                  {t(`adminOrderTime.${definition.key}Hint`)}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
