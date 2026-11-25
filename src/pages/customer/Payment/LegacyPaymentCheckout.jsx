import LoyaltyPaymentChoice from './LoyaltyPaymentChoice'
import { paymentEligibility } from '~/utils/orders/paymentEligibility'
import { paymentFailure, validatePaymentSession } from '~/utils/orders/paymentSession'
import { Fragment, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CircleCheck, CreditCard, Info, ShieldCheck } from 'lucide-react'
import { DialogTitle, DialogDescription } from '~/components/ui/dialog'
import Reveal from '~/components/motion/Reveal'
import { Button } from '~/components/ui/button'
import FormError from '~/components/ui/FormError'
import PaymentMethodPicker from '~/components/customer/payments/PaymentMethodPicker'
import { customerPaymentApi } from '~/apis/customer/customerPaymentApi'
import { CUSTOMER_ROUTES, ORDER_PAYMENT_METHODS, PAYMENT_STATUSES } from '~/utils/config/constants'
import { formatCurrency } from '~/utils/format/formats'
import { getApiError } from '~/utils/http/apiError'
import { onlinePaymentMethod, paymentBlockReason, paymentRedirectUrl } from './paymentModel'

export default function PaymentCheckout({ order, returned = false, refresh, pendingRequests, modal = false, onClose }) {
  const { t } = useTranslation()
  const [method, setMethod] = useState(onlinePaymentMethod(order.paymentMethod) ? order.paymentMethod : ORDER_PAYMENT_METHODS.VNPAY)
  const [busy, setBusy] = useState(false)
  const [loyalty, setLoyalty] = useState({ quote: null, dirty: false, loading: true })
  const [quoteRevision, setQuoteRevision] = useState(0)
  const [fixed, setFixed] = useState(null)
  const [retryWait, setRetryWait] = useState(false)
  useEffect(() => {
    if (!fixed) {
      return
    }
    const timer = setTimeout(() => setRetryWait(false), fixed.retryAfter * 1000)
    return () => clearTimeout(timer)
  }, [fixed])
  const [error, setError] = useState(pendingRequests.current.has(order.id) ? 'customer.payment.uncertain' : '')
  const [uncertain, setUncertain] = useState(pendingRequests.current.has(order.id))
  const lock = useRef(pendingRequests.current.has(order.id))
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const paid = order.paymentStatus === PAYMENT_STATUSES.PAID
  const blocked = paymentBlockReason(order)
  const Heading = modal ? DialogTitle : 'h1'
  const Description = modal ? DialogDescription : 'p'
  const Wrapper = modal ? Fragment : Reveal
  const cashAmount = fixed?.cashAmount ?? loyalty.quote?.cashAmount
  const amountAllowed = paymentEligibility(method, cashAmount).allowed
  const pay = async () => {
    if (lock.current || !amountAllowed || blocked || uncertain || returned || retryWait || !fixed && (loyalty.dirty || loyalty.loading) || !onlinePaymentMethod(method)) {
      return
    }
    lock.current = true
    pendingRequests.current.add(order.id)
    setBusy(true)
    setError('')
    try {
      const points = fixed?.points ?? loyalty.quote?.pointsToRedeem ?? 0
      const result = await customerPaymentApi.createUrl(order.id, method, points)
      const expectedCash = fixed?.cashAmount ?? loyalty.quote?.cashAmount
      if (result.orderId !== order.id || result.paymentMethod !== method || !Number.isFinite(result.amount) || result.amount <= 0 || expectedCash != null && Math.abs(result.amount - expectedCash) > .001 || result.purpose != null && result.purpose !== 1 || result.pointsToRedeem != null && result.pointsToRedeem !== points || points > 0 && result.pointsToRedeem !== points) {
        throw new Error('customer.payment.invalidResponse')
      }
      const session = validatePaymentSession(result)
      if (session === 'completed') {
        if (mounted.current) {
          refresh()
        }
        return
      }

      const url = paymentRedirectUrl(result.paymentUrl)
      if (mounted.current) {
        window.location.assign(url)
      }
    } catch (failure) {
      const outcome = paymentFailure(failure)
      const unknown = outcome.locked && !outcome.initializing
      if (!outcome.locked) {
        pendingRequests.current.delete(order.id)
        setFixed(null)
        setRetryWait(false)
      }
      if (!mounted.current) {
        return
      }
      setUncertain(unknown)
      setError(outcome.message || getApiError(failure))
      if (outcome.initializing) {
        setRetryWait(true)
        setFixed({ points: fixed?.points ?? loyalty.quote?.pointsToRedeem ?? 0, cashAmount: fixed?.cashAmount ?? loyalty.quote?.cashAmount, retryAfter: outcome.retryAfter })
      }
      if (outcome.reloadQuote) {
        setQuoteRevision(value => value + 1)
      }
      lock.current = unknown
      setBusy(false)
    }
  }
  return (
    <Wrapper>
      <section className={modal ? 'flex min-h-0 flex-1 flex-col overflow-hidden bg-card' : 'overflow-hidden rounded-3xl border border-border bg-card shadow-sm'}>
        <header
          data-dialog-header
          className="flex shrink-0 items-center gap-4 border-b border-border bg-primary/5 p-6 pr-14"
        >
          {paid ? <CircleCheck className="size-10 shrink-0 text-emerald-600" /> : <CreditCard className="size-10 shrink-0 text-primary" />}
          <div className="min-w-0">
            <Heading className="text-2xl font-bold">
              {t(paid ? 'customer.payment.paid' : 'customer.payment.title')}
            </Heading>
            <Description className="mt-1 break-all font-medium text-primary">
              {order.orderCode}
            </Description>
          </div>
        </header>
        <div className={modal ? 'min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-6' : 'space-y-6 p-6'}>
          <p className="text-lg font-semibold text-foreground sm:text-xl">
            {order.lockerName}
          </p>
          <dl className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-primary/5 p-5">
            <dt className="font-medium">
              {t(paid ? 'loyalty.laundryAmount' : loyalty.quote ? 'loyalty.gatewayAmount' : 'customer.payment.amount')}
            </dt>
            <dd className="text-2xl font-bold tabular-nums text-primary">
              {formatCurrency(!paid && loyalty.quote ? loyalty.quote.cashAmount : order.finalAmount)}
            </dd>
          </dl>
          {!paid && !returned && (
            <>
              {!blocked && !returned && (
                <LoyaltyPaymentChoice
                  key={quoteRevision}
                  orderId={order.id}
                  disabled={busy || uncertain || !!fixed}
                  onChange={setLoyalty}
                />
              )}
              <PaymentMethodPicker
                value={method}
                onChange={setMethod}
                disabled={busy || !!blocked || uncertain || returned || !!fixed}
                onlineOnly
                amount={cashAmount}
              />
              <p
                role="status"
                className="flex items-start gap-2 rounded-xl bg-amber-500/10 p-4 text-sm leading-6"
              >
                <Info className="mt-1 size-4 shrink-0 text-amber-600" />
                {t(blocked || 'customer.payment.redirectNote')}
              </p>
              <FormError>
                {error}
              </FormError>
            </>
          )}
        </div>
        <footer className="flex shrink-0 items-stretch gap-3 border-t border-border bg-card p-6">
          {modal ? (
            <Button
              className="h-12 shrink-0 px-5 text-base"
              variant="secondary"
              onClick={onClose}
            >
              {t('common.close')}
            </Button>
          ) : (
            <Button
              className="h-12 shrink-0 px-4 text-sm sm:text-base"
              variant="outline-violet"
              render={<Link to={CUSTOMER_ROUTES.ORDERS} />}
              nativeButton={false}
            >
              {t('common.myOrders')}
            </Button>
          )}
          {!paid && !returned && (
            <Button
              className="h-12 min-w-0 flex-1 whitespace-normal px-3 text-sm leading-snug sm:text-base"
              disabled={busy || !amountAllowed || !!blocked || uncertain || retryWait || !fixed && (loyalty.dirty || loyalty.loading)}
              onClick={pay}
            >
              <ShieldCheck size={18} />
              {t(busy ? 'customer.payment.redirecting' : fixed ? 'paymentSession.retrySame' : 'customer.payment.pay')}
            </Button>
          )}
        </footer>
      </section>
    </Wrapper>
  )
}
