import ReceiptDownload from './components/ReceiptDownload'
import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import OrderReceiptDocument from './components/OrderReceiptDocument'
import { Button } from '~/components/ui/button'
import CatalogFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import { customerReceiptApi } from '~/apis/customer/customerReceiptApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import { CUSTOMER_ROUTES } from '~/utils/config/constants'

export default function OrderReceiptPage() {
  const { t } = useTranslation()
  const { orderId } = useParams()
  const load = useCallback((signal) => customerReceiptApi.get(orderId, signal), [orderId])
  const resource = useCatalogResource(load)
  const order = resource.data
  useEffect(() => {
    document.title = `${t('customer.orders.receipt.title')}${order?.orderCode ? ` ${order.orderCode}` : ''} | WashGo`
  }, [order?.orderCode, t])
  return (
    <div className="min-h-[60dvh] bg-muted/30 px-4 py-8 print:min-h-0 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl space-y-5 print:max-w-none">
        <div className="flex flex-wrap justify-between gap-3 print:hidden">
          <Button
            className="h-11 rounded-xl px-4"
            variant="outline"
            render={<Link to={CUSTOMER_ROUTES.ORDER_DETAIL.replace(':orderId', orderId)} />}
            nativeButton={false}
          >
            <ArrowLeft size={16} />
            {t('customer.orders.details')}
          </Button>
          {order && <ReceiptDownload orderId={orderId} />}
          {order && (
            <Button
              className="h-12 rounded-xl px-4 text-base"
              onClick={() => window.print()}
            >
              <Printer size={16} />
              {t('customer.orders.receipt.print')}
            </Button>
          )}
        </div>
        {resource.loading || resource.error ? (
          <CatalogFeedback
            {...resource}
            loadingText="customer.orders.loadingDetail"
          />
        ) : !order ? (
          <p
            role="status"
            className="rounded-2xl border border-border bg-card p-6"
          >
            {t('customer.orders.receipt.unavailable')}
          </p>
        ) : (
          <OrderReceiptDocument order={order} />
        )}
      </div>
    </div>
  )
}
