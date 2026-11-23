import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { RefreshCw } from 'lucide-react'
import { customerPaymentApi } from '~/apis/customer/customerPaymentApi'
import { Button } from '~/components/ui/button'
import { getApiError } from '~/utils/http/apiError'
import { PAYMENT_RETURN_POLL, PAYMENT_STATUSES } from '~/utils/config/constants'

const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i
const states = ['Queued', 'Verifying', 'Completed', 'NeedsReview']

export default function PaymentReturnMonitor({ orderId, onConfirmed }) {
  const { t } = useTranslation()
  const userId = useSelector(state => state.auth.user?.id)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('paymentReturn.waiting')
  const [error, setError] = useState('')
  const lock = useRef(false)
  const operation = useRef(null)
  const refresh = useRef(null)
  const active = useRef(false)
  const confirmed = useRef(onConfirmed)
  const storageKey = `washgo:payment-return-verification:${userId}:${orderId}:1`
  useEffect(() => {
    confirmed.current = onConfirmed
  }, [onConfirmed])

  useEffect(() => {
    active.current = true
    const controller = new AbortController()
    let timer, reads = 0, reading = false
    try {
      const saved = sessionStorage.getItem(storageKey)
      operation.current = uuid.test(saved || '') ? saved : null
    } catch { /* Keep the operation in memory when storage is unavailable. */ }
    const read = async () => {
      if (reading || lock.current || controller.signal.aborted) {
        return
      }
      reading = true
      clearTimeout(timer)
      let delay = PAYMENT_RETURN_POLL.INTERVAL_MS
      try {
        const order = await customerPaymentApi.getOrder(orderId, controller.signal)
        if (controller.signal.aborted) {
          return
        }
        if (order.id !== orderId) {
          throw new Error('customer.payment.invalidResponse')
        }
        if (order.paymentStatus === PAYMENT_STATUSES.PAID) {
          try {
            sessionStorage.removeItem(storageKey)
          } catch { /* Storage is optional. */ }
          confirmed.current()
          return
        }
        const session = await customerPaymentApi.getActiveSession(orderId, 1, controller.signal)
        if (controller.signal.aborted) {
          return
        }
        if (!operation.current && uuid.test(session?.verificationOperationId || '')) {
          operation.current = session.verificationOperationId
        }
        if (session?.requiresReconciliation) {
          setMessage('paymentReturn.review')
          return
        }
        if (operation.current) {
          const result = await customerPaymentApi.getVerification(operation.current, controller.signal)
          if (controller.signal.aborted) {
            return
          }
          if (result.operationId !== operation.current || result.orderId !== orderId || result.purpose !== 1 || !states.includes(result.state)) {
            throw new Error('customer.payment.invalidResponse')
          }
          setMessage(result.requiresReconciliation || result.state === 'NeedsReview' ? 'paymentReturn.review' : result.state === 'Completed' ? 'paymentReturn.completed' : 'paymentReturn.checking')
          if (result.state === 'NeedsReview' || result.requiresReconciliation) {
            return
          }
          if (result.retryAfterSeconds != null) {
            if (!Number.isFinite(result.retryAfterSeconds)) {
              throw new Error('customer.payment.invalidResponse')
            }
            delay = Math.min(PAYMENT_RETURN_POLL.MAX_DELAY_SECONDS, Math.max(PAYMENT_RETURN_POLL.MIN_DELAY_SECONDS, result.retryAfterSeconds)) * 1000
          }
        }
        setError('')
      } catch (failure) {
        if (!controller.signal.aborted) {
          setError(getApiError(failure))
        }
        return
      } finally {
        reading = false
      }
      if (!controller.signal.aborted && ++reads < PAYMENT_RETURN_POLL.MAX_READS) {
        timer = setTimeout(read, delay)
      }
    }
    refresh.current = () => {
      reads = 0; return read()
    }
    read()
    return () => {
      active.current = false
      controller.abort()
      clearTimeout(timer)
      refresh.current = null
    }
  }, [orderId, storageKey])

  const check = async () => {
    if (lock.current) {
      return
    }
    lock.current = true
    setBusy(true)
    setError('')
    let submitted = false
    try {
      if (!operation.current) {
        const session = await customerPaymentApi.getActiveSession(orderId, 1)
        if (!active.current) {
          return
        }
        if (uuid.test(session?.verificationOperationId || '')) {
          operation.current = session.verificationOperationId
        }
        if (session?.requiresReconciliation) {
          setMessage('paymentReturn.review')
          return
        }
        if (!operation.current && session?.canVerify) {
          operation.current = crypto.randomUUID()
          // Save only the scoped operation UUID, never gateway signatures or URLs.
          try {
            sessionStorage.setItem(storageKey, operation.current)
          } catch { /* Retain the UUID in memory. */ }
          submitted = true
          await customerPaymentApi.verifySession(orderId, 1, operation.current)
        }
      }
      if (active.current) {
        setMessage(operation.current ? 'paymentReturn.checking' : 'paymentReturn.waiting')
      }
    } catch (failure) {
      if (submitted && [400, 403, 404, 409, 422].includes(failure.response?.status)) {
        operation.current = null
        try {
          sessionStorage.removeItem(storageKey)
        } catch { /* Storage is optional. */ }
      }
      // An uncertain POST is followed only by GET for the same UUID, never another POST.
      if (active.current) {
        setError(getApiError(failure))
      }
    } finally {
      lock.current = false
      if (active.current) {
        setBusy(false)
        refresh.current?.()
      }
    }
  }
  return (
    <section className="space-y-3 rounded-2xl border border-primary/20 bg-card p-5">
      <p
        role="status"
        className="text-sm leading-6 text-muted-foreground"
      >
        {t(message)}
      </p>
      {error && (
        <p
          role="alert"
          className="text-sm text-destructive"
        >
          {t(error)}
        </p>
      )}
      <Button
        variant="outline"
        disabled={busy}
        onClick={check}
      >
        <RefreshCw className={busy ? 'size-4 animate-spin' : 'size-4'} />
        {t(busy ? 'paymentReturn.checkingButton' : 'paymentReturn.checkButton')}
      </Button>
    </section>
  )
}
