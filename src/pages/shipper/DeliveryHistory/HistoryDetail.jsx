import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { History, CalendarClock, CircleCheck, Store, Timer, MessageSquareText } from 'lucide-react'
import { Button } from '~/components/ui/button'
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
        data-dialog-fixed
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 pr-8 text-2xl font-bold">
            <History />
            {t('shipper.sync.eventDetail')}
          </DialogTitle>
          <DialogDescription className="mt-3 text-sm font-semibold text-primary">
            {row?.orderCode || t('shipper.nav.history')}
          </DialogDescription>
        </DialogHeader>
        <div data-dialog-body>
          {resource.loading || resource.error || !row ? <ResourceFeedback {...resource} /> : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <DeliveryLocker
                  name={row.lockerName}
                  address={row.lockerAddress}
                  images={row.lockerImageUrls}
                  box={row.boxNumber}
                />
              </div>
              <dl className="grid gap-5 rounded-2xl border border-border p-4 sm:grid-cols-2 sm:p-5">
                {[['shipper.tasks.assigned', formatDateTime(row.assignedAt), CalendarClock], ['shipper.deliveryHistory.completedAt', formatDateTime(row.completedAt), CircleCheck], ['shipper.tasks.merchant', row.merchantName, Store], ['shipper.sync.deadline', formatDateTime(row.deadline), Timer]].map(([key, value, Icon]) => (
                  <div key={key}>
                    <dt className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <Icon
                        size={16}
                        className="shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      {t(key)}
                    </dt>
                    <dd className="break-words text-base font-semibold">
                      {value || '\u2014'}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
                <span className="text-sm font-medium">
                  {t('shipper.sync.eventStatus')}
                </span>
                {row.eventStatus == null ? '\u2014' : <OrderStatus status={row.eventStatus} />}
              </div>
              <p className="rounded-xl bg-primary/5 p-4 text-sm text-muted-foreground">
                {t(row.snapshotSource === 'CapturedAtCompletion' ? 'shipper.sync.captured' : 'shipper.sync.legacy')}
              </p>
              {row.note && (
                <p className="flex items-start gap-3 whitespace-pre-wrap break-words rounded-xl border border-primary/15 bg-primary/5 p-4 text-sm leading-6">
                  <MessageSquareText
                    size={18}
                    className="mt-0.5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  {row.note}
                </p>
              )}
            </div>
          )}
        </div>
        <footer
          data-dialog-footer
          className="flex justify-end"
        >
          <Button
            variant="secondary"
            className="h-11 min-w-24 px-5 text-base"
            onClick={onClose}
          >
            {t('common.close')}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
