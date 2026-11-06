import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeCanvas } from 'qrcode.react'
import { Copy, Download, QrCode } from 'lucide-react'
import { Button } from '~/components/ui/button'
import OrderPin from '~/components/customer/orders/OrderPin'
import { ORDER_STATUSES, PAYMENT_STATUSES } from '~/utils/constants'
import { notify } from '~/utils/notifications'

export default function LockerAccessCard({ order }) {
  const { t } = useTranslation()
  const [showQr, setShowQr] = useState(false)
  const canvas = useRef(null)
  const deposit = order.status === ORDER_STATUSES.PENDING
  const pickup = order.status === ORDER_STATUSES.READY_TO_RETURN && order.paymentStatus === PAYMENT_STATUSES.PAID
  if (!deposit && !pickup) {
    return null
  }
  const pin = deposit ? order.depositPinCode : order.pickupPinCode
  const qr = deposit ? order.qrCodeString : order.pickupQrCodeString
  if (!pin && !qr) {
    return null
  }
  const copyPin = async () => {
    try {
      await navigator.clipboard.writeText(pin)
      notify.success('customer.orders.access.copied')
    } catch {
      notify.error('customer.orders.access.copyError')
    }
  }
  const download = () => {
    if (!canvas.current) {
      return
    }
    canvas.current.toBlob((blob) => {
      if (!blob) {
        return
      }
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `WashGo-${order.orderCode}-${deposit ? 'deposit' : 'pickup'}.png`
      anchor.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }
  return (
    <section className="rounded-2xl border border-dashed border-primary/45 bg-primary/3 p-5 sm:p-6">
      <div className="grid gap-5 sm:grid-cols-[11rem_minmax(0,1fr)]">
        <div className="grid min-h-44 place-items-center rounded-2xl border border-border bg-white p-3 shadow-sm">
          {showQr && qr ? (
            <QRCodeCanvas
              ref={canvas}
              value={qr}
              size={156}
              marginSize={4}
              level="M"
              role="img"
              aria-label={t(deposit ? 'customer.orders.access.depositQr' : 'customer.orders.access.pickupQr')}
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
            {t(deposit ? 'customer.orders.access.depositTitle' : 'customer.orders.access.pickupTitle')}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {t('customer.orders.access.note')}
          </p>
          <div className="flex flex-wrap gap-2">
            {qr && (
              <Button
                variant="outline-primary"
                onClick={() => setShowQr(!showQr)}
              >
                <QrCode size={16} />
                {t(showQr ? 'customer.orders.access.hideQr' : 'customer.orders.access.showQr')}
              </Button>
            )}
            {showQr && qr && (
              <Button
                variant="secondary"
                className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-400/15 dark:text-emerald-200 dark:hover:bg-emerald-400/25"
                onClick={download}
              >
                <Download size={16} />
                {t('customer.orders.access.download')}
              </Button>
            )}
            {pin && (
              <Button
                variant="outline-violet"
                onClick={copyPin}
              >
                <Copy size={16} />
                {t('customer.orders.access.copy')}
              </Button>
            )}
          </div>
        </div>
      </div>
      {pin && (
        <div className="mt-5">
          <OrderPin
            pin={pin}
            label={deposit ? 'customer.order.depositPin' : 'customer.orders.pickupPin'}
          />
        </div>
      )}
    </section>
  )
}
