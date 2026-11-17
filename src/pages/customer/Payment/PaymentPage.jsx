import PaymentDialog from './PaymentDialog'
import PaymentCheckout from './PaymentCheckout'
import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Breadcrumb from '~/components/Breadcrumb/Breadcrumb'
import { Button } from '~/components/ui/button'
import CatalogFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import { customerPaymentApi } from '~/apis/customer/customerPaymentApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import { CUSTOMER_ROUTES } from '~/utils/config/constants'
import { returnedOrderCode, returnedFee } from './paymentModel'

export default function PaymentPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  return orderId ? (
    <PaymentDialog
      orderId={orderId}
      onClose={() => navigate(CUSTOMER_ROUTES.ORDER_DETAIL.replace(':orderId', orderId), { replace: true })}
    />
  ) : <PaymentReturnPage />
}

function PaymentReturnPage() {
  const { t } = useTranslation()
  useEffect(() => {
    document.title = `${t('customer.payment.title')} | WashGo`
  }, [t])
  const [params] = useSearchParams()
  const pendingRequests = useRef(new Set())
  const code = returnedOrderCode(params)
  const feeReturn = returnedFee(params)
  const load = useCallback((signal) => customerPaymentApi.findReturnedOrder(code, signal), [code])
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
            returned
            refresh={resource.retry}
            pendingRequests={pendingRequests}
          />
        )}
      </div>
    </div>
  )
}
