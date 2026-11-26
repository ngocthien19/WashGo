import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, CircleX, Ban, LoaderCircle, PackageCheck, ClipboardList, ArrowRight, CreditCard } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { customerPaymentApi } from '~/apis/customer/customerPaymentApi'
import { CUSTOMER_ROUTES, PAYMENT_RETURN_POLL } from '~/utils/config/constants'
import { getApiError } from '~/utils/http/apiError'
import { formatCurrency } from '~/utils/format/formats'
import { paymentContext, paymentResultUrl } from './paymentOutcome'
import PaymentSummary from './PaymentSummary'
import { resolveUncertainPayment } from './paymentAttemptMemory'

export default function PaymentResultPage({ embedded = false, orderId }) {
  const [params] = useSearchParams()
  const userId = useSelector(state => state.auth.user?.id)
  const context = useMemo(() => paymentContext(params), [params])
  if (embedded && (!context || context.orderId !== orderId)) {
    return null
  }
  return (
    <PaymentResult
      key={`${userId}:${JSON.stringify(context)}`}
      context={context}
      embedded={embedded}
    />
  )
}
function PaymentResult({ context, embedded }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const userId = useSelector(state => state.auth.user?.id)
  const [result, setResult] = useState(null), [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    let timer, reads = 0
    if (!context) {
      navigate(CUSTOMER_ROUTES.ORDERS, { replace: true })
      return () => controller.abort()
    }
    const read = () => customerPaymentApi.getResult(context, controller.signal).then(value => {
      if (controller.signal.aborted) {
        return
      }
      resolveUncertainPayment(userId, value)
      if (!['success', 'failed', 'cancelled'].includes(value.resultPage)) {
        if (value.status !== 'Pending') {
          navigate(CUSTOMER_ROUTES.ORDER_DETAIL.replace(':orderId', context.orderId), { replace: true })
          return
        }
        if (value.status === 'Pending' && ++reads < PAYMENT_RETURN_POLL.MAX_READS) {
          const seconds = Number.isFinite(value.retryAfterSeconds) ? value.retryAfterSeconds : 3
          timer = setTimeout(read, Math.max(2, Math.min(120, seconds)) * 1000)
        } else {
          setError('combined.unavailable')
        }
        return
      }
      setResult(value)
      navigate(paymentResultUrl(context, value.resultPage), { replace: true })
    }).catch(failure => {
      if (!controller.signal.aborted) {
        setError(getApiError(failure))
      }
    })
    read()
    return () => {
      controller.abort(); clearTimeout(timer)
    }
  }, [context, embedded, navigate, userId])
  const status = result?.status
  useEffect(() => {
    if (status) {
      document.title = `${t(`paymentResult.status.${status}`)} | WashGo`
    }
  }, [status, t])
  if (!result) {
    return !embedded && error ? (
      <div
        role="alert"
        className="mx-auto max-w-2xl p-6 text-destructive"
      >
        {t(error)}
      </div>
    ) : !embedded ? (
      <div
        role="status"
        aria-label={t('common.loading')}
        className="grid min-h-[50vh] place-items-center"
      >
        <LoaderCircle
          aria-hidden="true"
          className="size-8 animate-spin text-primary"
        />
      </div>
    ) : null
  }
  const outcomeTone = status === 'Succeeded'
    ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300'
    : status === 'Cancelled' ? 'border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-300'
      : 'border-destructive/20 bg-destructive/5 text-destructive'
  return (
    <div className={embedded ? 'space-y-4' : 'mx-auto min-h-[65vh] max-w-3xl px-4 py-8 sm:py-12'}>
      <section
        className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm"
      >
        <header className={`flex items-start gap-4 border-b p-5 sm:p-7 ${outcomeTone}`}>
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-current/5 ring-1 ring-current/15">
            {status === 'Succeeded' ? (
              <CheckCircle2
                aria-hidden="true"
                className="size-8"
              />
            ) : status === 'Cancelled' ? (
              <Ban
                aria-hidden="true"
                className="size-8"
              />
            ) : (
              <CircleX
                aria-hidden="true"
                className="size-8"
              />
            )}
          </span>
          <div className="min-w-0 space-y-2">
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">
              {t(`paymentResult.status.${status}`)}
            </h1>
            <p
              role="status"
              className="text-sm leading-6 text-muted-foreground"
            >
              {t(`paymentResult.description.${status}`)}
            </p>
          </div>
        </header>
        <div className="space-y-5 p-5 sm:p-7">
          {result && (
            <div className="grid gap-4 rounded-xl border border-border/70 bg-muted/20 p-4 sm:grid-cols-2 sm:p-5">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t('paymentResultDetails.orderCode')}
                </p>
                <p className="break-all font-semibold text-primary">
                  {result.orderCode}
                </p>
                {context.purpose !== 4 && (
                  <p className="text-sm text-muted-foreground">
                    {t(`paymentResult.purpose.${context.purpose}`)}
                  </p>
                )}
              </div>
              {Number.isFinite(result.amount) && (
                <div className="space-y-2 sm:border-l sm:pl-5">
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard
                      size={16}
                      aria-hidden="true"
                    />
                    {t('paymentResultDetails.amount')}
                  </p>
                  <p className="text-2xl font-bold tabular-nums text-primary">
                    {formatCurrency(result.amount)}
                  </p>
                </div>
              )}
            </div>
          )}
          {result?.supersededByNewerSession && (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {t('paymentResult.older')}
            </p>
          )}
          {result?.summary && <PaymentSummary summary={result.summary} />}
          {!!result?.allocations?.length && (
            <ul className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4 text-sm">
              {result.allocations.map(row => (
                <li
                  key={row.purpose}
                  className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"
                >
                  <span className="text-muted-foreground">
                    {t(`paymentResult.purpose.${row.purpose}`)}
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(row.cashAmount)}
                    {' '}
                    ·
                    {' '}
                    {row.points}
                    {' '}
                    {t('combined.points')}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {error && (
            <p
              role="alert"
              className="text-sm text-destructive"
            >
              {t(error)}
            </p>
          )}
        </div>
        <footer className="flex flex-col gap-3 border-t border-border/70 bg-muted/20 p-5 sm:flex-row sm:flex-wrap sm:justify-end sm:p-6">
          {result?.capabilities.canViewOrder && (
            <Button
              variant="outline"
              className="h-12 rounded-xl border-emerald-500/25 bg-emerald-500/5 px-5 text-base text-emerald-700 hover:border-emerald-500/40 hover:bg-emerald-500/15 hover:text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-500/5 dark:text-emerald-300 dark:hover:bg-emerald-500/15 dark:hover:text-emerald-200"
              nativeButton={false}
              render={<Link to={CUSTOMER_ROUTES.ORDER_DETAIL.replace(':orderId', context.orderId)} />}
            >
              <PackageCheck aria-hidden="true" />
              {t('paymentResult.order')}
            </Button>
          )}
          {(result?.capabilities.canRetry || result?.capabilities.canContinue) && (
            <Button
              variant="outline-violet"
              className="h-12 rounded-xl px-5 text-base"
              nativeButton={false}
              render={<Link to={CUSTOMER_ROUTES.ORDER_DETAIL.replace(':orderId', context.orderId)} />}
            >
              <ArrowRight aria-hidden="true" />
              {t('paymentResult.continue')}
            </Button>
          )}
          <Button
            className="h-12 rounded-xl px-5 text-base"
            nativeButton={false}
            render={<Link to={CUSTOMER_ROUTES.ORDERS} />}
          >
            <ClipboardList aria-hidden="true" />
            {t('paymentResult.orders')}
          </Button>
        </footer>
      </section>
    </div>
  )
}
