import { useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '~/components/ui/dialog'
import CatalogFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import { customerPaymentApi } from '~/apis/customer/customerPaymentApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import PaymentCheckout from './PaymentCheckout'

export default function PaymentDialog({ orderId, onClose, pendingRequests: pending }) {
  const { t } = useTranslation()
  const localPending = useRef(new Set())
  const resource = useCatalogResource(useCallback(signal => customerPaymentApi.getOrder(orderId, signal), [orderId]))
  const order = resource.data
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
        className="flex max-w-3xl flex-col overflow-hidden p-0 sm:p-0"
        closeLabel="common.close"
      >
        {resource.loading || resource.error ? (
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="pr-8 text-2xl font-bold">
                {t('customer.payment.title')}
              </DialogTitle>
              <DialogDescription>
                {t('customer.payment.loading')}
              </DialogDescription>
            </DialogHeader>
            <CatalogFeedback
              {...resource}
              loadingText="customer.payment.loading"
            />
          </div>
        ) : (
          <PaymentCheckout
            key={`${order.id}:${order.paymentStatus}:${order.status}`}
            order={order}
            refresh={resource.retry}
            pendingRequests={pending || localPending}
            modal
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
