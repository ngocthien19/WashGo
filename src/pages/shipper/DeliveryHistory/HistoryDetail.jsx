import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { History } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import useCatalogResource from '~/hooks/useCatalogResource'
import { shipperDeliveryApi } from '~/apis/shipper/shipperDeliveryApi'
import DeliveryLocker from '../components/DeliveryLocker'
import OrderStatus from '~/components/orders/OrderStatus'
import { formatDateTime } from '~/utils/format/formats'
export default function HistoryDetail({ id, onClose }) {
  const { t } = useTranslation()
  const resource = useCatalogResource(useCallback(signal => shipperDeliveryApi.detail(id, signal), [id]))
  const row = resource.data
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent
        className="max-w-2xl"
        closeLabel="common.close"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 pr-8 text-2xl">
            <History />
            {t('shipper.sync.eventDetail')}
          </DialogTitle>
          <DialogDescription className="mt-3">
            {row?.orderCode || t('shipper.nav.history')}
          </DialogDescription>
        </DialogHeader>
        {resource.loading || resource.error || !row ? <ResourceFeedback {...resource} /> : (
          <div className="mt-5 space-y-5">
            <DeliveryLocker
              name={row.lockerName}
              address={row.lockerAddress}
              images={row.lockerImageUrls}
              box={row.boxNumber}
            />
            <dl className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
              {[['shipper.tasks.assigned', formatDateTime(row.assignedAt)], ['shipper.deliveryHistory.completedAt', formatDateTime(row.completedAt)], ['shipper.tasks.merchant', row.merchantName], ['shipper.sync.deadline', formatDateTime(row.deadline)]].map(([key, value]) => (
                <div key={key}>
                  <dt className="mb-2 text-sm text-muted-foreground">
                    {t(key)}
                  </dt>
                  <dd className="text-base font-medium">
                    {value || '\u2014'}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap gap-3">
              <span>
                {t('shipper.sync.eventStatus')}
              </span>
              {row.eventStatus == null ? '\u2014' : <OrderStatus status={row.eventStatus} />}
            </div>
            <p className="rounded-xl bg-primary/5 p-4 text-sm text-muted-foreground">
              {t(row.snapshotSource === 'CapturedAtCompletion' ? 'shipper.sync.captured' : 'shipper.sync.legacy')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('shipper.sync.currentImages')}
            </p>
            {row.note && (
              <p className="whitespace-pre-wrap break-words text-base">
                {row.note}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
