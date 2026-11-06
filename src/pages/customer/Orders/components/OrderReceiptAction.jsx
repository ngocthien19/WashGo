import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Printer } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { canPrintReceipt } from '~/components/customer/orders/orderWorkflow'

const OrderReceiptDialog = lazy(() => import('./OrderReceiptDialog'))

export default function OrderReceiptAction({ order }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  if (!canPrintReceipt(order)) {
    return null
  }
  return (
    <>
      <Button
        variant="outline-violet"
        className="h-11 rounded-xl px-4"
        onClick={() => setOpen(true)}
      >
        <Printer size={16} />
        {t('customer.orders.receipt.action')}
      </Button>
      {open && (
        <Suspense fallback={(
          <p role="status">
            {t('customer.orders.loadingDetail')}
          </p>
        )}
        >
          <OrderReceiptDialog
            orderId={order.id}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      )}
    </>
  )
}
