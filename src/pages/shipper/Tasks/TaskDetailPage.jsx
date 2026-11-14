import StorageOrderPanel from '~/components/storage/StorageOrderPanel'
import { useCallback, useEffect, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, RefreshCw, PackageOpen, Truck, MapPin, Clock, Store, Package, Info, Mail, Phone } from 'lucide-react'
import ResourceThumbnail from '~/components/ResourceThumbnail/ResourceThumbnail'
import DeliveryLocker from '../components/DeliveryLocker'
import { taskLocker } from '../components/deliveryLockerModel'
import Reveal from '~/components/motion/Reveal'
import { Button } from '~/components/ui/button'
import FormError from '~/components/ui/FormError'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import OrderStatus from '~/components/orders/OrderStatus'
import useCatalogResource from '~/hooks/useCatalogResource'
import { shipperTaskApi } from '~/apis/shipper/shipperTaskApi'
import { SHIPPER_ROUTES } from '~/utils/config/constants'
import { formatDateTime, formatNumber } from '~/utils/format/formats'
import ShipperPanel from '../components/ShipperPanel'
import DeliveryTypeBadge from '../components/DeliveryTypeBadge'
import TaskActionDialog from './TaskActionDialog'
import { canCompleteTask, canStorageTask, taskActionLabel, taskSnapshot } from './taskModel'
import TaskCredential from './TaskCredential'
import TaskMapDialog from './TaskMapDialog'

function Details({ id }) {
  const { t } = useTranslation()
  const { profile } = useOutletContext()
  const [acting, setActing] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  const [unknown, setUnknown] = useState(false)
  const [result, setResult] = useState(null)
  const resource = useCatalogResource(useCallback(async (signal) => {
    if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id || '')) {
      throw new Error('shipper.tasks.invalidId')
    }
    return shipperTaskApi.resolve(id, signal)
  }, [id]))
  const order = resource.data
  const type = order?.assignedTaskType
  const canAct = canCompleteTask(order, profile.data?.id) || canStorageTask(order)
  const unresolved = unknown || order && shipperTaskApi.hasPending(order)
  const check = async () => {
    try {
      const value = await shipperTaskApi.check(order); setResult({ ...value, type }); setUnknown(false); resource.retry(); profile.retry()
    } catch {
      setUnknown(true)
    }
  }
  useEffect(() => {
    document.title = `${order?.orderCode || t('shipper.tasks.detail')} | WashGo`
  }, [order?.orderCode, t])
  return (
    <Reveal className="mx-auto max-w-[1400px] space-y-6 [&_button]:text-base">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {t('shipper.tasks.detail')}
          </h1>
          {order && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <strong className="rounded-lg bg-primary/10 px-3 py-2 text-xl text-primary">
                {order.orderCode}
              </strong>
              <DeliveryTypeBadge type={type} />
              <OrderStatus status={order.status} />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            render={<Link to={SHIPPER_ROUTES.TASKS} />}
            nativeButton={false}
            variant="outline"
            className="h-11 px-5"
          >
            <ArrowLeft size={17} />
            {t('shipper.tasks.back')}
          </Button>
          <Button
            variant="outline"
            className="h-11 px-5"
            disabled={resource.loading || acting}
            onClick={resource.retry}
          >
            <RefreshCw size={17} />
            {t('customer.orders.refresh')}
          </Button>
          {(canAct || unresolved) && (
            <Button
              className="h-11 px-5"
              disabled={acting}
              onClick={() => {
                if (unresolved) {
                  check()
                } else {
                  setActing(true)
                }
              }}
            >
              {type === 1 ? <PackageOpen size={17} /> : <Truck size={17} />}
              {t(unresolved ? 'admin.sync.checkResult' : taskActionLabel(type))}
            </Button>
          )}
        </div>
      </header>
      {result && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 font-medium text-emerald-700 dark:text-emerald-300"
        >
          {t(result.storage ? 'storage.saved' : result.type === 1 ? 'shipper.tasks.collectSaved' : 'shipper.tasks.returnSaved', { box: result.boxNumber || '—' })}
        </p>
      )}
      {unresolved && (
        <FormError>
          {'shipper.tasks.unknown'}
        </FormError>
      )}
      {profile.error && <ResourceFeedback {...profile} />}
      {resource.loading || resource.error || !order ? <ResourceFeedback {...resource} /> : (
        <>
          {!canAct && !profile.loading && (
            <p className="flex items-center gap-2 rounded-xl bg-primary/5 p-4 text-sm text-muted-foreground">
              <Info
                size={18}
                className="shrink-0 text-primary"
              />
              {t('shipper.tasks.noAction')}
            </p>
          )}
          {[3, 4].includes(type) && (
            <StorageOrderPanel
              order={order}
              role="Shipper"
              taskId={order.taskId}
              onUpdated={() => {
                resource.retry(); profile.retry()
              }}
            />
          )}
          <div className="grid items-start gap-5 xl:grid-cols-[1.2fr_1fr]">
            <div className="min-w-0 space-y-5">
              <ShipperPanel
                title={t('shipper.tasks.destination')}
                icon={MapPin}
              >
                <div className="px-5 pt-5">
                  <DeliveryLocker
                    {...taskLocker(order)}
                    autoBox={[2, 4].includes(type)}
                    onOpenMap={() => setMapOpen(true)}
                  />
                </div>
                <dl className="grid gap-5 p-5 sm:grid-cols-2">
                  {[[Clock, 'assigned', formatDateTime(order.shipperAssignedAt, 'Asia/Ho_Chi_Minh')], [Clock, 'deadline', formatDateTime(order.deadline, 'Asia/Ho_Chi_Minh')], [Info, 'note', order.shipperNote]].map(([Icon, key, value]) => (
                    <div
                      key={key}
                      className={key === 'address' || key === 'note' ? 'sm:col-span-2' : ''}
                    >
                      <dt className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <Icon
                          size={16}
                          className="text-primary"
                        />
                        {t(key === 'deadline' ? 'shipper.sync.deadline' : `shipper.tasks.${key}`)}
                      </dt>
                      <dd className="break-words rounded-xl border border-border bg-muted/20 p-3 text-base font-medium">
                        {value || (key === 'box' && type === 2 ? t('shipper.tasks.autoBox') : '—')}
                      </dd>
                    </div>
                  ))}
                </dl>
              </ShipperPanel>
              <ShipperPanel
                title={t('shipper.tasks.merchant')}
                icon={Store}
              >
                <div className="flex items-start gap-4 p-5">
                  <ResourceThumbnail
                    urls={order.merchantImageUrls}
                    name={order.merchantName || profile.data?.merchantName}
                    icon={Store}
                  />
                  <div className="min-w-0 space-y-3">
                    <p className="text-base font-semibold">
                      {order.merchantName || profile.data?.merchantName || '—'}
                    </p>
                    <p className="flex items-start gap-2 break-all text-sm">
                      <Mail
                        size={17}
                        className="mt-0.5 shrink-0 text-primary"
                      />
                      <span>
                        <span className="text-muted-foreground">
                          {t('shipper.media.email')}
                          :
                          {' '}
                        </span>
                        {order.merchantEmail ? (
                          <a
                            href={`mailto:${order.merchantEmail}`}
                            className="hover:text-primary hover:underline"
                          >
                            {order.merchantEmail}
                          </a>
                        ) : '—'}
                      </span>
                    </p>
                    <p className="flex items-start gap-2 text-sm">
                      <Phone
                        size={17}
                        className="mt-0.5 shrink-0 text-primary"
                      />
                      <span>
                        <span className="text-muted-foreground">
                          {t('shipper.media.phone')}
                          :
                          {' '}
                        </span>
                        {order.merchantPhone ? (
                          <a
                            href={`tel:${order.merchantPhone}`}
                            className="hover:text-primary hover:underline"
                          >
                            {order.merchantPhone}
                          </a>
                        ) : '—'}
                      </span>
                    </p>
                  </div>
                </div>
              </ShipperPanel>
            </div>
            <div className="min-w-0 space-y-5">
              <ShipperPanel
                title={t('shipper.tasks.services')}
                icon={Package}
              >
                <ul className="divide-y divide-border px-5">
                  {(order.items || []).map((item, index) => (
                    <li
                      key={item.id || index}
                      className="flex items-center gap-3 py-4"
                    >
                      <ResourceThumbnail
                        urls={item.serviceImageUrls}
                        name={item.serviceName}
                      />
                      <div className="min-w-0">
                        <p className="text-base font-semibold">
                          {item.serviceName || '—'}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t('shipper.tasks.quantity', { count: item.quantity || 0 })}
                        </p>
                        {item.note && (
                          <p className="mt-2 break-words text-sm text-muted-foreground">
                            {item.note}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                {Number.isFinite(order.actualWeightKg) && (
                  <p className="border-t border-border p-5 text-sm">
                    {t('shipper.tasks.weight', { value: formatNumber(order.actualWeightKg) })}
                  </p>
                )}
              </ShipperPanel>
              {canAct && !unresolved && (
                <TaskCredential
                  key={taskSnapshot(order)}
                  order={order}
                  shipperId={profile.data?.id}
                />
              )}
            </div>
          </div>
        </>
      )}
      {acting && order && (
        <TaskActionDialog
          order={order}
          shipperId={profile.data?.id}
          onUnknown={() => setUnknown(true)}
          onClose={() => {
            setActing(false); resource.retry()
          }}
          onSaved={(value) => {
            setResult({ ...value, type }); setActing(false); resource.retry(); profile.retry()
          }}
        />
      )}
      {mapOpen && (
        <TaskMapDialog
          id={order?.taskId || id}
          onClose={() => setMapOpen(false)}
        />
      )}
    </Reveal>
  )
}
export default function TaskDetailPage() {
  const { orderId } = useParams()
  return (
    <Details
      key={orderId}
      id={orderId}
    />
  )
}
