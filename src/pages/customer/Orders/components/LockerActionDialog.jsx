import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DoorOpen, ShieldCheck, LockKeyhole, HandHeart } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import OtpInput from '~/components/ui/OtpInput'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import FormError from '~/components/ui/FormError'
import QrScanInput from '~/components/customer/orders/QrScanInput'
import { isOrderQr } from '~/utils/qrScanner'
import { getApiError } from '~/utils/apiError'
import { customerOrderApi } from '~/apis/customer/customerOrderApi'
import { ORDER_STATUSES, LOCKER_SLOT_SIZES } from '~/utils/constants'
import DepositDeadlineNotice from './DepositDeadlineNotice'

export default function LockerActionDialog({ order, deposit, onClose, onUpdated }) {
  const { t } = useTranslation()
  const reducedMotion = useReducedMotion()
  const [mode, setMode] = useState('pin')
  const [pin, setPin] = useState('')
  const [qr, setQr] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [unknown, setUnknown] = useState(false)
  const [session, setSession] = useState(null)
  const [expired, setExpired] = useState(false)
  const credentialsReady = mode === 'pin' ? /^[0-9]{6}$/.test(pin) : !!qr
  const lock = useRef(false)
  const active = useRef(false)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  useEffect(() => {
    if (!session) {
      return
    }
    const timer = setTimeout(() => setExpired(true), Math.max(0, Date.parse(session.expiresAt) - Date.now()))
    return () => clearTimeout(timer)
  }, [session])
  const acceptQr = (value) => {
    setQr('')
    setError('')
    if (!isOrderQr(value, order.orderCode, deposit)) {
      setError('customer.orders.scan.wrongOrder')
      return
    }
    setQr(value)
  }
  const submit = async (event) => {
    event.preventDefault()
    if (lock.current || unknown || expired) {
      return
    }
    if (!session && !credentialsReady) {
      setError(mode === 'pin' ? 'customer.orders.scan.invalidPin' : 'customer.orders.scan.requiredQr')
      return
    }
    if (session && Date.parse(session.expiresAt) <= Date.now()) {
      setExpired(true)
      return
    }
    lock.current = true
    setBusy(true)
    setError('')
    try {
      const credentials = mode === 'pin' ? { pinCode: pin } : { qrCode: qr }
      if (deposit || session) {
        const result = deposit ? await customerOrderApi.deposit(order.id, credentials)
          : await customerOrderApi.confirmPickup(order.id, session.pickupSessionToken)
        if (result.id !== order.id || result.status !== (deposit ? ORDER_STATUSES.DEPOSITED : ORDER_STATUSES.COMPLETED)) {
          throw new Error('customer.orders.scan.unknownOutcome')
        }
        if (active.current) {
          onUpdated()
        }
      } else {
        const result = await customerOrderApi.openPickup(order.id, credentials)
        if (result.orderId !== order.id || !result.pickupSessionToken || !Number.isFinite(Date.parse(result.expiresAt)) || Date.parse(result.expiresAt) <= Date.now()) {
          throw new Error('customer.orders.scan.unknownOutcome')
        }
        if (active.current) {
          setSession(result)
          setPin('')
          setQr('')
        }
      }
      lock.current = false
    } catch (failure) {
      const status = failure.response?.status
      const uncertain = !status || status >= 500
      lock.current = uncertain
      if (active.current) {
        setUnknown(uncertain)
        setError(uncertain ? 'customer.orders.scan.unknownOutcome' : getApiError(failure))
      }
    } finally {
      if (active.current) {
        setBusy(false)
      }
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) {
          onClose()
        }
      }}
    >
      <DialogContent
        closeLabel="common.close"
        className={deposit ? 'max-w-4xl overflow-hidden p-0 sm:p-0 [&>button]:z-10' : undefined}
      >
        <div className={deposit ? 'grid max-h-[85dvh] md:h-[min(48rem,85dvh)] md:grid-cols-[0.85fr_1fr]' : undefined}>
          {deposit && (
            <div className="hidden min-h-0 flex-col items-center justify-center gap-5 bg-linear-to-br from-blue-100 via-blue-50 to-indigo-100 px-7 py-6 text-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 dark:text-white md:flex md:rounded-l-2xl">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <DoorOpen className="size-5 text-blue-600 dark:text-emerald-300" />
                {t('customer.orders.dropoff.lockerPreview')}
              </p>
              <div
                className="grid w-full max-w-64 grid-cols-3 gap-3"
                aria-hidden="true"
              >
                {Array.from({ length: 9 }, (_, index) => index === 4 ? (
                  <motion.div
                    key={index}
                    initial={reducedMotion ? false : { scale: 0.95 }}
                    animate={{ scale: 1 }}
                    className="row-span-1 flex min-h-[clamp(3rem,12dvh,6rem)] flex-col items-center justify-center gap-2 rounded-xl border-2 border-blue-400 bg-white/85 p-2 shadow-lg shadow-blue-500/10 dark:border-emerald-400 dark:bg-emerald-400/15 dark:shadow-emerald-500/10"
                  >
                    <span className="text-lg font-bold text-blue-700 dark:text-emerald-200">
                      {order.boxNumber}
                    </span>
                    <DoorOpen className="size-7 text-blue-600 dark:text-emerald-300" />
                  </motion.div>
                ) : (
                  <div
                    key={index}
                    className="grid min-h-[clamp(3rem,12dvh,6rem)] place-items-center rounded-xl border border-blue-200/65 bg-white/55 shadow-sm dark:border-white/5 dark:bg-white/3 dark:shadow-none"
                  >
                    <LockKeyhole className="size-4 text-blue-300 dark:text-slate-600" />
                  </div>
                ))}
              </div>
              <p className="max-w-64 text-center text-xs leading-6 text-slate-500 dark:text-slate-400">
                {t('customer.orders.dropoff.previewNote')}
              </p>
            </div>
          )}
          <div className={deposit ? 'max-h-[85dvh] min-h-0 overflow-y-auto overscroll-contain p-6 sm:p-8 md:max-h-none' : undefined}>
            <DialogTitle className="flex items-center gap-3 pr-7 text-xl font-bold">
              <DoorOpen className="text-primary" />
              {t(deposit ? 'customer.orders.scan.deposit' : 'customer.orders.scan.pickup')}
            </DialogTitle>
            <DialogDescription className="mt-3 text-sm leading-6 text-muted-foreground">
              {t('customer.orders.scan.simulationNote')}
            </DialogDescription>
            {deposit && (
              <div className="mt-4">
                <DepositDeadlineNotice />
              </div>
            )}
            {deposit && (
              <>
                <dl className="mt-5 grid grid-cols-2 gap-4 rounded-2xl border border-border bg-muted/35 p-4 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      {t('customer.order.locker')}
                    </dt>
                    <dd className="mt-1 break-words font-semibold">
                      {order.lockerName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      {t('customer.orders.compartmentSize')}
                    </dt>
                    <dd className="mt-1 font-medium">
                      {t(LOCKER_SLOT_SIZES[order.boxSize] || 'customer.orders.unknown')}
                    </dd>
                  </div>
                  <div className="col-span-2 flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">
                    <DoorOpen size={18} />
                    {t('customer.order.box', { number: order.boxNumber })}
                  </div>
                </dl>
                <div className="mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                  <HandHeart className="mt-0.5 size-6 shrink-0 text-amber-600 dark:text-amber-300" />
                  <div>
                    <p className="font-semibold">
                      {t('customer.orders.dropoff.instruction')}
                    </p>
                    <p className="mt-1 text-sm leading-6">
                      {t('customer.orders.dropoff.instructionNote', { number: order.boxNumber })}
                    </p>
                  </div>
                </div>
              </>
            )}
            <form
              onSubmit={submit}
              noValidate
              className="mt-5 space-y-5"
            >
              {session ? (
                <div className="space-y-3 rounded-xl bg-emerald-500/10 p-4">
                  <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                    {t('customer.orders.scan.sessionOpened')}
                  </p>
                  <p className="text-sm">
                    {session.returnLockerName}
                    {' '}
                    -
                    {' '}
                    {t('customer.order.box', { number: session.returnBoxNumber })}
                  </p>
                  <p className="text-xs leading-6 text-muted-foreground">
                    {t('customer.orders.scan.confirmNote')}
                  </p>
                </div>
              ) : (
                <>
                  <RadioGroup
                    value={mode}
                    onValueChange={(value) => {
                      setMode(value)
                      setError('')
                      setPin('')
                      setQr('')
                    }}
                    disabled={busy || unknown}
                    aria-label={t('customer.orders.scan.method')}
                    className="grid-cols-2 gap-3"
                  >
                    {['pin', 'qr'].map((value) => (
                      <label
                        key={value}
                        className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-3"
                      >
                        <RadioGroupItem
                          value={value}
                          aria-label={value === 'pin' ? 'PIN' : 'QR'}
                        />
                        {value === 'pin' ? 'PIN' : 'QR'}
                      </label>
                    ))}
                  </RadioGroup>
                  {mode === 'pin' ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        {t('customer.orders.scan.enterPin')}
                      </p>
                      <OtpInput
                        masked
                        autoComplete="off"
                        value={pin}
                        onChange={setPin}
                        disabled={busy || unknown}
                        label="customer.orders.scan.enterPin"
                        digitLabel="customer.orders.scan.pinDigit"
                      />
                    </div>
                  )
                    : (
                      <QrScanInput
                        onCode={acceptQr}
                        onClear={() => {
                          setQr('')
                          setError('')
                        }}
                        disabled={busy || unknown}
                        hasCode={!!qr}
                      />
                    )}
                </>
              )}
              <FormError>
                {expired ? 'customer.orders.scan.expired' : error}
              </FormError>
              <div className="flex items-stretch justify-end gap-2 border-t border-border pt-4">
                <Button
                  variant="secondary"
                  className="h-auto min-h-11 px-4"
                  disabled={busy}
                  onClick={onClose}
                >
                  {t('common.close')}
                </Button>
                {expired ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSession(null)
                      setExpired(false)
                      setError('')
                      setPin('')
                      setQr('')
                    }}
                  >
                    {t('customer.orders.scan.restart')}
                  </Button>
                )
                  : (
                    <Button
                      type="submit"
                      className={deposit ? 'h-auto min-h-11 min-w-0 flex-1 whitespace-normal bg-emerald-600 py-3 text-center text-white hover:bg-emerald-700 focus-visible:ring-emerald-500/40' : 'h-auto min-h-11 min-w-0 whitespace-normal'}
                      disabled={busy || unknown || (!session && !credentialsReady)}
                    >
                      <ShieldCheck size={16} />
                      {t(busy ? 'customer.orders.scan.submitting' : session ? 'customer.orders.scan.confirm' : deposit ? 'customer.orders.scan.depositConfirm' : 'customer.orders.scan.open')}
                    </Button>
                  )}
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
