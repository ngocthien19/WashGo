import Reveal from '~/components/motion/Reveal'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowLeft, RefreshCw, Package, Scale, Truck, WashingMachine, MapPin, ReceiptText, History } from 'lucide-react'
import { Button } from '~/components/ui/button'
import OrderStatus from '~/components/orders/OrderStatus'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import useCatalogResource from '~/hooks/useCatalogResource'
import { merchantOrderApi } from '~/apis/merchant/merchantOrderApi'
import { MERCHANT_ROUTES } from '~/utils/constants'
import { formatCurrency, formatDateTime, formatNumber } from '~/utils/formats'
import { processingSteps, canWeigh, assignmentTask, statusLabel } from './orderModel'
import OrderActionDialog from './components/OrderActionDialog'

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
              <h1 className="text-3xl font-bold">
                {order.orderCode}
              </h1>
              <p className="mt-2 text-base text-muted-foreground">
                {order.merchantOrderCode && `${order.merchantOrderCode} · `}
                {formatDateTime(order.createdOn)}
              </p>
            </div>
            <OrderStatus status={order.status} />
          </header>
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-6">
              <Panel
                icon={Package}
                title={t('customer.orders.orderInformation', { defaultValue: t('merchant.orders.services') })}
              >
                <ul className="divide-y divide-border">
                  {order.items.map((item, index) => (
                    <li
                      key={item.id || index}
                      className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0"
                    >
                      <div>
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
                      <strong className="text-base">
                        {formatCurrency(item.subTotal)}
                      </strong>
                    </li>
                  ))}
                </ul>
              </Panel>
              <Panel
                icon={MapPin}
                title={t('merchant.orders.delivery')}
              >
                <dl className="grid gap-5 sm:grid-cols-2">
                  {[['locker', order.lockerName], ['box', order.boxNumber], ['returnBox', order.returnBoxNumber], ['shipper', order.shipperName || t('merchant.orders.unassigned')], ['weight', order.actualWeightKg == null ? t('customer.orders.notWeighed') : `${formatNumber(order.actualWeightKg)} kg`], ['eta', order.estimatedFinishAt ? formatDateTime(order.estimatedFinishAt) : t('merchant.orders.noEta')]].map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-sm text-muted-foreground">
                        {t(`merchant.orders.${key}`)}
                      </dt>
                      <dd className="mt-2 break-words text-base font-semibold">
                        {value || '—'}
                      </dd>
                    </div>
                  ))}
                </dl>
                {order.shipperNote && (
                  <p className="mt-5 rounded-xl bg-muted p-4 text-base">
                    {order.shipperNote}
                  </p>
                )}
                {order.storageLocation && (
                  <p className="mt-4 text-base">
                    {t('merchant.orders.storage')}
                    :
                    {' '}
                    <strong>
                      {order.storageLocation}
                    </strong>
                  </p>
                )}
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
                        className="border-l-2 border-primary/25 pl-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <strong className="text-base">
                            {t(statusLabel(entry.status))}
                          </strong>
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(entry.timestamp)}
                          </span>
                        </div>
                        {entry.actorName && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {entry.actorName}
                          </p>
                        )}
                        {entry.note && (
                          <p className="mt-2 break-words text-base leading-relaxed">
                            {entry.note}
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
                icon={WashingMachine}
                title={t('merchant.orders.processing')}
              >
                <div className="space-y-3">
                  {canWeigh(order) && (
                    <Button
                      className="h-12 w-full justify-start gap-3 px-4 text-base"
                      variant="outline-violet"
                      onClick={() => setAction('weigh')}
                    >
                      <Scale size={18} />
                      {t('merchant.orders.weigh')}
                    </Button>
                  )}
                  {processingSteps(order).length > 0 && (
                    <Button
                      className="h-12 w-full justify-start gap-3 px-4 text-base"
                      onClick={() => setAction('process')}
                    >
                      <WashingMachine size={18} />
                      {t('merchant.orders.process')}
                    </Button>
                  )}
                  {assignmentTask(order) && (
                    <Button
                      variant="outline"
                      className="h-12 w-full justify-start gap-3 px-4 text-base"
                      onClick={() => setAction('assign')}
                    >
                      <Truck size={18} />
                      {t(assignmentTask(order) === 1 ? 'merchant.orders.assignCollect' : 'merchant.orders.assignReturn')}
                    </Button>
                  )}
                  {order.includedWeightKg > 0 && order.actualWeightKg == null && order.status === 3 && (
                    <p className="rounded-xl bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-800 dark:text-amber-200">
                      {t('merchant.orders.weightRequired')}
                    </p>
                  )}
                  {!canWeigh(order) && !processingSteps(order).length && !assignmentTask(order) && (
                    <p className="text-base leading-relaxed text-muted-foreground">
                      {t('merchant.orders.noActions')}
                    </p>
                  )}
                </div>
              </Panel>
              <Panel
                icon={ReceiptText}
                title={t('merchant.orders.payment')}
              >
                <p className={`mb-5 inline-block rounded-full px-3 py-2 text-sm font-semibold ${order.paymentStatus === 2 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/10 text-amber-800 dark:text-amber-200'}`}>
                  {t(`customer.orders.paymentStatus.${order.paymentStatus}`, { defaultValue: '—' })}
                </p>
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
