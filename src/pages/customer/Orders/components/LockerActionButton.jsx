import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DoorOpen } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { ORDER_STATUSES } from '~/utils/constants'
import { canPickupFromLocker } from '~/components/customer/orders/orderWorkflow'

const LockerActionDialog = lazy(() => import('./LockerActionDialog'))

export default function LockerActionButton({ order, onUpdated }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const deposit = order.status === ORDER_STATUSES.PENDING
  const pickup = canPickupFromLocker(order)
  if (!deposit && !pickup) {
    return null
  }
  return (
    <>
      <Button
        className="h-11 gap-2 rounded-xl bg-emerald-600 px-5 text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 focus-visible:ring-emerald-500/40"
        onClick={() => setOpen(true)}
      >
        <DoorOpen size={18} />
        {t(deposit ? 'customer.orders.scan.deposit' : 'customer.orders.scan.pickup')}
      </Button>
      {open && (
        <Suspense fallback={(
          <p role="status">
            {t('customer.orders.scan.loading')}
          </p>
        )}
        >
          <LockerActionDialog
            order={order}
            deposit={deposit}
            onClose={() => setOpen(false)}
            onUpdated={() => {
              setOpen(false)
              onUpdated()
            }}
          />
        </Suspense>
      )}
    </>
  )
}
