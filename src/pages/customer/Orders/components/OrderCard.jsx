import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Package, Printer } from 'lucide-react'
import Reveal from '~/components/motion/Reveal'
import OrderStatusBadge from '~/components/customer/orders/OrderStatusBadge'
import OrderProgress from '~/components/customer/orders/OrderProgress'
import { canPrintReceipt } from '~/components/customer/orders/orderWorkflow'
import { Button } from '~/components/ui/button'
import { CUSTOMER_ROUTES, ORDER_STATUSES } from '~/utils/constants'
import { formatCurrency, formatDateTime, formatNumber } from '~/utils/formats'
import { paymentBlockReason } from '~/pages/customer/Payment/paymentModel'

export default function OrderCard({ order }) {
  const { t } = useTranslation()
  return (
    <Reveal
      as="article"
      className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6"
    >
      <OrderProgress
        order={order}
        compact
      />
      <div className="mt-5 grid items-center gap-5 sm:grid-cols-2 xl:grid-cols-[1.25fr_1fr_.45fr_.65fr_.9fr_1.3fr]">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary">
            <Package size={23} />
          </span>
          <div className="min-w-0 space-y-1">
            <h2 className="break-all font-bold">
              {order.orderCode}
            </h2>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(order.createdOn)}
            </p>
            <p className="line-clamp-2 text-xs text-primary">
              {order.serviceNames?.join(' ? ') || t('customer.orders.detailsHint')}
            </p>
          </div>
        </div>
        <div className="min-w-0 space-y-1 xl:border-l xl:border-border xl:pl-5">
          <p className="text-xs text-muted-foreground">
            {t('customer.orders.locker')}
          </p>
          <p className="line-clamp-2 text-sm font-medium">
            {order.lockerName || t('customer.notProvided')}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            {t('customer.orders.compartment')}
          </p>
          <p className="text-sm font-medium">
            {order.boxNumber || '?'}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            {t('customer.orders.actualWeight')}
          </p>
          <p className="text-sm font-medium">
            {order.actualWeightKg != null ? `${formatNumber(order.actualWeightKg)} kg` : t('customer.orders.notWeighed')}
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {t('customer.orders.orderStatus')}
          </p>
          <OrderStatusBadge status={order.status} />
          <OrderStatusBadge
            status={order.paymentStatus}
            payment
          />
        </div>
        <div className="space-y-3 sm:col-span-2 xl:col-span-1 xl:border-l xl:border-border xl:pl-5">
          <div className="text-xs text-muted-foreground xl:text-right">
            <p>
              {t(order.status === ORDER_STATUSES.CANCELLED ? 'customer.orders.cancel.reason' : 'customer.orders.estimatedFinish')}
            </p>
            <p className="mt-1 line-clamp-2 font-medium text-foreground">
              {order.status === ORDER_STATUSES.CANCELLED ? order.cancellationReason || '?' : t('customer.orders.etaPending')}
            </p>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3 xl:justify-end">
            <div className="min-w-0 xl:text-right">
              <p className="text-xs text-muted-foreground">
                {t('customer.orders.total')}
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-primary">
                {formatCurrency(order.finalAmount)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                render={<Link to={CUSTOMER_ROUTES.ORDER_DETAIL.replace(':orderId', order.id)} />}
                nativeButton={false}
                variant="secondary"
                className="h-10 rounded-xl"
              >
                {t('customer.orders.details')}
              </Button>
              {!paymentBlockReason(order) && (
                <Button
                  render={<Link to={CUSTOMER_ROUTES.PAYMENT.replace(':orderId', order.id)} />}
                  nativeButton={false}
                  className="h-10 rounded-xl"
                >
                  {t('customer.orders.pay')}
                </Button>
              )}
              {canPrintReceipt(order) && (
                <Button
                  render={<Link to={CUSTOMER_ROUTES.ORDER_RECEIPT.replace(':orderId', order.id)} />}
                  nativeButton={false}
                  variant="outline"
                  className="h-10 rounded-xl"
                >
                  <Printer size={15} />
                  {t('customer.orders.receipt.action')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  )
}
