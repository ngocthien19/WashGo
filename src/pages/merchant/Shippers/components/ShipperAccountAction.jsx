import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LockKeyhole, LockKeyholeOpen, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { merchantShipperApi } from '~/apis/merchant/merchantShipperApi'
import { getApiError } from '~/utils/apiError'
import { notify } from '~/utils/notifications'
import { resolveMessage } from '~/i18n/messages'

export default function ShipperAccountAction({ action, shippers, bulk, onClose }) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [unknown, setUnknown] = useState(false)
  const lock = useRef(false)
  const Icon = action === 'delete' ? Trash2 : action === 'unlock' ? LockKeyholeOpen : LockKeyhole
  const submit = async (event) => {
    event.preventDefault()
    if (lock.current || unknown) {
      return
    }
    const note = reason.trim()
    if (note.length > 500 || action !== 'unlock' && !note || !shippers.length || shippers.length > 50) {
      setError('merchant.shipperSync.reasonRequired'); notify.error('merchant.shipperSync.reasonRequired'); return
    }
    lock.current = true; setPending(true); setError('')
    try {
      if (bulk) {
        const result = await merchantShipperApi.batch(action, shippers.map((item) => item.id), note)
        const failures = result.results.filter((item) => !item.succeeded).map((item) => {
          const name = shippers.find((row) => row.id === item.shipperId)?.fullName || item.shipperId
          return `${name}: ${t(`merchant.shipperSync.codes.${item.code}`, { defaultValue: resolveMessage(item.message) })}`
        })
        if (result.failed) {
          notify.error('merchant.shipperSync.batchToast', { succeeded: result.succeeded, failed: result.failed, details: failures.join(' · ') }, { duration: 8000 })
        } else {
          notify.success('merchant.shipperSync.batchResult', { succeeded: result.succeeded, failed: result.failed })
        }
        onClose()
      } else {
        await merchantShipperApi.account(action, shippers[0].id, note || null)
        notify.success(`merchant.shipperSync.success.${action}`)
        onClose()
      }
    } catch (failure) {
      const uncertain = failure.uncertain || !failure.response || failure.response.status >= 500
      setUnknown(Boolean(uncertain))
      const message = uncertain ? 'merchant.shipperSync.actionUnknown' : failure.response?.data?.meta?.code === 'HasActiveTasks' ? 'merchant.shippers.activeTasks' : getApiError(failure)
      setError(message)
      notify.error(message)
    } finally {
      lock.current = false; setPending(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !lock.current) {
          onClose()
        }
      }}
    >
      <DialogContent
        closeLabel="common.close"
        className="max-w-lg"
      >
        <DialogHeader tone={action === 'delete' ? 'danger' : action === 'unlock' ? 'success' : 'warning'}>
          <DialogTitle className="flex items-center gap-3 pr-8 text-xl font-bold">
            <Icon
              className={action === 'delete' ? 'text-destructive' : action === 'unlock' ? 'text-emerald-600' : 'text-amber-600'}
              size={24}
            />
            {t(`merchant.shippers.${action}`)}
          </DialogTitle>
          <DialogDescription className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {shippers.length === 1 ? shippers[0].fullName : t('merchant.shippers.selected', { count: shippers.length })}
            {' '}
            ·
            {' '}
            {t('merchant.shipperSync.accountHint')}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={submit}
          className="mt-5 space-y-4"
        >
          <label className="flex flex-col gap-3 text-base font-semibold">
            <span>
              {t('merchant.shipperSync.reason')}
              {action !== 'unlock' && <span className="ml-1 text-destructive">*</span>}
            </span>
            <textarea
              rows={3}
              maxLength={500}
              required={action !== 'unlock'}
              disabled={pending || unknown}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t('merchant.shipperSync.reasonPlaceholder')}
              className="w-full rounded-xl border border-input bg-background p-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </label>
          {error && (
            <p
              role="alert"
              className="text-sm text-destructive"
            >
              {resolveMessage(error)}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="secondary"
              className="h-11 px-6 text-base font-semibold"
              disabled={pending}
              onClick={onClose}
            >
              {t('common.close')}
            </Button>
            <Button
              type="submit"
              variant={action === 'delete' ? 'destructive' : 'default'}
              className="h-11 px-6 text-base font-semibold"
              disabled={pending || unknown}
            >
              {t(pending ? 'merchant.shippers.saving' : 'merchant.orders.confirm')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
