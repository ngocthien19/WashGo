import { useTranslation } from 'react-i18next'
import { cn } from '~/lib/utils'
import { Check } from 'lucide-react'

const steps = [
  { key: 'services' },
  { key: 'locker' },
  { key: 'confirm' }
]

export default function OrderStepper({ step }) {
  const { t } = useTranslation()
  return (
    <ol
      aria-label={t('customer.order.steps')}
      className="grid grid-cols-3 rounded-2xl border border-border/70 bg-card px-3 py-6 shadow-sm sm:px-10"
    >
      {steps.map(({ key }, index) => (
        <li
          key={key}
          aria-current={step === index ? 'step' : undefined}
          className="relative flex flex-col items-center gap-3 text-center"
        >
          {index < steps.length - 1 && (
            <span
              aria-hidden="true"
              className={cn('absolute left-[calc(50%+1.5rem)] right-[calc(-50%+1.5rem)] top-4 h-0.5 sm:top-5', step > index ? 'bg-primary/70' : 'bg-border')}
            />
          )}
          <span className={cn('relative grid size-8 place-items-center rounded-full text-sm font-semibold sm:size-10', step >= index ? 'bg-primary text-primary-foreground ring-4 ring-primary/15' : 'bg-muted text-muted-foreground ring-1 ring-border')}>
            {step > index ? <Check size={19} /> : index + 1}
            {step > index && (
              <span className="sr-only">
                {t('customer.order.completedStep', { number: index + 1 })}
              </span>
            )}
          </span>
          <span className={cn('text-xs sm:text-sm', step === index ? 'font-medium text-primary' : 'text-muted-foreground')}>
            {t(`customer.order.${key}`)}
          </span>
        </li>
      ))}
    </ol>
  )
}
