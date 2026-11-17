import { Banknote, CreditCard, Wallet } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import { PAYMENT_OPTIONS, ORDER_PAYMENT_METHODS, UI_TRANSITIONS } from '~/utils/config/constants'
import { cn } from '~/lib/utils'
import { paymentAmountHint, paymentEligibility } from '~/utils/orders/paymentEligibility'

const icons = { [ORDER_PAYMENT_METHODS.CASH]: Banknote, [ORDER_PAYMENT_METHODS.VNPAY]: CreditCard, [ORDER_PAYMENT_METHODS.MOMO]: Wallet }

export default function PaymentMethodPicker({ value, onChange, disabled, onlineOnly = false, lockedMethod = null, amount }) {
  const { t } = useTranslation()
  const id = useId()
  const amountHint = lockedMethod != null && amount != null ? null : paymentAmountHint(amount)
  const hint = amountHint === 'paymentLimits.bankLimits' ? null : amountHint
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
          const eligibility = paymentEligibility(option.value, amount)
          const optionDisabled = disabled || !eligibility.allowed || lockedMethod != null && option.value !== lockedMethod
          return (
            <label
              key={option.value}
              className={cn('flex cursor-pointer items-center gap-3 rounded-xl border p-4 hover:border-primary/50', UI_TRANSITIONS.BUTTON,
                value === option.value ? 'border-primary/50 bg-primary/8 text-primary' : 'border-border bg-card', optionDisabled && 'cursor-not-allowed opacity-50')}
            >
              <Icon className="size-5 shrink-0" />
              <span className="flex-1 text-sm font-medium leading-5 text-foreground">
                {t(option.label)}
                {eligibility.reason && (
                  <span
                    id={`${id}-${option.value}`}
                    className="mt-1 block text-xs font-normal leading-5"
                  >
                    {t(eligibility.reason)}
                  </span>
                )}
              </span>
              <RadioGroupItem
                disabled={optionDisabled}
                className="scroll-mt-[var(--customer-header-offset,7rem)]"
                value={String(option.value)}
                aria-label={t(option.label)}
                aria-describedby={eligibility.reason ? `${id}-${option.value}` : undefined}
              />
            </label>
          )
        })}
      </RadioGroup>
      {hint && (
        <p
          role="status"
          className="rounded-xl bg-primary/5 p-3 text-sm leading-6 text-muted-foreground"
        >
          {t(hint)}
        </p>
      )}
    </fieldset>
  )
}
