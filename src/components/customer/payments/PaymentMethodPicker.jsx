import { Banknote, CreditCard, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import { PAYMENT_OPTIONS, ORDER_PAYMENT_METHODS, UI_TRANSITIONS } from '~/utils/constants'
import { cn } from '~/lib/utils'

const icons = { [ORDER_PAYMENT_METHODS.CASH]: Banknote, [ORDER_PAYMENT_METHODS.VNPAY]: CreditCard, [ORDER_PAYMENT_METHODS.MOMO]: Wallet }

export default function PaymentMethodPicker({ value, onChange, disabled, onlineOnly = false }) {
  const { t } = useTranslation()
  return (
    <fieldset
      disabled={disabled}
      className="min-w-0 space-y-3"
    >
      <legend className="mb-3 font-semibold">
        {t('customer.payment.method')}
      </legend>
      <RadioGroup
        value={String(value)}
        onValueChange={(next) => onChange(Number(next))}
        disabled={disabled}
        aria-label={t('customer.payment.method')}
        className="gap-3 sm:grid-cols-2"
      >
        {PAYMENT_OPTIONS.filter((option) => !onlineOnly || option.value !== ORDER_PAYMENT_METHODS.CASH).map((option) => {
          const Icon = icons[option.value]
          return (
            <label
              key={option.value}
              className={cn('flex cursor-pointer items-center gap-3 rounded-xl border p-4 hover:border-primary/50', UI_TRANSITIONS.BUTTON,
                value === option.value ? 'border-primary/50 bg-primary/8 text-primary' : 'border-border bg-card', disabled && 'cursor-default opacity-70')}
            >
              <Icon className="size-5 shrink-0" />
              <span className="flex-1 text-sm font-medium leading-5 text-foreground">
                {t(option.label)}
              </span>
              <RadioGroupItem
                value={String(option.value)}
                aria-label={t(option.label)}
              />
            </label>
          )
        })}
      </RadioGroup>
    </fieldset>
  )
}
