import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { ORDER_WORKFLOW, ORDER_STATUS_OPTIONS } from '~/utils/constants'
import { formatDateTime } from '~/utils/formats'
import { cn } from '~/lib/utils'

export default function OrderTimeline({ order }) {
  const { t } = useTranslation()
  const events = [...(order.timeline || [])].sort((a, b) => a.timestamp - b.timestamp)
  const steps = [...ORDER_WORKFLOW]
  for (const status of new Set([...events.map((event) => event.status), order.status])) {
    if (!steps.some((step) => Number(step.value) === status)) {
      steps.push(ORDER_STATUS_OPTIONS.find((step) => Number(step.value) === status) || { value: String(status), label: 'customer.orders.unknown' })
    }
  }
  return (
    <ol
      aria-label={t('customer.orders.timeline')}
      className="ml-3"
    >
      {steps.flatMap((step) => {
        const recorded = events.filter((event) => event.status === Number(step.value))
        return (recorded.length ? recorded : [null]).map((event, index) => {
          const current = Number(step.value) === order.status && index === Math.max(0, recorded.length - 1)
          return (
            <li
              key={event?.id || `${step.value}-${index}`}
              aria-current={current ? 'step' : undefined}
              className="relative border-l border-border pb-7 pl-7 last:border-transparent last:pb-0"
            >
              <span className={cn('absolute -left-3 top-0 grid size-6 place-items-center rounded-full border-2 border-border bg-card ring-4 ring-card',
                (event || current) && 'border-primary bg-primary text-primary-foreground', current && 'ring-primary/15')}
              >
                {(event || current) && (
                  <Check
                    size={14}
                    aria-hidden="true"
                  />
                )}
              </span>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className={cn('text-sm font-medium', current ? 'text-primary' : !event && 'text-muted-foreground')}>
                  {t(step.label)}
                </p>
                {current && (
                  <span className="ml-auto shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    {t('customer.orders.currentStep')}
                  </span>
                )}
                {!current && event?.timestamp && (
                  <time className="ml-auto text-xs text-muted-foreground">
                    {formatDateTime(event.timestamp)}
                  </time>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground">
                {event?.note || t(event ? 'customer.orders.recordedStep' : current ? 'customer.orders.currentStep' : 'customer.orders.noStepRecord')}
              </p>
            </li>
          )
        })
      })}
    </ol>
  )
}
