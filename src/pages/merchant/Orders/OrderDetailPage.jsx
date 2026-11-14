import StorageOrderPanel from '~/components/storage/StorageOrderPanel'
import Reveal from '~/components/motion/Reveal'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowLeft, RefreshCw, Package, Scale, Truck, WashingMachine, MapPin, ReceiptText, History, UserRound } from 'lucide-react'
import { Button } from '~/components/ui/button'
import OrderStatus from '~/components/orders/OrderStatus'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import useCatalogResource from '~/hooks/useCatalogResource'
import { merchantOrderApi } from '~/apis/merchant/merchantOrderApi'
import { MERCHANT_ROUTES, ORDER_STATUS_OPTIONS, ORDER_STATUS_BORDER_COLORS } from '~/utils/constants'
import { formatCurrency, formatDateTime } from '~/utils/formats'
import { processingSteps, canWeigh, assignmentTask } from './orderModel'
import OrderActionDialog from './components/OrderActionDialog'
import OrderCommission from '~/components/merchant/OrderCommission'
import PaymentStatus from '~/components/orders/PaymentStatus'
import ResourceThumbnail from '~/components/ResourceThumbnail/ResourceThumbnail'
import DeliveryInfo from './components/DeliveryInfo'
import ShipperInfo from './components/ShipperInfo'

function Panel({ icon: Icon, title, children }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <h2 className="flex items-center gap-3 border-b border-border bg-primary/5 p-5 text-lg font-bold">
        <Icon className="size-5 text-primary" />
        {title}
      </h2>
      <div className="p-5 sm:p-6">
        {children}
      </div>
    </section>
  )
}

export default function OrderDetailPage() {
  const { orderId } = useParams()
  const { t } = useTranslation()
  const [action, setAction] = useState(null)
  const load = useCallback((signal) => /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(orderId || '') ? merchantOrderApi.detail(orderId, signal) : Promise.reject(new Error('merchant.invalidResponse')), [orderId])
  const resource = useCatalogResource(load)
  const order = resource.data
  const depositImages = order?.lockerImageUrls || []
  const returnImages = order?.returnLockerImageUrls || (!order?.returnLockerId || order.returnLockerId === order?.lockerId ? depositImages : []) || []
  useEffect(() => {
    document.title = `${t('customer.order.orderDetails')}${order ? ` ${order.orderCode}` : ''} | WashGo`
  }, [order, t])
  const done = () => {
    setAction(null); resource.retry()
  }
  return (
    <Reveal className="mx-auto max-w-[1440px] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          render={<Link to={MERCHANT_ROUTES.ORDERS} />}
          nativeButton={false}
          variant="secondary"
          className="h-11 px-4 text-base"
        >
          <ArrowLeft size={17} />
          {t('merchant.nav.orders')}
        </Button>
        <Button
          variant="outline"
          className="h-11 px-4 text-base"
          disabled={resource.loading || !!action}
          onClick={resource.retry}
        >
          <RefreshCw size={17} />
          {t('customer.orders.refresh')}
        </Button>
      </div>
      {!order || resource.loading || resource.error ? (
        <ResourceFeedback
          {...resource}
          loadingText="customer.orders.loadingDetail"
        />
      ) : (
        <>
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-primary">
                {order.orderCode}
              </h1>
              <p className="mt-2 text-base text-muted-foreground">
                {order.merchantOrderCode && `${order.merchantOrderCode} · `}
                {formatDateTime(order.createdOn)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <OrderStatus status={order.status} />
              {' '}
              {canWeigh(order) && (
                <Button
                  className="h-11 gap-2 px-4 text-base"
                  variant="outline-violet"
                  onClick={() => setAction('weigh')}
                >
                  <Scale size={18} />
                  {t('merchant.orders.weigh')}
                </Button>
              )}
              {processingSteps(order).length > 0 && (
                <Button
                  className="h-11 gap-2 px-4 text-base"
                  onClick={() => setAction('process')}
                >
                  <WashingMachine size={18} />
                  {t('merchant.orders.process')}
                </Button>
              )}
              {assignmentTask(order) && (
                <Button
                  variant="outline"
                  className="h-11 gap-2 border-teal-200 bg-teal-50 px-4 text-base text-teal-700 hover:bg-teal-100 hover:text-teal-800 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-900/50"
                  onClick={() => setAction('assign')}
                >
                  <Truck size={18} />
                  {t(assignmentTask(order) === 1 ? 'merchant.orders.assignCollect' : 'merchant.orders.assignReturn')}
                </Button>
              )}
            </div>
          </header>
          <div className="space-y-3">
            {' '}
            {order.allowedActions?.statusOptions?.some((option) => option.reasonCode === 'WeightRequired') && (
              <p className="rounded-xl bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-800 dark:text-amber-200">
                {t('merchant.orders.weightRequired')}
              </p>
            )}
            {!canWeigh(order) && !processingSteps(order).length && !assignmentTask(order) && (
              <p className="text-base leading-relaxed text-muted-foreground">
                {t('merchant.orders.noActions')}
              </p>
            )}
            {!order.allowedActions && (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {t('merchant.orderSync.missingActions')}
              </p>
            )}
            {[...new Set([order.allowedActions?.updateWeightReasonCode, order.allowedActions?.assignShipperReasonCode].filter((code) => ['LegacyPricing', 'NoWeightService', 'NoMerchant', 'RoleNotAllowed'].includes(code)))].map((code) => (
              <p
                key={code}
                className="text-sm text-muted-foreground"
              >
                {t(`merchant.orderSync.reasons.${code}`)}
              </p>
            ))}
          </div>
          {([10, 13, 14, 15].includes(order.status) || order.storageWorkflowVersion >= 1 && [11, 12, 99].includes(order.status)) && (
            <StorageOrderPanel
              order={order}
              role="Merchant"
              onUpdated={done}
            />
          )}
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-6">
              <Panel
                icon={Truck}
                title={t('merchant.orderView.shipperInfo')}
              >
                <ShipperInfo order={order} />
              </Panel>
              <Panel
                icon={MapPin}
                title={t('merchant.orders.delivery')}
              >
                <DeliveryInfo
                  order={order}
                  depositImages={depositImages}
                  returnImages={returnImages}
                />
              </Panel>
              <Panel
                icon={History}
                title={t('merchant.orders.history')}
              >
                {!order.timeline?.length ? (
                  <p className="text-base text-muted-foreground">
                    {t('customer.orders.noTimeline')}
                  </p>
                ) : (
                  <ol className="space-y-5">
                    {[...order.timeline].sort((a, b) => b.timestamp - a.timestamp).map((entry, index) => (
                      <li
                        key={entry.id || index}
                        className={`border-l-2 pl-4 ${ORDER_STATUS_BORDER_COLORS[ORDER_STATUS_OPTIONS.find(option => Number(option.value) === entry.status)?.color || 'slate']}`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <OrderStatus
                            status={entry.status}
                            showDot={false}
                          />
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(entry.timestamp)}
                          </span>
                        </div>
                        {entry.actorName && (
                          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
                            <UserRound size={13} />
                            {entry.actorName}
                          </span>
                        )}
                        {entry.note && (
                          <p className="mt-2 break-words text-sm font-normal leading-relaxed text-muted-foreground">
                            {entry.note}
                          </p>
                        )}
                        {!entry.note && entry.actorRole === 'Customer' && [1, 2].includes(entry.status) && (
                          <p className="mt-2 text-sm font-normal leading-relaxed text-muted-foreground">
                            {t(`merchant.orderView.customerEvent.${entry.status}`)}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </Panel>
            </div>
            <div className="min-w-0 space-y-6">
              <Panel
                icon={Package}
                title={t('merchant.orders.services')}
              >
                <ul className="divide-y divide-border">
                  {order.items.map((item, index) => (
                    <li
                      key={item.id || index}
                      className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0"
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <ResourceThumbnail
                          urls={item.serviceImageUrls || []}
                          name={item.serviceName}
                        />
                        <div className="min-w-0">
                          <p className="text-base font-semibold">
                            {item.serviceName}
                          </p>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {t('customer.orders.quantity', { count: item.quantity })}
                            {' '}
                            ·
                            {' '}
                            {formatCurrency(item.unitPrice)}
                          </p>
                          {item.note && (
                            <p className="mt-2 break-words text-sm text-muted-foreground">
                              {item.note}
                            </p>
                          )}
                        </div>
                      </div>
                      <strong className="text-base font-semibold">
                        {formatCurrency(item.subTotal)}
                      </strong>
                    </li>
                  ))}
                </ul>
              </Panel>
              <Panel
                icon={ReceiptText}
                title={t('merchant.orders.payment')}
              >
                <OrderCommission order={order} />
                <dl className="my-5 space-y-3">
                  {[['paymentDeadline', order.paymentDeadline], ['pickupDeadline', order.pickupDeadline]].filter(([, value]) => value).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-sm text-muted-foreground">
                        {t(`merchant.orderSync.${key}`)}
                      </dt>
                      <dd className="mt-1 font-semibold">
                        {formatDateTime(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
                {order.overdueTypes?.filter((type) => ['DepositExpired', 'PaymentOverdue', 'PickupOverdue'].includes(type)).map((type) => (
                  <p
                    key={type}
                    className="mb-3 rounded-xl bg-amber-500/10 p-3 text-sm font-semibold text-amber-800 dark:text-amber-200"
                  >
                    {t(`merchant.orderSync.overdue.${type}`)}
                  </p>
                ))}
                <div className="mb-5">
                  <PaymentStatus status={order.paymentStatus} />
                </div>
                <dl className="space-y-4">
                  {[['baseAmount', order.totalAmount], ['discount', order.discountAmount], ['surcharge', order.weightSurchargeAmount]].map(([key, value]) => (
                    <div
                      key={key}
                      className="flex justify-between gap-3 text-base"
                    >
                      <dt className="text-muted-foreground">
                        {t(`merchant.orders.${key}`)}
                      </dt>
                      <dd className="font-semibold">
                        {formatCurrency(value)}
                      </dd>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                    <dt className="text-base font-semibold">
                      {t('merchant.orders.total')}
                    </dt>
                    <dd className="text-2xl font-bold text-primary">
                      {formatCurrency(order.finalAmount)}
                    </dd>
                  </div>
                </dl>
              </Panel>
              <Panel
                icon={Package}
                title={t('merchant.orders.label')}
              >
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="rounded-xl bg-white p-3">
                    <QRCodeSVG
                      value={`WASHGO:ORDER:${order.orderCode}`}
                      size={160}
                    />
                  </div>
                  <strong>
                    {order.merchantOrderCode || order.orderCode}
                  </strong>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t('merchant.orders.labelNote')}
                  </p>
                </div>
              </Panel>
            </div>
          </div>
          {action && (
            <OrderActionDialog
              key={`${order.id}-${action}`}
              action={action}
              order={order}
              onClose={done}
              onSaved={done}
            />
          )}
        </>
      )}
    </Reveal>
  )
}
