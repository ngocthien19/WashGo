import { paymentFailure, validatePaymentSession } from '~/utils/orders/paymentSession'
import { paymentEligibility } from '~/utils/orders/paymentEligibility'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CreditCard } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import FormError from '~/components/ui/FormError'
import { customerPaymentApi } from '~/apis/customer/customerPaymentApi'
import { paymentRedirectUrl } from '~/pages/customer/Payment/paymentModel'
import { getApiError } from '~/utils/http/apiError'
import { formatCurrency } from '~/utils/format/formats'
import { ORDER_STATUSES, PAYMENT_STATUSES, ORDER_PAYMENT_METHODS } from '~/utils/config/constants'
import PaymentMethodPicker from './PaymentMethodPicker'
import { useSelector } from 'react-redux'
import { readCancellationSession, saveCancellationSession, clearCancellationSession } from '~/utils/orders/cancellationPaymentSession'

export default function FeePaymentAction(props) {
  const userId = useSelector(state => state.auth.user?.id)
  return (
    <FeePaymentDialog
      key={`${userId}:${props.order.id}`}
      {...props}
      userId={userId}
    />
  )
}

function FeePaymentDialog({ order, userId, onUpdated, autoOpen = false, autoStart = false, initialMethod = ORDER_PAYMENT_METHODS.VNPAY, onClose }) {
  const { t } = useTranslation()
  const [session, setSession] = useState(() => order.status === ORDER_STATUSES.CANCELLED && order.cancellationFeeOutstanding > 0 ? readCancellationSession(userId, order.id) : null)
  const [open, setOpen] = useState(autoOpen)
  const [method, setMethod] = useState(session ? session.method : initialMethod)
  const [form, setForm] = useState(null)
  const started = useRef(false)
  const [busy, setBusy] = useState(false)
  const [unknown, setUnknown] = useState(session?.review || false)
  const [error, setError] = useState(session?.review ? 'customer.payment.uncertain' : '')
  const [fixed, setFixed] = useState(null)
  const [retryWait, setRetryWait] = useState(false)
  useEffect(() => {
    if (!fixed) {
      return
    }
    const timer = setTimeout(() => setRetryWait(false), fixed.retryAfter * 1000)
    return () => clearTimeout(timer)
  }, [fixed])
  const lock = useRef(false)
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const cancellation = order.status === ORDER_STATUSES.CANCELLED && order.cancellationFeeOutstanding > 0
  const amount = cancellation ? order.cancellationFeeOutstanding : undefined
  const amountAllowed = paymentEligibility(method, amount).allowed
  const remember = value => {
    if (!cancellation) {
      return
    }
    setSession(value)
    if (value) {
      saveCancellationSession(userId, order.id, value)
    } else {
      clearCancellationSession(userId, order.id)
    }
  }
  useEffect(() => {
    if (order.status === ORDER_STATUSES.CANCELLED && order.cancellationFeeOutstanding === 0) {
      clearCancellationSession(userId, order.id)
    }
  }, [order.status, order.cancellationFeeOutstanding, userId, order.id])
  const storage = [ORDER_STATUSES.READY_TO_RETURN, ORDER_STATUSES.MOVED_TO_STORAGE].includes(order.status) && order.paymentStatus === PAYMENT_STATUSES.PAID && (order.status === ORDER_STATUSES.MOVED_TO_STORAGE || order.isPickupOverdue || order.overdueFeeTotal > order.storageFeeTotal)
  useEffect(() => {
    if (autoStart && form && open && (cancellation || storage) && !started.current) {
      started.current = true
      form.requestSubmit()
    }
  }, [autoStart, form, open, cancellation, storage])
  const close = () => {
    setOpen(false); onClose?.()
  }
  if (!cancellation && !storage) {
    return null
  }
  const title = cancellation ? 'customer.sync.payCancellationFee' : 'customer.sync.payStorageFee'
  return (
    <>
      {!autoOpen && (
        <Button
          variant="outline"
          className="h-11 rounded-xl"
          onClick={() => {
            if (cancellation) {
              const stored = readCancellationSession(userId, order.id)
              if (stored) {
                setSession(stored); setMethod(stored.method)
                if (stored.review) {
                  setUnknown(true); setError('customer.payment.uncertain')
                }
              }
            }
            setOpen(true)
          }}
        >
          <CreditCard size={17} />
          {t(title)}
        </Button>
      )}
      {open && (
        <Dialog
          open
          onOpenChange={(next) => {
            if (!next && !busy) {
              close()
            }
          }}
        >
          <DialogContent
            className="max-w-lg p-0 sm:p-0"
            closeLabel="common.close"
            data-dialog-fixed
          >
            <DialogHeader className="mx-0 mt-0 px-6 pr-14 sm:mx-0 sm:mt-0 sm:px-6">
              <DialogTitle className="flex items-center gap-3 text-xl font-bold">
                <CreditCard className="text-primary" />
                {t(title)}
              </DialogTitle>
              <DialogDescription className="mt-3 text-base leading-6 text-muted-foreground">
                {order.orderCode}
                {' '}
                ·
                {' '}
                {t('customer.sync.feeServerAmount')}
              </DialogDescription>
            </DialogHeader>
            <form
              ref={setForm}
              className="grid gap-5 p-6"
              onSubmit={async (event) => {
                event.preventDefault()
                if (lock.current || !amountAllowed || unknown || retryWait || ![2, 3].includes(method)) {
                  return
                }
                lock.current = true; setBusy(true); setError('')
                remember({ method, review: true })
                try {
                  const result = await customerPaymentApi.createFeeUrl(order.id, method, cancellation ? 'cancellation' : 'overdue')
                  if (cancellation && Math.abs(result.amount - order.cancellationFeeOutstanding) > .001) {
                    throw new Error('customer.payment.invalidResponse')
                  }
                  if (result.orderId !== order.id || result.paymentMethod !== method || !Number.isFinite(result.amount) || result.amount <= 0 || result.purpose != null && result.purpose !== (cancellation ? 3 : 2) || result.pointsToRedeem != null && result.pointsToRedeem !== 0) {
                    throw new Error('customer.payment.invalidResponse')
                  }
                  const status = validatePaymentSession(result)
                  if (status === 'completed') {
                    remember(null)
                    if (!mounted.current) {
                      return
                    }
                    setUnknown(true); setBusy(false); setError('paymentSession.completedFee'); onUpdated?.(); return
                  }
                  if (!paymentEligibility(method, result.amount).allowed) {
                    // A session may already exist at BE: keep the gateway locked for verification.
                    throw new Error('paymentLimits.existingSession')
                  }

                  const url = paymentRedirectUrl(result.paymentUrl)
                  remember({ method, review: false })
                  if (mounted.current) {
                    window.location.assign(url)
                  }
                } catch (failure) {
                  if (!mounted.current) {
                    return
                  }
                  const outcome = paymentFailure(failure)
                  const uncertain = outcome.locked && !outcome.initializing
                  const methodConflict = failure.response?.data?.meta?.code === 'PaymentMethodConflict'
                  if (methodConflict) {
                    // The API does not identify the existing gateway: do not present the attempted one as fact.
                    setMethod(null); remember({ method: null, review: true })
                  } else if (outcome.locked) {
                    remember({ method, review: uncertain })
                  } else {
                    remember(session || null)
                  }
                  if (outcome.initializing) {
                    setFixed({ retryAfter: outcome.retryAfter }); setRetryWait(true)
                  }
                  if (!outcome.locked) {
                    setFixed(null); setRetryWait(false)
                  }
                  setUnknown(uncertain); setError(outcome.message || getApiError(failure)); lock.current = uncertain; setBusy(false)
                }
              }}
              data-dialog-layout
            >
              <div data-dialog-body>
                {autoOpen && (
                  <p
                    role="status"
                    className="rounded-xl bg-amber-500/10 p-4 text-sm leading-6"
                  >
                    {t('customer.orders.cancel.cancelledPayPending')}
                  </p>
                )}
                {cancellation && (
                  <p className="text-xl font-bold text-primary">
                    {formatCurrency(order.cancellationFeeOutstanding)}
                  </p>
                )}
                <PaymentMethodPicker
                  value={method}
                  onChange={setMethod}
                  disabled={busy || unknown || !!fixed}
                  onlineOnly
                  lockedMethod={session?.method}
                  amount={amount}
                />
                {session?.method && !amountAllowed && (
                  <p
                    role="alert"
                    className="rounded-xl bg-amber-500/10 p-3 text-sm leading-6"
                  >
                    {t('paymentLimits.existingSession')}
                  </p>
                )}
                {session?.method && (
                  <p className="rounded-xl bg-primary/5 p-3 text-sm leading-6 text-muted-foreground">
                    {t('paymentSession.feeMethodLocked', { method: session.method === 2 ? 'VNPAY' : 'MoMo' })}
                  </p>
                )}
                <FormError>
                  {error}
                </FormError>
              </div>
              <div
                className="flex flex-wrap justify-end gap-3 border-t border-border pt-5"
                data-dialog-footer
              >
                <Button
                  type="button"
                  variant="secondary"
                  className="h-12 rounded-xl px-5 text-base font-semibold"
                  disabled={busy}
                  onClick={close}
                >
                  {t('common.close')}
                </Button>
                <Button
                  type="submit"
                  className="h-12 rounded-xl px-5 text-base font-semibold"
                  disabled={busy || !amountAllowed || unknown || retryWait}
                >
                  {t(fixed ? 'paymentSession.retrySame' : 'customer.payment.pay')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
