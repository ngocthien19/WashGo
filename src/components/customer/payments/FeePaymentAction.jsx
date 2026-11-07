import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CreditCard } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import FormError from '~/components/ui/FormError'
import { customerPaymentApi } from '~/apis/customer/customerPaymentApi'
import { paymentRedirectUrl } from '~/pages/customer/Payment/paymentModel'
import { getApiError } from '~/utils/apiError'
import { formatCurrency } from '~/utils/formats'
import { ORDER_STATUSES, PAYMENT_STATUSES, ORDER_PAYMENT_METHODS } from '~/utils/constants'
import PaymentMethodPicker from './PaymentMethodPicker'

export default function FeePaymentAction({ order }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState(ORDER_PAYMENT_METHODS.VNPAY)
  const [busy, setBusy] = useState(false)
  const [unknown, setUnknown] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const cancellation = order.status === ORDER_STATUSES.CANCELLED && order.cancellationFeeOutstanding > 0
  const storage = [ORDER_STATUSES.READY_TO_RETURN, ORDER_STATUSES.MOVED_TO_STORAGE].includes(order.status) && order.paymentStatus === PAYMENT_STATUSES.PAID && (order.status === ORDER_STATUSES.MOVED_TO_STORAGE || order.isPickupOverdue || order.overdueFeeTotal > order.storageFeeTotal)
  if (!cancellation && !storage) {
    return null
  }
  const title = cancellation ? 'customer.sync.payCancellationFee' : 'customer.sync.payStorageFee'
  return (
    <>
      <Button
        variant="outline"
        className="h-11 rounded-xl"
        onClick={() => setOpen(true)}
      >
        <CreditCard size={17} />
        {t(title)}
      </Button>
      {open && (
        <Dialog
          open
          onOpenChange={(next) => {
            if (!next && !busy) {
              setOpen(false)
            }
          }}
        >
          <DialogContent
            className="max-w-lg"
            closeLabel="common.close"
          >
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <CreditCard className="text-primary" />
              {t(title)}
            </DialogTitle>
            <DialogDescription className="mt-3 text-base leading-6">
              {order.orderCode}
              {' '}
              ·
              {' '}
              {t('customer.sync.feeServerAmount')}
            </DialogDescription>
            {cancellation && (
              <p className="mt-4 text-lg font-bold text-primary">
                {formatCurrency(order.cancellationFeeOutstanding)}
              </p>
            )}
            <form
              className="mt-5 grid gap-5"
              onSubmit={async (event) => {
                event.preventDefault()
                if (lock.current || unknown) {
                  return
                }
                lock.current = true; setBusy(true); setError('')
                try {
                  const result = await customerPaymentApi.createFeeUrl(order.id, method, cancellation ? 'cancellation' : 'overdue')
                  if (result.orderId !== order.id || result.paymentMethod !== method || !Number.isFinite(result.amount) || result.amount <= 0) {
                    throw new Error('customer.payment.invalidResponse')
                  }
                  const url = paymentRedirectUrl(result.paymentUrl)
                  if (mounted.current) {
                    window.location.assign(url)
                  }
                } catch (failure) {
                  if (!mounted.current) {
                    return
                  }
                  const uncertain = !failure.response || failure.response.status >= 500
                  setUnknown(uncertain); setError(uncertain ? 'customer.payment.uncertain' : getApiError(failure)); lock.current = uncertain; setBusy(false)
                }
              }}
            >
              <PaymentMethodPicker
                value={method}
                onChange={setMethod}
                disabled={busy || unknown}
                onlineOnly
              />
              <FormError>
                {error}
              </FormError>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setOpen(false)}
                >
                  {t('common.close')}
                </Button>
                <Button
                  type="submit"
                  disabled={busy || unknown}
                >
                  {t('customer.payment.pay')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
