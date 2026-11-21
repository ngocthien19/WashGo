import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LockKeyhole, LockKeyholeOpen, Trash2, UsersRound } from 'lucide-react'
import UserAvatar from '~/components/UserAvatar/UserAvatar'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { merchantShipperApi } from '~/apis/merchant/merchantShipperApi'
import { getApiError } from '~/utils/http/apiError'
import { notify } from '~/utils/notifications/notifications'
import { resolveMessage } from '~/i18n/messages'
import FormError from '~/components/ui/FormError'

export default function ShipperAccountAction({ action: initialAction, shippers, bulk, onClose }) {
  const { t } = useTranslation()
  const [action, setAction] = useState(initialAction)
  const tabsId = useId()
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [unknown, setUnknown] = useState(false)
  const lock = useRef(false)
  const Icon = action === 'delete' ? Trash2 : action === 'unlock' ? LockKeyholeOpen : LockKeyhole
  const candidates = bulk ? shippers.filter(item => action === 'delete' || (action === 'lock' ? item.accountActive === true : item.accountActive === false)) : shippers
  const submit = async (event) => {
    event.preventDefault()
    if (lock.current || unknown) {
      return
    }
    const note = reason.trim()
    if (note.length > 500 || action !== 'unlock' && !note) {
      setReasonError('merchant.shipperSync.reasonRequired'); return
    }
    if (!candidates.length || candidates.length > 50) {
      setError('merchant.shipperSync.reasonRequired'); return
    }
    lock.current = true; setPending(true); setError('')
    try {
      if (bulk) {
        const result = await merchantShipperApi.batch(action, candidates.map((item) => item.id), note)
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
        className={bulk ? 'max-w-3xl' : 'max-w-lg'}
        data-dialog-fixed
      >
        <DialogHeader tone={bulk ? 'warning' : action === 'delete' ? 'danger' : action === 'unlock' ? 'success' : 'warning'}>
          <DialogTitle className="flex items-center gap-3 pr-8 text-xl font-bold">
            {bulk ? <UsersRound /> : (
              <Icon
                className={action === 'delete' ? 'text-destructive' : action === 'unlock' ? 'text-emerald-600' : 'text-amber-600'}
                size={24}
              />
            )}
            {t(bulk ? 'merchant.shippers.bulkActions' : `merchant.shippers.${action}`)}
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
          noValidate
          onSubmit={submit}
          className="mt-5 space-y-4"
          data-dialog-layout
        >
          <div data-dialog-body>
            {bulk && (
              <>
                <div
                  role="tablist"
                  aria-label={t('merchant.shippers.bulkActions')}
                  className="mb-5 flex overflow-x-auto border-b border-border"
                >
                  {['lock', 'unlock', 'delete'].map((value, index, values) => {
                    const TabIcon = value === 'delete' ? Trash2 : value === 'unlock' ? LockKeyholeOpen : LockKeyhole
                    return (
                      <button
                        key={value}
                        id={`${tabsId}-${value}`}
                        type="button"
                        role="tab"
                        aria-selected={action === value}
                        aria-controls={`${tabsId}-panel`}
                        tabIndex={action === value ? 0 : -1}
                        disabled={pending || unknown}
                        className={`flex shrink-0 cursor-pointer items-center gap-2 border-b-2 px-4 py-3 text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary disabled:cursor-default disabled:opacity-50 ${action === value ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-primary'}`}
                        onClick={() => {
                          setAction(value); setReasonError(''); setError('')
                        }}
                        onKeyDown={event => {
                          const next = event.key === 'ArrowRight' ? (index + 1) % 3 : event.key === 'ArrowLeft' ? (index + 2) % 3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : null
                          if (next === null || pending || unknown) {
                            return
                          }
                          event.preventDefault()
                          setAction(values[next]); setReasonError(''); setError('')
                          event.currentTarget.parentElement.querySelectorAll('[role=tab]')[next]?.focus()
                        }}
                      >
                        <TabIcon size={18} />
                        {t(`merchant.shippers.${value}`)}
                      </button>
                    )
                  })}
                </div>
                <div
                  role="tabpanel"
                  id={`${tabsId}-panel`}
                  aria-labelledby={`${tabsId}-${action}`}
                  className="mb-5 space-y-3"
                >
                  <p className="text-sm text-muted-foreground">
                    {t('merchant.shipperSync.bulkScope', { count: candidates.length, total: shippers.length })}
                  </p>
                  {shippers.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl border border-border p-3"
                    >
                      <UserAvatar
                        avatar={item.avatarUrl}
                        name={item.fullName}
                        className="size-10 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="break-words text-base font-semibold">
                          {item.fullName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t(candidates.some(candidate => candidate.id === item.id) ? 'merchant.shipperSync.serverChecks' : 'merchant.shipperSync.notApplicable')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
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
                onChange={(event) => {
                  setReason(event.target.value); setReasonError('')
                }}
                aria-invalid={!!reasonError}
                aria-describedby={reasonError ? 'shipper-account-reason-error' : undefined}
                placeholder={t('merchant.shipperSync.reasonPlaceholder')}
                className="w-full rounded-xl border border-input bg-background p-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <FormError
                inline
                id="shipper-account-reason-error"
              >
                {reasonError}
              </FormError>
            </label>
            {error && (
              <p
                role="alert"
                className="text-sm text-destructive"
              >
                {resolveMessage(error)}
              </p>
            )}
          </div>
          <div
            className="flex flex-wrap justify-end gap-3 border-t border-border pt-5"
            data-dialog-footer
          >
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
              disabled={pending || unknown || !candidates.length}
            >
              {t(pending ? 'merchant.shippers.saving' : 'merchant.orders.confirm')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
