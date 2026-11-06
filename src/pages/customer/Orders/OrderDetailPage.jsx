import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Clock3, History, Info, MapPin, PackageCheck, RefreshCw, Shirt, TicketPercent, CircleCheck } from 'lucide-react'
import Breadcrumb from '~/components/Breadcrumb/Breadcrumb'
import CatalogFeedback from '~/components/customer/catalog/CatalogFeedback'
import OrderStatusBadge from '~/components/customer/orders/OrderStatusBadge'
import OrderProgress from '~/components/customer/orders/OrderProgress'
import OrderReceiptAction from './components/OrderReceiptAction'
import OrderTimeline from './components/OrderTimeline'
import LockerAccessCard from '~/components/customer/orders/LockerAccessCard'
import LockerActionButton from './components/LockerActionButton'
import OrderRatingAction from './components/OrderRatingAction'
import IncidentReportAction from '~/pages/customer/Complaints/components/IncidentReportAction'
import DepositDeadlineNotice from './components/DepositDeadlineNotice'
import { Button } from '~/components/ui/button'
import Reveal from '~/components/motion/Reveal'
import useCatalogResource from '~/hooks/customer/useCatalogResource'
import { customerOrderApi } from '~/apis/customer/customerOrderApi'
import { CUSTOMER_ROUTES, ORDER_STATUSES, PAYMENT_OPTIONS, LOCKER_SLOT_SIZES } from '~/utils/constants'
import { formatCurrency, formatDateTime, formatNumber } from '~/utils/formats'
import { paymentBlockReason } from '~/pages/customer/Payment/paymentModel'
import CancelOrderDialog from './components/CancelOrderDialog'

function DetailPanel({ icon: Icon, title, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
      <h2 className="flex items-center gap-3 border-b border-border/70 p-5 text-lg font-semibold">
        <Icon className="size-5 text-primary" />
        {title}
      </h2>
      <div className="space-y-5 p-5 sm:p-6">
        {children}
      </div>
    </section>
  )
}

export default function OrderDetailPage() {
  const { t } = useTranslation()
  const { orderId } = useParams()
  const load = useCallback((signal) => customerOrderApi.get(orderId, signal), [orderId])
  const resource = useCatalogResource(load)
  const [cancelOrderId, setCancelOrderId] = useState(null)
  const order = resource.data
  useEffect(() => {
    document.title = `${order?.orderCode ? t('customer.orders.detailTitle', { code: order.orderCode }) : t('customer.orders.details')} | WashGo`
  }, [order?.orderCode, t])
  return (
    <div className="min-h-[70dvh] bg-muted/30">
      <div className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: t('common.home'), to: CUSTOMER_ROUTES.HOME }, { label: t('common.myOrders'), to: CUSTOMER_ROUTES.ORDERS }, { label: order?.orderCode || t('customer.orders.details') }]} />
        {resource.loading || resource.error ? (
          <CatalogFeedback
            {...resource}
            loadingText="customer.orders.loadingDetail"
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <h1 className="break-all text-2xl font-bold sm:text-3xl">
                  {t('customer.orders.detailTitle', { code: order.orderCode })}
                </h1>
                <p className="mt-2 text-sm font-semibold text-muted-foreground">
                  {formatDateTime(order.createdOn)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <LockerActionButton
                  key={order.id}
                  order={order}
                  onUpdated={resource.retry}
                />
                <OrderReceiptAction order={order} />
                <Button
                  variant="outline"
                  className="h-11 rounded-xl px-4"
                  onClick={resource.retry}
                >
                  <RefreshCw size={16} />
                  {t('customer.orders.refresh')}
                </Button>
              </div>
            </div>
            {order.status === ORDER_STATUSES.PENDING && (
              <DepositDeadlineNotice />
            )}
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="min-w-0 space-y-6">
                <Reveal>
                  <DetailPanel
                    icon={History}
                    title={t('customer.orders.timeline')}
                  >
                    <OrderTimeline order={order} />
                  </DetailPanel>
                </Reveal>
                <DetailPanel
                  icon={PackageCheck}
                  title={t('customer.order.orderDetails')}
                >
                  <ul className="divide-y divide-border">
                    {(order.items || []).map((item) => (
                      <li
                        key={item.id || item.serviceId}
                        className="flex items-start justify-between gap-4 py-3 first:pt-0"
                      >
                        <div className="flex min-w-0 gap-3">
                          <Shirt className="mt-1 size-5 shrink-0 text-primary" />
                          <div className="min-w-0">
                            <p className="break-words font-medium">
                              {item.serviceName}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {t('customer.orders.receipt.quantity')}
                              {': '}
                              <strong className="font-bold text-foreground">
                                {item.quantity}
                              </strong>
                              {' / '}
                              {t('customer.orders.unitPrice')}
                              {': '}
                              <strong className="font-bold text-foreground">
                                {formatCurrency(item.unitPrice)}
                              </strong>
                              {item.weightKg != null && (
                                <>
                                  {' · '}
                                  <strong className="font-bold text-foreground">
                                    {formatNumber(item.weightKg)}
                                    {' '}
                                    kg
                                  </strong>
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                        <p className="shrink-0 font-bold tabular-nums">
                          {formatCurrency(item.subTotal)}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-3 rounded-2xl border border-primary/10 bg-primary/5 p-4">
                    <MapPin className="mt-1 size-5 shrink-0 text-primary" />
                    <div className="min-w-0 space-y-2">
                      <p className="break-words font-semibold">
                        {order.lockerName}
                        {' - '}
                        {t('customer.order.box', { number: order.boxNumber || '—' })}
                      </p>
                      {order.returnBoxNumber && (
                        <p className="text-sm text-muted-foreground">
                          {t('customer.orders.returnBoxLabel')}
                          {': '}
                          <strong className="font-bold text-foreground">
                            {order.returnBoxNumber}
                          </strong>
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {t('customer.orders.actualWeight')}
                        {': '}
                        <strong className="font-bold text-foreground">
                          {order.actualWeightKg != null ? `${formatNumber(order.actualWeightKg)} kg` : t('customer.orders.notWeighed')}
                        </strong>
                      </p>
                    </div>
                  </div>
                  <dl className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        {t('customer.orders.compartmentSize')}
                      </dt>
                      <dd className="mt-1 font-bold">
                        {t(LOCKER_SLOT_SIZES[order.boxSize] || 'customer.orders.unknown')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        {t('customer.orders.weightSurcharge')}
                      </dt>
                      <dd className="mt-1 font-bold">
                        {formatCurrency(order.weightSurchargeAmount)}
                      </dd>
                    </div>
                  </dl>
                  {order.customerNote && (
                    <p className="whitespace-pre-wrap break-words rounded-xl bg-muted/40 p-4 text-sm leading-6">
                      {order.customerNote}
                    </p>
                  )}
                  {order.cancellationReason && (
                    <p className="whitespace-pre-wrap break-words rounded-xl bg-red-500/5 p-4 text-sm leading-6">
                      {t('customer.orders.cancel.reason')}
                      {': '}
                      {order.cancellationReason}
                    </p>
                  )}
                </DetailPanel>
                <LockerAccessCard
                  key={order.id}
                  order={order}
                />
              </div>
              <aside className="min-w-0 space-y-5 lg:sticky lg:top-[var(--customer-header-offset)]">
                <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <h2 className="bg-blue-600 p-4 text-sm font-semibold text-white">
                    {t('customer.orders.currentStatus')}
                  </h2>
                  <div className="space-y-4 p-5">
                    <div className="flex items-center gap-3">
                      <CircleCheck className="size-9 rounded-full bg-primary/10 p-2 text-primary" />
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">
                          {t('customer.orders.receipt.order')}
                        </dt>
                        <dd className="break-all font-bold">
                          {order.orderCode}
                        </dd>
                      </div>
                      {order.merchantName && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">
                            {t('customer.orders.merchant')}
                          </dt>
                          <dd className="break-words font-medium">
                            {order.merchantName}
                          </dd>
                        </div>
                      )}
                      {order.shipperName && (
                        <div className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">
                            {t('customer.orders.shipper')}
                          </dt>
                          <dd className="break-words font-medium">
                            {order.shipperName}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </section>
                <DetailPanel
                  icon={Clock3}
                  title={t('customer.orders.estimatedFinish')}
                >
                  <p className="text-lg font-semibold">
                    {t('customer.orders.etaPending')}
                  </p>
                  <OrderProgress order={order} />
                  {order.pickupDeadline && (
                    <p className="text-sm text-muted-foreground">
                      {t('customer.orders.pickupDeadlineLabel')}
                      {': '}
                      <strong className="font-bold text-foreground">
                        {formatDateTime(order.pickupDeadline)}
                      </strong>
                    </p>
                  )}
                  {order.storageLocation && (
                    <p className="break-words text-sm text-amber-700 dark:text-amber-300">
                      {t('customer.orders.storage', { location: order.storageLocation })}
                    </p>
                  )}
                </DetailPanel>
                <DetailPanel
                  icon={TicketPercent}
                  title={t('customer.order.quote')}
                >
                  <OrderStatusBadge
                    status={order.paymentStatus}
                    payment
                  />
                  <p className="text-sm text-muted-foreground">
                    {t(PAYMENT_OPTIONS.find((option) => option.value === order.paymentMethod)?.label || 'customer.orders.unknown')}
                  </p>
                  <dl className="space-y-3 text-sm">
                    {[
                      ['customer.order.subtotal', order.totalAmount], ['customer.order.discount', order.discountAmount],
                      ['customer.orders.weightSurcharge', order.weightSurchargeAmount],
                      ...(order.status === ORDER_STATUSES.CANCELLED ? [['customer.orders.cancel.chargedFee', order.cancelFeeAmount], ['customer.orders.cancel.outstanding', order.cancellationFeeOutstanding], ['customer.orders.cancel.refund', order.cancellationRefundAmount]] : [])
                    ].map(([label, amount]) => (
                      <div
                        key={label}
                        className="flex justify-between gap-3"
                      >
                        <dt className="text-muted-foreground">
                          {t(label)}
                        </dt>
                        <dd className="font-bold tabular-nums">
                          {formatCurrency(amount)}
                        </dd>
                      </div>
                    ))}
                    <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-4">
                      <dt className="font-semibold">
                        {t('customer.orders.total')}
                      </dt>
                      <dd className="text-2xl font-bold tabular-nums text-primary">
                        {formatCurrency(order.finalAmount)}
                      </dd>
                    </div>
                  </dl>
                  {!paymentBlockReason(order) && (
                    <Button
                      render={<Link to={CUSTOMER_ROUTES.PAYMENT.replace(':orderId', order.id)} />}
                      nativeButton={false}
                      className="h-11 w-full"
                    >
                      {t('customer.orders.pay')}
                    </Button>
                  )}
                </DetailPanel>
                <OrderRatingAction
                  key={order.id}
                  order={order}
                />
                <IncidentReportAction
                  key={`incident-${order.id}`}
                  order={order}
                />
                {[ORDER_STATUSES.PENDING, ORDER_STATUSES.DEPOSITED, ORDER_STATUSES.COLLECTED].includes(order.status) && (
                  <Button
                    variant="destructive"
                    className="h-11 w-full"
                    onClick={() => setCancelOrderId(order.id)}
                  >
                    {t('customer.orders.cancel.title')}
                  </Button>
                )}
                <p className="flex items-start gap-2 text-xs leading-6 text-muted-foreground">
                  <Info className="mt-1 size-4 shrink-0" />
                  {t('customer.orders.pinNote')}
                </p>
                <Button
                  variant="outline"
                  render={<Link to={CUSTOMER_ROUTES.ORDERS} />}
                  nativeButton={false}
                  className="h-11 w-full"
                >
                  <ArrowLeft size={16} />
                  {t('common.myOrders')}
                </Button>
              </aside>
            </div>
          </>
        )}
        {cancelOrderId && (
          <CancelOrderDialog
            orderId={cancelOrderId}
            onClose={() => setCancelOrderId(null)}
            onCancelled={() => {
              setCancelOrderId(null)
              resource.retry()
            }}
          />
        )}
      </div>
    </div>
  )
}
