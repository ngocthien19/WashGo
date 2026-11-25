import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, CircleX, Ban, LoaderCircle } from 'lucide-react'
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
  return (
    <div className={embedded ? 'space-y-4' : 'mx-auto min-h-[65vh] max-w-2xl space-y-6 px-4 py-14'}>
      <section
        className="space-y-5 rounded-2xl border bg-card p-6 sm:p-8"
      >
        {status === 'Succeeded' ? <CheckCircle2 className="size-12 text-emerald-500" /> : status === 'Cancelled' ? <Ban className="size-12 text-muted-foreground" /> : <CircleX className="size-12 text-destructive" />}
        <h1 className="text-2xl font-semibold">
          {t(`paymentResult.status.${status}`)}
        </h1>
        <p
          role="status"
          className="text-muted-foreground"
        >
          {t(!context ? 'paymentResult.missing' : result ? `paymentResult.description.${status}` : 'paymentResult.loading')}
        </p>
        {result && (
          <div className="space-y-2 text-sm">
            <p className="font-semibold">
              {result.orderCode}
            </p>
            <p>
              {t(`paymentResult.purpose.${context.purpose}`)}
            </p>
            {Number.isFinite(result.amount) && (
              <p>
                {formatCurrency(result.amount)}
              </p>
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
          <ul className="space-y-2 text-sm">
            {result.allocations.map(row => (
              <li key={row.purpose}>
                {t(`paymentResult.purpose.${row.purpose}`)}
                :
                {' '}
                {formatCurrency(row.cashAmount)}
                {' '}
                ·
                {' '}
                {row.points}
                {' '}
                {t('combined.points')}
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
        <div className="flex flex-wrap gap-3">
          {result?.capabilities.canViewOrder && (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to={CUSTOMER_ROUTES.ORDER_DETAIL.replace(':orderId', context.orderId)} />}
            >
              {t('paymentResult.order')}
            </Button>
          )}
          {(result?.capabilities.canRetry || result?.capabilities.canContinue) && (
            <Button
              nativeButton={false}
              render={<Link to={CUSTOMER_ROUTES.ORDER_DETAIL.replace(':orderId', context.orderId)} />}
            >
              {t('paymentResult.continue')}
            </Button>
          )}
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to={CUSTOMER_ROUTES.ORDERS} />}
          >
            {t('paymentResult.orders')}
          </Button>
        </div>
      </section>
    </div>
  )
}
