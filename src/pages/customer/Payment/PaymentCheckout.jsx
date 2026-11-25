import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { clearUncertainPayment, paymentIsUncertain, rememberUncertainPayment } from './paymentAttemptMemory'
import { customerPaymentApi } from '~/apis/customer/customerPaymentApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import { Button } from '~/components/ui/button'
import { DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { formatCurrency } from '~/utils/format/formats'
import { getApiError } from '~/utils/http/apiError'
import { validatePaymentSession } from '~/utils/orders/paymentSession'
import { paymentRedirectUrl } from './paymentModel'
import { validSummary } from './combinedPaymentModel'
import PaymentSummary from './PaymentSummary'
import LegacyPaymentCheckout from './LegacyPaymentCheckout'

export default function PaymentCheckout(props) {
  return props.returned ? <LegacyPaymentCheckout {...props} /> : (
    <CombinedCheckout
      key={props.order.id}
      {...props}
    />
  )
}

function CombinedCheckout({ order, modal, onClose, refresh, pendingRequests, initialMethod }) {
  const { t } = useTranslation()
  const userId = useSelector(state => state.auth.user?.id)
  const [points, setPoints] = useState(0), [method, setMethod] = useState([2, 3].includes(initialMethod) ? initialMethod : 2)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [changed, setChanged] = useState(null)
  const [uncertain, setUncertain] = useState(pendingRequests.current.has(order.id) || paymentIsUncertain(userId, order.id))
  const resource = useCatalogResource(useCallback(signal => customerPaymentApi.getSummary(order.id, points, signal), [order.id, points]))
  const summary = changed || resource.data
  const session = summary?.quote.activeSession
  const blockedUncertain = uncertain && !session?.canContinue
  const lock = useRef(false), mounted = useRef(false)
  useEffect(() => {
    mounted.current = true; return () => {
      mounted.current = false
    }
  }, [])
  const quote = summary?.quote
  const selected = quote?.methods.find(row => row.paymentMethod === method)
  const pay = async () => {
    if (lock.current || !summary || blockedUncertain || resource.loading || (!session?.canContinue && (!quote.canCreate || !selected?.enabled))) {
      return
    }
    lock.current = true; setBusy(true); setError(''); pendingRequests.current.add(order.id)
    const purpose = session?.canContinue ? session.purpose : 4
    const paymentMethod = session?.canContinue ? session.paymentMethod : method
    const requested = session?.canContinue ? session.pointsToRedeem : quote.pointsToRedeem
    rememberUncertainPayment(userId, order.id, purpose)
    let navigating = false
    try {
      const result = purpose === 4
        ? await customerPaymentApi.checkout(order.id, paymentMethod, requested, quote.quoteToken)
        : purpose === 1 ? await customerPaymentApi.createUrl(order.id, paymentMethod, requested)
          : await customerPaymentApi.createFeeUrl(order.id, paymentMethod, purpose === 2 ? 'overdue' : 'cancellation')
      if (result.orderId !== order.id || result.purpose !== purpose) {
        throw new Error('customer.payment.invalidResponse')
      }
      if (result.summary && !result.paymentUrl) {
        if (!validSummary(result.summary, order.id)) {
          throw new Error('customer.payment.invalidResponse')
        }
        pendingRequests.current.delete(order.id)
        clearUncertainPayment(userId, order.id, purpose)
        if (mounted.current) {
          setChanged(result.summary); refresh?.()
        }
        return
      }
      if (result.paymentMethod !== paymentMethod || result.pointsToRedeem !== requested || !Number.isFinite(result.amount) || Math.abs(result.amount - (session?.canContinue ? session.amount : quote.cashAmount)) > .001) {
        throw new Error('customer.payment.invalidResponse')
      }
      if (validatePaymentSession(result) === 'completed') {
        pendingRequests.current.delete(order.id)
        clearUncertainPayment(userId, order.id, purpose)
        if (mounted.current) {
          resource.retry(); refresh?.()
        }
        return
      }
      const url = paymentRedirectUrl(result.paymentUrl)
      if (mounted.current) {
        navigating = true
        window.location.assign(url)
      }
    } catch (failure) {
      const status = failure.response?.status
      const next = failure.response?.data?.data?.summary
      const quoteChanged = status === 409 && failure.response?.data?.meta?.code === 'QuoteChanged' && validSummary(next, order.id)
      const insufficient = status === 409 && failure.response?.data?.meta?.code === 'InsufficientPoints'
      if (status && status < 500 && (status !== 409 || quoteChanged || insufficient)) {
        clearUncertainPayment(userId, order.id, purpose)
      }
      if (!mounted.current) {
        return
      }
      if (quoteChanged) {
        setChanged(next); setError('combined.quoteChanged'); pendingRequests.current.delete(order.id)
      } else {
        const unknown = !status || status >= 500 || status === 409 && !insufficient
        if (insufficient) {
          setPoints(0); setChanged(null)
        }
        if (unknown) {
          rememberUncertainPayment(userId, order.id, purpose)
        }
        setUncertain(unknown); setError(unknown ? 'combined.unavailable' : insufficient ? 'paymentSession.InsufficientPoints' : getApiError(failure))
        if (!unknown) {
          pendingRequests.current.delete(order.id)
        }
        resource.retry()
      }
    } finally {
      if (!navigating) {
        lock.current = false
      }
      if (mounted.current && !navigating) {
        setBusy(false)
      }
    }
  }
  const Heading = modal ? DialogTitle : 'h1'
  const Description = modal ? DialogDescription : 'p'
  return (
    <section className="flex min-h-0 flex-col">
      <header className="shrink-0 space-y-2 border-b bg-primary/5 p-6 pr-14">
        <Heading className="text-xl font-semibold">
          {t('combined.title')}
        </Heading>
        <Description className="text-sm text-muted-foreground">
          {order.orderCode}
        </Description>
      </header>
      <div className="min-h-0 space-y-5 overflow-y-auto p-6">
        {resource.loading || resource.error ? <ResourceFeedback {...resource} /> : summary && (
          <>
            <PaymentSummary summary={summary} />
            {summary.outstanding === 0 && (
              <p
                role="status"
                className="rounded-xl bg-primary/5 p-3 text-sm"
              >
                {t(summary.settled ? 'combined.settled' : 'combined.notDue')}
              </p>
            )}
            {!session && !summary.settled && summary.outstanding > 0 && (
              <>
                <label className="flex items-center gap-3 text-base font-medium">
                  <input
                    type="checkbox"
                    className="size-5 shrink-0 accent-primary"
                    checked={points > 0}
                    disabled={busy || uncertain || !quote.maximumPoints}
                    onChange={event => {
                      setChanged(null); setError(''); setPoints(event.target.checked ? quote.maximumPoints : 0)
                    }}
                  />
                  {t('loyalty.usePoints')}
                  {' '}
                  (
                  {quote.maximumPoints}
                  )
                </label>
                <fieldset
                  disabled={busy || uncertain}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  <legend className="mb-3 font-medium">
                    {t('customer.payment.method')}
                  </legend>
                  {quote.methods.map(option => (
                    <label
                      key={option.paymentMethod}
                      className={`flex items-center gap-3 rounded-xl border p-4 ${method === option.paymentMethod ? 'border-primary bg-primary/5' : ''}`}
                    >
                      <input
                        type="radio"
                        name="combined-method"
                        value={option.paymentMethod}
                        checked={method === option.paymentMethod}
                        disabled={!option.enabled}
                        onChange={() => setMethod(option.paymentMethod)}
                      />
                      {option.paymentMethod === 2 ? 'VNPay' : 'MoMo'}
                    </label>
                  ))}
                </fieldset>
              </>
            )}
            {quote.message && !session && (
              <p className="text-sm text-muted-foreground">
                {quote.message}
              </p>
            )}
            {session && (
              <p className="rounded-xl bg-amber-500/10 p-3 text-sm">
                {t('combined.existing')}
                {' '}
                ·
                {' '}
                {session.paymentMethod === 2 ? 'VNPay' : 'MoMo'}
                {' '}
                ·
                {' '}
                {formatCurrency(session.amount)}
              </p>
            )}
            {error && (
              <p
                role="alert"
                className="text-sm text-destructive"
              >
                {t(error)}
              </p>
            )}
          </>
        )}
      </div>
      <footer className="flex flex-wrap justify-end gap-3 border-t bg-card p-6">
        <Button
          variant="secondary"
          className="h-12 rounded-xl px-6 text-base"
          disabled={busy}
          onClick={onClose}
        >
          {t('common.close')}
        </Button>
        {summary && !summary.settled && summary.outstanding > 0 && (
          <Button
            className="h-12 rounded-xl px-6 text-base"
            disabled={busy || blockedUncertain || resource.loading || (!session?.canContinue && (!quote.canCreate || !selected?.enabled))}
            onClick={pay}
          >
            {t(busy ? 'customer.payment.redirecting' : session?.canContinue ? 'combined.continue' : changed ? 'combined.confirmAgain' : 'customer.orders.pay')}
            {' '}
            {formatCurrency(session?.canContinue ? session.amount : quote.cashAmount)}
          </Button>
        )}
      </footer>
    </section>
  )
}
