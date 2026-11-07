import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { ORDER_WORKFLOW, ORDER_STATUS_OPTIONS } from '~/utils/constants'
import { formatDateTime } from '~/utils/formats'
import { cn } from '~/lib/utils'

export default function OrderTimeline({ order }) {
  const { t } = useTranslation()
  const events = [...(order.timeline || [])].sort((a, b) => a.timestamp - b.timestamp)
  const workflow = Array.isArray(order.workflowSteps) ? order.workflowSteps.filter((step) => step.isApplicable) : []
  const currentStatus = workflow.find((step) => step.isCurrent)?.status ?? order.status
  const steps = workflow.length ? workflow.map((step) => ORDER_STATUS_OPTIONS.find((option) => Number(option.value) === step.status) || { value: String(step.status), label: 'customer.orders.unknown' }) : [...ORDER_WORKFLOW]
  for (const step of workflow) {
    if ((step.isCompleted || step.isCurrent) && !events.some((event) => event.status === step.status)) {
      events.push({ id: `workflow-${step.status}`, status: step.status, timestamp: step.timestamp })
    }
  }
  for (const status of new Set([...events.map((event) => event.status), order.status])) {
    if (!steps.some((step) => Number(step.value) === status)) {
      steps.push(ORDER_STATUS_OPTIONS.find((step) => Number(step.value) === status) || { value: String(status), label: 'customer.orders.unknown' })
    }
  }
  const rows = steps.flatMap((step) => {
    const recorded = events.filter((event) => event.status === Number(step.value))
    return (recorded.length ? recorded : [null]).map((event, index) => ({
      step,
      event,
      current: Number(step.value) === currentStatus && index === Math.max(0, recorded.length - 1),
      key: event?.id || `${step.value}-${index}`
    }))
  })
  return (
    <ol
      aria-label={t('customer.orders.timeline')}
      className="ml-3"
    >
      {rows.map(({ step, event, current, key }, index) => {
        const next = rows[index + 1]
        const connected = (event || current) && (next?.event || next?.current)
        return (
          <li
            key={key}
            aria-current={current ? 'step' : undefined}
            className={cn('relative border-l-[3px] pb-7 pl-7 last:border-transparent last:pb-0', connected ? 'border-primary' : 'border-border')}
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
              <p className={cn('text-sm font-bold', current ? 'text-primary' : !event && 'text-muted-foreground')}>
                {t(step.label)}
              </p>
              {current && (
                <span className="font-bold ml-auto shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-sm text-primary">
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
      })}
    </ol>
  )
}
