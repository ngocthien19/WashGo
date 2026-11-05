import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CircleCheck, Eye, EyeOff, Home, PanelsTopLeft, Info, KeyRound, ArrowRight } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { CUSTOMER_ROUTES } from '~/utils/constants'
import { formatCurrency } from '~/utils/formats'

export default function OrderSuccess({ order }) {
  const { t } = useTranslation()
  const [showPin, setShowPin] = useState(false)
  return (
    <section
      aria-labelledby="order-success-title"
      className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-emerald-500/20 bg-card shadow-sm"
    >
      <div className="bg-gradient-to-br from-emerald-500/12 to-card p-7 text-center sm:p-10">
        <CircleCheck className="mx-auto mb-5 size-14 text-emerald-600 dark:text-emerald-400" />
        <h1
          id="order-success-title"
          tabIndex={-1}
          className="text-3xl font-bold tracking-tight outline-none"
        >
          {t('customer.order.success')}
        </h1>
        <p className="mt-3 break-all text-lg font-semibold text-primary">
          {order.orderCode}
        </p>
      </div>
      <div className="space-y-5 p-6 sm:p-8">
        <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/25 p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <PanelsTopLeft size={22} />
          </span>
          <div className="min-w-0">
            <h2 className="break-words font-semibold">
              {order.lockerName}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('customer.order.box', { number: order.boxNumber })}
            </p>
          </div>
        </div>
        <dl className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/10 bg-primary/5 p-4">
          <dt className="font-medium">
            {t('customer.order.total')}
          </dt>
          <dd className="text-2xl font-bold tabular-nums text-primary">
            {formatCurrency(order.finalAmount)}
          </dd>
        </dl>
        {Number.isFinite(order.includedWeightKg) && order.includedWeightKg > 0 && (
          <p className="text-xs text-muted-foreground">
            {t('customer.order.includedWeight', { weight: order.includedWeightKg })}
          </p>
        )}
        {order.depositPinCode && (
          <div className="rounded-2xl border border-border bg-muted/15 p-4 sm:p-5">
            <p className="flex items-center gap-2 text-sm font-medium">
              <KeyRound className="size-4 text-primary" />
              {t('customer.order.depositPin')}
            </p>
            <div className="mt-3 flex items-center justify-between gap-4">
              <span className="font-mono text-2xl tracking-[0.25em]">
                {showPin ? order.depositPinCode : '••••••'}
              </span>
              <Button
                size="icon-lg"
                variant="secondary"
                aria-label={t(showPin ? 'customer.order.hidePin' : 'customer.order.showPin')}
                aria-pressed={showPin}
                onClick={() => setShowPin(!showPin)}
              >
                {showPin ? <EyeOff /> : <Eye />}
              </Button>
            </div>
          </div>
        )}
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4">
          <Info className="mt-1 size-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
          <p className="text-sm leading-7 text-muted-foreground">
            {t('customer.order.successNote')}
          </p>
        </div>
        <Button
          render={<Link to={CUSTOMER_ROUTES.HOME} />}
          nativeButton={false}
          variant="outline-violet"
          className="h-11 w-full gap-3 rounded-xl px-5"
        >
          <Home size={17} />
          {t('common.home')}
          <ArrowRight className="ml-auto transition-transform delay-0 duration-150 ease-out group-hover/button:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none" />
        </Button>
      </div>
    </section>
  )
}
