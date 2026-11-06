import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import Brand from '~/components/Brand/Brand'
import { Button } from '~/components/ui/button'
import CatalogFeedback from '~/components/customer/catalog/CatalogFeedback'
import { customerOrderApi } from '~/apis/customer/customerOrderApi'
import useCatalogResource from '~/hooks/customer/useCatalogResource'
import { canPrintReceipt } from '~/components/customer/orders/orderWorkflow'
import { CUSTOMER_ROUTES, PAYMENT_OPTIONS } from '~/utils/constants'
import { formatCurrency, formatDateTime } from '~/utils/formats'

export default function OrderReceiptPage() {
  const { t } = useTranslation()
  const { orderId } = useParams()
  const load = useCallback((signal) => customerOrderApi.get(orderId, signal), [orderId])
  const resource = useCatalogResource(load)
  const order = resource.data
  useEffect(() => {
    document.title = `${t('customer.orders.receipt.title')} | WashGo`
  }, [t])
  return (
    <div className="min-h-[60dvh] bg-muted/30 px-4 py-8 print:min-h-0 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl space-y-5 print:max-w-none">
        <div className="flex flex-wrap justify-between gap-3 print:hidden">
          <Button
            variant="outline"
            render={<Link to={CUSTOMER_ROUTES.ORDER_DETAIL.replace(':orderId', orderId)} />}
            nativeButton={false}
          >
            <ArrowLeft size={16} />
            {t('customer.orders.details')}
          </Button>
          {order && canPrintReceipt(order) && (
            <Button onClick={() => window.print()}>
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
        ) : !canPrintReceipt(order) ? (
          <p
            role="status"
            className="rounded-2xl border border-border bg-card p-6"
          >
            {t('customer.orders.receipt.unavailable')}
          </p>
        ) : (
          <article
            aria-label={t('customer.orders.receipt.title')}
            className="space-y-7 rounded-2xl border border-border bg-card p-6 text-foreground shadow-sm sm:p-10 print:border-0 print:bg-white print:p-0 print:text-black print:shadow-none"
          >
            <div className="flex flex-wrap items-center justify-between gap-5 border-b border-border pb-6">
              <Brand to={CUSTOMER_ROUTES.HOME} />
              <h1 className="text-xl font-bold">
                {t('customer.orders.receipt.title')}
              </h1>
            </div>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              {[
                ['customer.orders.receipt.order', order.orderCode], ['customer.orders.receipt.customer', order.customerName],
                ['customer.orders.receipt.paidAt', formatDateTime(order.paidAt)], ['customer.payment.method', t(PAYMENT_OPTIONS.find((option) => option.value === order.paymentMethod)?.label || 'customer.orders.unknown')]
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-muted-foreground print:text-slate-600">
                    {t(label)}
                  </dt>
                  <dd className="mt-1 break-words font-medium">
                    {value || '—'}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-3 pr-3">
                      {t('customer.orders.receipt.service')}
                    </th>
                    <th className="px-3 py-3 text-right">
                      {t('customer.orders.receipt.quantity')}
                    </th>
                    <th className="py-3 pl-3 text-right">
                      {t('customer.orders.receipt.amount')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items || []).map((item) => (
                    <tr
                      key={item.id || item.serviceId}
                      className="border-b border-border/60"
                    >
                      <td className="py-4 pr-3">
                        {item.serviceName}
                      </td>
                      <td className="px-3 py-4 text-right">
                        {item.quantity}
                      </td>
                      <td className="whitespace-nowrap py-4 pl-3 text-right tabular-nums">
                        {formatCurrency(item.subTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="ml-auto max-w-sm space-y-3 text-sm">
              {[
                ['customer.order.subtotal', order.totalAmount], ['customer.orders.weightSurcharge', order.weightSurchargeAmount], ['customer.order.discount', order.discountAmount], ['customer.orders.total', order.finalAmount]
              ].map(([label, amount]) => (
                <div
                  key={label}
                  className="flex justify-between gap-5"
                >
                  <dt>
                    {t(label)}
                  </dt>
                  <dd className="font-semibold tabular-nums">
                    {formatCurrency(amount)}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="border-t border-border pt-5 text-xs leading-6 text-muted-foreground print:text-slate-600">
              {t('customer.orders.receipt.note')}
            </p>
          </article>
        )}
      </div>
    </div>
  )
}
