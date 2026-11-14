import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { CircleCheck, CreditCard, Info, RefreshCw, ShieldCheck } from 'lucide-react'
import Breadcrumb from '~/components/Breadcrumb/Breadcrumb'
import Reveal from '~/components/motion/Reveal'
import { Button } from '~/components/ui/button'
import FormError from '~/components/ui/FormError'
import CatalogFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import PaymentMethodPicker from '~/components/customer/payments/PaymentMethodPicker'
import { customerPaymentApi } from '~/apis/customer/customerPaymentApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import { CUSTOMER_ROUTES, ORDER_PAYMENT_METHODS, PAYMENT_STATUSES } from '~/utils/constants'
import { formatCurrency } from '~/utils/formats'
import { getApiError } from '~/utils/apiError'
import { onlinePaymentMethod, paymentBlockReason, paymentRedirectUrl, returnedOrderCode, returnedFee } from './paymentModel'

export default function PaymentPage() {
  const { t } = useTranslation()
  useEffect(() => {
    document.title = `${t('customer.payment.title')} | WashGo`
  }, [t])
  const { orderId } = useParams()
  const [params] = useSearchParams()
  const pendingRequests = useRef(new Set())
  const code = returnedOrderCode(params)
  const feeReturn = !orderId && returnedFee(params)
  const load = useCallback((signal) => orderId
    ? customerPaymentApi.getOrder(orderId, signal) : customerPaymentApi.findReturnedOrder(code, signal), [orderId, code])
  const resource = useCatalogResource(load)
  const order = resource.data
  // Changing orders resets the checkout state without letting old responses affect a new checkout.
  return (
    <div className="min-h-[70dvh] bg-muted/30 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <Breadcrumb items={[{ label: t('common.home'), to: CUSTOMER_ROUTES.HOME }, { label: t('customer.payment.title') }]} />
        {resource.loading || resource.error ? (
          <CatalogFeedback
            {...resource}
            loadingText="customer.payment.loading"
          />
        ) : feeReturn ? (
          <section className="grid gap-5 rounded-2xl border border-border bg-card p-6">
            <h1 className="text-2xl font-bold">
              {t('customer.sync.feeReturnTitle')}
            </h1>
            <p className="font-semibold text-primary">
              {order.orderCode}
            </p>
            <p className="leading-7 text-muted-foreground">
              {t('customer.sync.feeReturnHint')}
            </p>
            <Button
              className="h-11 text-base px-4"
              variant="outline"
              onClick={resource.retry}
            >
              {t('customer.payment.refresh')}
            </Button>
            <Button
              className="h-11 text-base px-4"
              render={<Link to={CUSTOMER_ROUTES.ORDER_DETAIL.replace(':orderId', order.id)} />}
              nativeButton={false}
            >
              {t('customer.orders.details')}
            </Button>
          </section>
        ) : (
          <PaymentCheckout
            key={`${order.id}:${order.paymentStatus}:${order.status}`}
            order={order}
            returned={!orderId}
            refresh={resource.retry}
            pendingRequests={pendingRequests}
          />
        )}
      </div>
    </div>
  )
}

function PaymentCheckout({ order, returned, refresh, pendingRequests }) {
  const { t } = useTranslation()
  const [method, setMethod] = useState(onlinePaymentMethod(order.paymentMethod) ? order.paymentMethod : ORDER_PAYMENT_METHODS.VNPAY)
  const [busy, setBusy] = useState(false)
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
  const pay = async () => {
    if (lock.current || blocked || uncertain || returned || !onlinePaymentMethod(method)) {
      return
    }
    lock.current = true
    pendingRequests.current.add(order.id)
    setBusy(true)
    setError('')
    try {
      const result = await customerPaymentApi.createUrl(order.id, method)
      if (result.orderId !== order.id || result.paymentMethod !== method || !Number.isFinite(result.amount) || result.amount < 0) {
        throw new Error('customer.payment.invalidResponse')
      }
      const url = paymentRedirectUrl(result.paymentUrl)
      if (mounted.current) {
        window.location.assign(url)
      }
    } catch (failure) {
      const status = failure.response?.status
      const unknown = !status || status >= 500
      if (!unknown) {
        pendingRequests.current.delete(order.id)
      }
      if (!mounted.current) {
        return
      }
      setUncertain(unknown)
      setError(unknown ? 'customer.payment.uncertain' : getApiError(failure))
      lock.current = unknown
      setBusy(false)
    }
  }
  return (
    <Reveal>
      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-4 border-b border-border bg-primary/5 p-6">
          {paid ? <CircleCheck className="size-10 shrink-0 text-emerald-600" /> : <CreditCard className="size-10 shrink-0 text-primary" />}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">
              {t(paid ? 'customer.payment.paid' : 'customer.payment.title')}
            </h1>
            <p className="mt-1 break-all font-medium text-primary">
              {order.orderCode}
            </p>
          </div>
        </div>
        <div className="space-y-6 p-6">
          <p className="text-muted-foreground">
            {order.lockerName}
          </p>
          <dl className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-primary/5 p-5">
            <dt className="font-medium">
              {t('customer.payment.amount')}
            </dt>
            <dd className="text-2xl font-bold tabular-nums text-primary">
              {formatCurrency(order.finalAmount)}
            </dd>
          </dl>
          {!paid && (
            <>
              <PaymentMethodPicker
                value={method}
                onChange={setMethod}
                disabled={busy || !!blocked || uncertain || returned}
                onlineOnly
              />
              <p
                role="status"
                className="flex items-start gap-2 rounded-xl bg-amber-500/10 p-4 text-sm leading-6"
              >
                <Info className="mt-1 size-4 shrink-0 text-amber-600" />
                {t(blocked || (returned ? 'customer.payment.pendingConfirmation' : 'customer.payment.redirectNote'))}
              </p>
              <FormError>
                {error}
              </FormError>
              {!returned && (
                <Button
                  className="h-11 w-full"
                  disabled={busy || !!blocked || uncertain}
                  onClick={pay}
                >
                  <ShieldCheck size={18} />
                  {t(busy ? 'customer.payment.redirecting' : 'customer.payment.pay')}
                </Button>
              )}
            </>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              className="h-11 text-base px-4"
              variant="outline"
              disabled={busy}
              onClick={refresh}
            >
              <RefreshCw size={16} />
              {t('customer.payment.refresh')}
            </Button>
            <Button
              className="h-11 text-base px-4"
              variant="outline-violet"
              render={<Link to={CUSTOMER_ROUTES.ORDERS} />}
              nativeButton={false}
            >
              {t('common.myOrders')}
            </Button>
          </div>
        </div>
      </section>
    </Reveal>
  )
}
