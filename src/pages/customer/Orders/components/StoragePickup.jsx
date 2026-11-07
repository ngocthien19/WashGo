import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Warehouse, PackageCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import FormError from '~/components/ui/FormError'
import { customerOrderApi } from '~/apis/customer/customerOrderApi'
import { ORDER_STATUSES, PAYMENT_STATUSES } from '~/utils/constants'
import { getApiError } from '~/utils/apiError'
import { formatCurrency } from '~/utils/formats'

export default function StoragePickup({ order, onUpdated }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [unknown, setUnknown] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  if (order.status !== ORDER_STATUSES.MOVED_TO_STORAGE) {
    return null
  }
  const close = () => {
    if (!busy) {
      setOpen(false); setUnknown(false); setError(''); onUpdated()
    }
  }
  return (
    <section className="grid gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Warehouse className="size-5 text-amber-600" />
        {t('customer.sync.storageTitle')}
      </h2>
      <p className="font-semibold">
        {order.storageLocation || t('customer.sync.storageUnknown')}
      </p>
      {order.storageReference && (
        <p className="text-sm">
          {order.storageReference}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        {t('customer.sync.storageFees', { due: formatCurrency(order.overdueFeeTotal), paid: formatCurrency(order.storageFeeTotal) })}
      </p>
      <p className="text-sm leading-6 text-muted-foreground">
        {t('customer.sync.storageHint')}
      </p>
      <Button
        className="justify-self-start"
        onClick={() => setOpen(true)}
        disabled={order.paymentStatus !== PAYMENT_STATUSES.PAID}
      >
        <PackageCheck size={18} />
        {t('customer.sync.storageConfirm')}
      </Button>
      {open && (
        <Dialog
          open
          onOpenChange={(next) => {
            if (!next) {
              close()
            }
          }}
        >
          <DialogContent
            className="max-w-lg"
            closeLabel="common.close"
          >
            <DialogTitle className="text-xl font-bold">
              {t('customer.sync.storageConfirm')}
            </DialogTitle>
            <DialogDescription className="mt-3 text-base leading-6">
              {t('customer.sync.storageConfirmHint')}
            </DialogDescription>
            <form
              className="mt-5 grid gap-4"
              onSubmit={async (event) => {
                event.preventDefault()
                if (lock.current || unknown) {
                  return
                }
                lock.current = true; setBusy(true); setError('')
                let posting = false
                try {
                  const fresh = await customerOrderApi.get(order.id)
                  if (fresh.status !== ORDER_STATUSES.MOVED_TO_STORAGE || fresh.paymentStatus !== PAYMENT_STATUSES.PAID) {
                    throw new Error('customer.sync.storageChanged')
                  }
                  posting = true
                  await customerOrderApi.pickupStorage(order.id, note.trim() || null)
                  setOpen(false); onUpdated()
                } catch (failure) {
                  const uncertain = posting && (!failure.response || failure.response.status >= 500)
                  setUnknown(uncertain); setError(uncertain ? 'customer.sync.uncertainMutation' : getApiError(failure))
                } finally {
                  lock.current = false; setBusy(false)
                }
              }}
            >
              <label className="grid gap-2 font-semibold">
                {t('customer.sync.optionalNote')}
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={500}
                  disabled={busy || unknown}
                  placeholder={t('customer.sync.optionalNote')}
                  className="min-h-24 rounded-xl border border-input bg-background p-3 font-normal"
                />
              </label>
              <FormError>
                {error}
              </FormError>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={close}
                >
                  {t('common.close')}
                </Button>
                <Button
                  type="submit"
                  disabled={busy || unknown}
                >
                  {t('customer.sync.storageConfirm')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </section>
  )
}
