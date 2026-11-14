import StorageOrderPanel from '~/components/storage/StorageOrderPanel'
import OrderCommission from '~/components/orders/OrderCommission'
import CancelExpiredDialog from './components/CancelExpiredDialog'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, RefreshCw, Package, UserRound, MapPin, History, Wallet, Store, Truck, WashingMachine } from 'lucide-react'
import { Button } from '~/components/ui/button'
import OrderStatus from '~/components/orders/OrderStatus'
import PaymentStatus from '~/components/orders/PaymentStatus'
import UserAvatar from '~/components/UserAvatar/UserAvatar'
import ResourceThumbnail from '~/components/ResourceThumbnail/ResourceThumbnail'
import OrderActionDialog from '~/components/orders/OrderActionDialog'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import Reveal from '~/components/motion/Reveal'
import useCatalogResource from '~/hooks/useCatalogResource'
import { adminOrderApi } from '~/apis/admin/adminOrderApi'
import { ADMIN_ROUTES, ORDER_STATUS_OPTIONS, ORDER_STATUS_BORDER_COLORS } from '~/utils/constants'
import { formatCurrency, formatDateTime, formatNumber } from '~/utils/formats'
import { processingSteps, assignmentTask } from '~/utils/orderManagement'
import { isId } from '../Merchants/merchantModel'
import { canAssignMerchant } from './ordersModel'
import MerchantAssignmentDialog from './components/MerchantAssignmentDialog'
import OrderReceiptAction from '~/pages/customer/Orders/components/OrderReceiptAction'
import useOrderMedia, { mediaKey } from './useOrderMedia'

function Panel({ title, icon: Icon, children }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <h2 className="flex items-center gap-3 border-b border-border bg-primary/5 p-5 text-lg font-semibold">
        <Icon
          size={20}
          className="text-primary"
        />
        {title}
      </h2>
      <div className="p-5">
        {children}
      </div>
    </section>
  )
}
function Fields({ values }) {
  return (
    <dl className="grid gap-5 sm:grid-cols-2">
      {values.map(([key, label, value]) => (
        <div
          key={key}
          className="min-w-0"
        >
          <dt className="text-sm text-muted-foreground">
            {label}
          </dt>
          <dd className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-6">
            {value == null || value === '' ? '—' : value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
export default function OrderDetailPage() {
  const { orderId } = useParams(), { t } = useTranslation()
  const [action, setAction] = useState(null)
  const load = useCallback(signal => isId(orderId) ? adminOrderApi.detail(orderId, signal) : Promise.reject(new Error('admin.invalidResponse')), [orderId])
  const resource = useCatalogResource(load)
  const order = resource.data
  const media = useOrderMedia(order)
  const merchantImages = order?.merchantImageUrls || media[mediaKey('merchant', order?.merchantId)]?.imageUrls || []
  const depositImages = order?.lockerImageUrls || media[mediaKey('locker', order?.lockerId)]?.imageUrls || []
  const merchantPhone = order?.merchantPhoneNumber || media[mediaKey('merchant', order?.merchantId)]?.phone
  const sameLocker = !order?.returnLockerId || order.returnLockerId === order.lockerId
  const returnImages = order?.returnLockerImageUrls || (sameLocker ? depositImages : media[mediaKey('locker', order?.returnLockerId)]?.imageUrls) || []
  const done = () => {
    setAction(null); resource.retry()
  }
  useEffect(() => {
    document.title = `${order?.orderCode || t('customer.order.orderDetails')} | WashGo`
  }, [order, t])
  const fields = (pairs) => pairs.map(([key, value]) => [key, t(`admin.orderManagement.${key}`), value])
  return (
    <Reveal className="mx-auto max-w-[1500px] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          render={<Link to={ADMIN_ROUTES.ORDERS} />}
          nativeButton={false}
          variant="secondary"
          className="h-11 px-5 text-base"
        >
          <ArrowLeft size={18} />
          {t('admin.nav.orders')}
        </Button>
        <Button
          variant="outline"
          className="h-11 px-5 text-base"
          disabled={resource.loading || !!action}
          onClick={resource.retry}
        >
          <RefreshCw size={18} />
          {t('customer.orders.refresh')}
        </Button>
      </div>
      {resource.loading || resource.error || !order ? (
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
              <p className="mt-2 text-sm text-muted-foreground">
                {order.merchantOrderCode && `${order.merchantOrderCode} · `}
                {formatDateTime(order.createdOn)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <OrderStatus status={order.status} />
              {canAssignMerchant(order) && (
                <Button
                  variant="outline-violet"
                  className="h-11 px-4 text-base"
                  onClick={() => setAction('merchant')}
                >
                  <Store size={18} />
                  {t('admin.orderManagement.assignMerchant')}
                </Button>
              )}
              {processingSteps(order).length > 0 && (
                <Button
                  className="h-11 px-4 text-base"
                  onClick={() => setAction('process')}
                >
                  <WashingMachine size={18} />
                  {t('merchant.orders.process')}
                </Button>
              )}
              {assignmentTask(order) && (
                <Button
                  variant="outline"
                  className="h-11 border-teal-200 bg-teal-50 px-4 text-base text-teal-700 hover:bg-teal-100 hover:text-teal-800 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300 dark:hover:bg-teal-900/50"
                  onClick={() => setAction('assign')}
                >
                  <Truck size={18} />
                  {t(assignmentTask(order) === 1 ? 'merchant.orders.assignCollect' : 'merchant.orders.assignReturn')}
                </Button>
              )}
              {order.allowedActions?.canCancelExpiredDeposit && (
                <Button
                  variant="destructive"
                  className="h-11 px-4 text-base"
                  onClick={() => setAction('cancelExpired')}
                >
                  {t('admin.sync.cancelExpired')}
                </Button>
              )}

              <OrderReceiptAction order={order} />
            </div>
          </header>
          {([10, 13, 14, 15].includes(order.status) || order.storageWorkflowVersion >= 1 && [11, 12, 99].includes(order.status)) && (
            <StorageOrderPanel
              order={order}
              role="Admin"
              onUpdated={done}
            />
          )}
          {order.allowedActions?.statusOptions?.some(item => item.reasonCode === 'WeightRequired') && (
            <p className="rounded-xl bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
              {t('merchant.orders.weightRequired')}
            </p>
          )}
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-6">
              <Panel
                title={t('admin.orderManagement.people')}
                icon={UserRound}
              >
                <div className="mb-5 grid gap-4 sm:grid-cols-2">
                  <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border p-4">
                    <UserAvatar
                      avatar={order.customerAvatarUrl}
                      fullName={order.customerName}
                      alt={order.customerName || ''}
                      className="size-12"
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {t('admin.orderManagement.customerName')}
                      </p>
                      <p className="mt-1 break-words font-semibold">
                        {order.customerName || '—'}
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {order.customerPhoneNumber || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border p-4">
                    <UserAvatar
                      avatar={merchantImages[0]}
                      fullName={order.merchantName}
                      alt={order.merchantName || ''}
                      className="size-12"
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {t('admin.orderManagement.merchant')}
                      </p>
                      <p className="mt-1 break-words font-semibold">
                        {order.merchantName || t('admin.orderManagement.unassigned')}
                      </p>
                      {order.merchantId && (
                        <p className="mt-1 text-sm font-semibold">
                          {merchantPhone || '—'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mb-5 flex min-w-0 items-center gap-3 rounded-xl border border-border p-4">
                  <UserAvatar
                    avatar={order.shipperAvatarUrl}
                    fullName={order.shipperName}
                    alt={order.shipperName || ''}
                    className="size-12"
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">
                      {t('admin.orderManagement.shipper')}
                    </p>
                    <p className="mt-1 break-words text-base font-semibold">
                      {order.shipperName || t('admin.orderManagement.unassigned')}
                    </p>
                    {order.shipperId && (
                      <p className="mt-1 text-base">
                        {order.shipperPhone || '—'}
                      </p>
                    )}
                  </div>
                </div>
                <Fields values={fields([['customerNote', order.customerNote], ['shipperNote', order.shipperNote]])} />
                {order.cancellationReason && (
                  <p className="mt-5 rounded-xl bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300">
                    {t('admin.orderManagement.cancelReason')}
                    :
                    {' '}
                    {order.cancellationReason}
                  </p>
                )}
              </Panel>
              <Panel
                title={t('merchant.orders.delivery')}
                icon={MapPin}
              >
                <div className="mb-5 grid gap-4 sm:grid-cols-2">
                  {[{ key: 'dropoff', title: 'locker', name: order.lockerName, images: depositImages, address: order.lockerAddress, boxLabel: 'box', box: order.boxNumber }, { key: 'pickup', title: 'returnLocker', name: order.returnLockerName || (sameLocker ? order.lockerName : null), images: returnImages, address: order.returnLockerAddress || (sameLocker ? order.lockerAddress : null), boxLabel: 'returnBox', box: order.returnBoxNumber }].map(slot => (
                    <section
                      key={slot.key}
                      className="min-w-0 rounded-xl border border-border p-4"
                    >
                      <h3 className="mb-4 border-b border-border pb-3 font-semibold text-primary">
                        {t(`admin.orderManagement.${slot.key}`)}
                      </h3>
                      <div className="mb-4 flex items-start gap-3">
                        <ResourceThumbnail
                          urls={slot.images}
                          name={slot.name}
                        />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">
                            {t(`admin.orderManagement.${slot.title}`)}
                          </p>
                          <p className="mt-1 break-words font-semibold">
                            {slot.name || '—'}
                          </p>
                          <p className="mt-2 break-words text-base leading-6 text-muted-foreground">
                            {slot.address || '—'}
                          </p>
                        </div>
                      </div>
                      <dl className="space-y-4">
                        {[[slot.boxLabel, slot.box]].map(([key, value]) => (
                          <div key={key}>
                            <dt className="text-sm text-muted-foreground">
                              {t(`admin.orderManagement.${key}`)}
                            </dt>
                            <dd className="mt-2 break-words text-sm font-semibold leading-6">
                              {value || '—'}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  ))}
                </div>
                <Fields values={fields([['weight', order.actualWeightKg == null ? t('customer.orders.notWeighed') : `${formatNumber(order.actualWeightKg)} kg`], ['eta', order.predictedFinishAt || order.estimatedFinishAt ? formatDateTime(order.predictedFinishAt || order.estimatedFinishAt) : null], ['storageLocation', order.storageLocation], ['storageReference', order.storageReference]])} />
              </Panel>
              <Panel
                title={t('merchant.orders.history')}
                icon={History}
              >
                {!order.timeline?.length ? (
                  <p className="text-sm text-muted-foreground">
                    {t('customer.orders.noTimeline')}
                  </p>
                ) : (
                  <ol className="space-y-5">
                    {[...order.timeline].sort((a, b) => b.timestamp - a.timestamp).map((entry, index) => (
                      <li
                        key={entry.id || index}
                        className={`border-l-2 pl-4 ${ORDER_STATUS_BORDER_COLORS[ORDER_STATUS_OPTIONS.find(option => Number(option.value) === entry.status)?.color || 'slate']}`}
                      >
                        <div className="flex flex-wrap justify-between gap-2">
                          <OrderStatus
                            status={entry.status}
                            showDot={false}
                          />
                          <time className="text-xs text-muted-foreground">
                            {formatDateTime(entry.timestamp)}
                          </time>
                        </div>
                        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
                          <UserRound size={13} />
                          {entry.actorName || entry.actorRole || '—'}
                        </span>
                        {entry.note && (
                          <p className="mt-2 break-words text-sm font-normal leading-6 text-muted-foreground">
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
                title={t('merchant.orders.services')}
                icon={Package}
              >
                <ul className="divide-y divide-border">
                  {order.items.map((item, index) => (
                    <li
                      key={item.id || index}
                      className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0"
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <ResourceThumbnail
                          urls={item.serviceImageUrls || media[mediaKey('service', item.serviceId)]?.imageUrls || []}
                          name={item.serviceName}
                        />
                        <div className="min-w-0">
                          <p className="font-semibold">
                            {item.serviceName}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-muted-foreground">
                            {t('customer.orders.quantity', { count: item.quantity })}
                            {' '}
                            ·
                            {' '}
                            {formatCurrency(item.unitPrice)}
                          </p>
                          {item.note && (
                            <p className="mt-2 break-words text-sm font-semibold text-muted-foreground">
                              {item.note}
                            </p>
                          )}
                        </div>
                      </div>
                      <strong className="font-semibold">
                        {formatCurrency(item.subTotal)}
                      </strong>
                    </li>
                  ))}
                </ul>
              </Panel>
              <Panel
                title={t('merchant.orders.payment')}
                icon={Wallet}
              >
                <PaymentStatus status={order.paymentStatus} />
                <dl className="mt-5 space-y-4">
                  {[['totalAmount', order.totalAmount], ['discountAmount', order.discountAmount], ['weightSurchargeAmount', order.weightSurchargeAmount], ['cancelFeeAmount', order.cancelFeeAmount], ['overdueFeeTotal', order.overdueFeeTotal], ['storageFeeTotal', order.storageFeeTotal]].map(([key, value]) => (
                    <div
                      key={key}
                      className="flex justify-between gap-3 text-sm"
                    >
                      <dt className="text-muted-foreground">
                        {t(`admin.orderManagement.${key}`)}
                      </dt>
                      <dd className="font-semibold">
                        {Number.isFinite(value) ? formatCurrency(value) : '—'}
                      </dd>
                    </div>
                  ))}
                  <div className="flex justify-between gap-3 border-t border-border pt-4">
                    <dt className="font-semibold">
                      {t('merchant.orders.total')}
                    </dt>
                    <dd className="text-xl font-semibold text-primary">
                      {formatCurrency(order.finalAmount)}
                    </dd>
                  </div>
                </dl>
                <OrderCommission order={order} />
                <div className="mt-5 border-t border-border pt-4">
                  <Fields values={fields([['paymentDeadline', order.paymentDeadline ? formatDateTime(order.paymentDeadline) : null], ['pickupDeadline', order.pickupDeadline ? formatDateTime(order.pickupDeadline) : null]])} />
                </div>
                {(order.overdueTypes || []).map(type => (
                  <p
                    key={type}
                    className="mt-3 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300"
                  >
                    {t(`merchant.orderSync.overdue.${type}`, { defaultValue: type })}
                  </p>
                ))}
              </Panel>
            </div>
          </div>
          {action === 'merchant' && (
            <MerchantAssignmentDialog
              id={order.id}
              onClose={done}
              onSaved={done}
            />
          )}
          {action === 'cancelExpired' && (
            <CancelExpiredDialog
              id={order.id}
              onClose={done}
              onSaved={done}
            />
          )}
          {['process', 'assign'].includes(action) && (
            <OrderActionDialog
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
