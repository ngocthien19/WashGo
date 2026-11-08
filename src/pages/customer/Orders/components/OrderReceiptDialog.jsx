import ReceiptDownload from './ReceiptDownload'
import { useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Printer, ReceiptText } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import CatalogFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import useCatalogResource from '~/hooks/useCatalogResource'
import { customerReceiptApi } from '~/apis/customer/customerReceiptApi'
import OrderReceiptDocument from './OrderReceiptDocument'

function ReceiptPrintCopy({ order }) {
  useEffect(() => {
    // Isolate the printable document from the page and modal portals.
    const classes = ['print:[&>*:not([data-receipt-print])]:hidden', 'print:overflow-visible', 'print:h-auto']
    document.body.classList.add(...classes)
    return () => document.body.classList.remove(...classes)
  }, [])
  return createPortal(
    <div
      data-receipt-print
      className="hidden print:block print:bg-white print:text-black"
    >
      <OrderReceiptDocument order={order} />
    </div>, document.body
  )
}

export default function OrderReceiptDialog({ orderId, onClose }) {
  const { t } = useTranslation()
  const load = useCallback((signal) => customerReceiptApi.get(orderId, signal), [orderId])
  const resource = useCatalogResource(load)
  const order = resource.data
  const printable = !!order
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent
        className="max-w-4xl overflow-hidden p-0 sm:p-0"
        closeLabel="common.close"
      >
        <div className="flex max-h-[85dvh] flex-col">
          <div className="shrink-0 border-b border-border px-5 py-5 pr-14 sm:px-7">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <ReceiptText className="size-5 text-primary" />
              {t('customer.orders.receipt.action')}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm font-semibold">
              {order?.orderCode || t('customer.orders.loadingDetail')}
            </DialogDescription>
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain bg-muted/25 p-4 sm:p-6">
            {resource.loading || resource.error ? (
              <CatalogFeedback
                {...resource}
                loadingText="customer.orders.loadingDetail"
              />
            ) : printable ? (
              <OrderReceiptDocument order={order} />
            ) : (
              <p
                role="status"
                className="p-4 text-sm"
              >
                {t('customer.orders.receipt.unavailable')}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border bg-card px-5 py-4 sm:px-7">
            <ReceiptDownload
              orderId={orderId}
              disabled={!printable || resource.loading || !!resource.error}
            />
            <Button
              variant="secondary"
              className="h-11 rounded-xl px-4"
              onClick={onClose}
            >
              {t('common.close')}
            </Button>
            <Button
              className="h-11 rounded-xl px-4"
              disabled={!printable || resource.loading || !!resource.error}
              onClick={() => window.print()}
            >
              <Printer size={16} />
              {t('customer.orders.receipt.print')}
            </Button>
          </div>
        </div>
      </DialogContent>
      {printable && !resource.loading && !resource.error && (
        <ReceiptPrintCopy order={order} />
      )}
    </Dialog>
  )
}
