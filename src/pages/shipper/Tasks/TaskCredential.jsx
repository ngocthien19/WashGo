import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import { QrCode, Eye, EyeOff, KeyRound, Copy } from 'lucide-react'
import { Button } from '~/components/ui/button'
import FormError from '~/components/ui/FormError'
import { shipperTaskApi } from '~/apis/shipper/shipperTaskApi'
import { getApiError } from '~/utils/apiError'
import { canCompleteTask, taskSnapshot, matchesTaskQr } from './taskModel'
import { notify } from '~/utils/notifications'

export default function TaskCredential({ order, shipperId }) {
  const { t } = useTranslation()
  const [credential, setCredential] = useState(null)
  const [showQr, setShowQr] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const load = async () => {
    if (lock.current) {
      return
    }
    lock.current = true; setPending(true); setError('')
    try {
      const row = await shipperTaskApi.credentials(order.id)
      if (!canCompleteTask(row, shipperId) || taskSnapshot(row) !== taskSnapshot(order)) {
        setCredential(null); setShowPin(false); setShowQr(false)
        setError('shipper.tasks.changed'); return
      }
      if (!/^\d{6}$/.test(row.shipperTaskPinCode || '') || !matchesTaskQr(row.shipperTaskQrString || '', order.orderCode, order.nextAction)) {
        setCredential(null); setShowPin(false); setShowQr(false)
        setError('shipper.tasks.codeUnavailable'); return
      }
      const value = { pin: row.shipperTaskPinCode, qr: row.shipperTaskQrString }
      setCredential(value)
      return value
    } catch (failure) {
      setCredential(null); setShowPin(false); setShowQr(false)
      setError(getApiError(failure))
    } finally {
      lock.current = false; setPending(false)
    }
  }
  const toggleQr = async () => {
    if (showQr) {
      setShowQr(false); return
    }
    if (await load()) {
      setShowQr(true)
    }
  }
  const togglePin = async () => {
    if (showPin) {
      setShowPin(false); return
    }
    if (await load()) {
      setShowPin(true)
    }
  }
  const copyPin = async () => {
    const value = await load()
    if (!value) {
      return
    }
    try {
      await navigator.clipboard.writeText(value.pin)
      notify.success('customer.orders.access.copied')
    } catch {
      notify.error('customer.orders.access.copyError')
    }
  }
  return (
    <section className="rounded-2xl border border-dashed border-primary/45 bg-primary/3 p-5">
      <div className="grid gap-5 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <div className="grid min-h-40 place-items-center rounded-2xl border border-border bg-white p-3 shadow-sm">
          {showQr && credential ? (
            <QRCodeSVG
              value={credential.qr}
              size={140}
              marginSize={4}
              title={t('shipper.tasks.qr')}
              role="img"
              aria-label={t('shipper.tasks.qr')}
            />
          ) : (
            <QrCode
              className="size-20 text-slate-400"
              strokeWidth={1.2}
            />
          )}
        </div>
        <div className="min-w-0 space-y-4">
          <h2 className="text-lg font-bold">
            {t('shipper.tasks.taskCode')}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {t('shipper.tasks.codeHelp')}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline-primary"
              className="h-10 px-3"
              disabled={pending}
              onClick={toggleQr}
              aria-expanded={showQr}
            >
              <QrCode size={17} />
              {t(showQr ? 'customer.orders.access.hideQr' : 'customer.orders.access.showQr')}
            </Button>
            <Button
              variant="outline-violet"
              className="h-10 px-3"
              disabled={pending}
              onClick={copyPin}
            >
              <Copy size={17} />
              {t('customer.orders.access.copy')}
            </Button>
          </div>
        </div>
      </div>
      <FormError>
        {error}
      </FormError>
      <div className="mt-5 rounded-2xl border border-border bg-muted/15 p-4">
        <p className="flex items-center gap-2 text-sm font-medium">
          <KeyRound className="size-4 text-primary" />
          {t('shipper.tasks.pin')}
        </p>
        <div className="mt-3 flex items-center justify-between gap-4">
          <span className="break-all font-mono text-2xl tracking-[0.25em]">
            {showPin && credential ? credential.pin : '\u2022\u2022\u2022\u2022\u2022\u2022'}
          </span>
          <Button
            size="icon-lg"
            variant="secondary"
            disabled={pending}
            onClick={togglePin}
            aria-label={t(showPin ? 'shipper.tasks.hideCode' : 'shipper.tasks.showCode')}
            aria-pressed={showPin}
          >
            {showPin ? <EyeOff /> : <Eye />}
          </Button>
        </div>
      </div>
    </section>
  )
}
