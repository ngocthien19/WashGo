import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, Wrench, CircleCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { adminLockerApi } from '~/apis/admin/adminLockerApi'
import { getApiError } from '~/utils/http/apiError'
import { notify } from '~/utils/notifications/notifications'
import { lockerSnapshot, unknownLockerWrite } from '../lockerModel'
import LockerDialogHeader from './LockerDialogHeader'
import ResourceThumbnail from '~/components/ResourceThumbnail/ResourceThumbnail'

export default function LockerActionDialog({ locker, box, onClose, onSaved }) {
  const { t } = useTranslation()
  const [pending, setPending] = useState(false), [uncertain, setUncertain] = useState(false), [error, setError] = useState(''), [confirmed, setConfirmed] = useState(false)
  const locked = useRef(false)
  const removing = !box, restoring = box?.status === 4
  const title = removing ? 'delete' : restoring ? 'restoreBox' : 'maintainBox'
  const Icon = removing ? Trash2 : restoring ? CircleCheck : Wrench
  const submit = async () => {
    if (locked.current || uncertain || !confirmed) {
      return
    }
    locked.current = true; setPending(true); setError('')
    let writing = false
    try {
      const current = await adminLockerApi.detail(locker.id)
      if (lockerSnapshot(current) !== lockerSnapshot(locker)) {
        throw new Error('admin.lockers.changed')
      }
      if (removing && current.boxes.some(item => [2, 3].includes(item.status))) {
        throw new Error('admin.lockers.inUse')
      }
      if (box && !current.boxes.some(item => item.id === box.id && item.status === box.status && [1, 4].includes(item.status))) {
        throw new Error('admin.lockers.changed')
      }
      writing = true
      if (removing) {
        await adminLockerApi.remove(locker.id, current.version)
      } else {
        await adminLockerApi.boxStatus({ lockerId: locker.id, boxId: box.id, expectedBoxStatus: box.status, expectedVersion: current.version, newStatus: restoring ? 1 : 4 })
      }
      notify.success(removing ? 'admin.lockers.deleted' : 'admin.lockers.boxUpdated'); onSaved()
    } catch (failure) {
      const unknown = writing && unknownLockerWrite(failure)
      setUncertain(unknown); setError(unknown ? 'admin.lockers.uncertain' : getApiError(failure))
      notify.error(unknown ? 'admin.lockers.uncertain' : getApiError(failure))
    } finally {
      locked.current = false; setPending(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open && !locked.current) {
          onClose()
        }
      }}
    >
      <DialogContent
        className="max-w-xl"
        closeLabel="common.close"
      >
        <LockerDialogHeader tone={removing ? 'danger' : restoring ? 'success' : 'warning'}>
          <DialogTitle className="flex items-center gap-3 pr-8 text-2xl font-semibold">
            <Icon className={removing ? 'text-destructive' : restoring ? 'text-emerald-600' : 'text-amber-600'} />
            {t(`admin.lockers.${title}`)}
          </DialogTitle>
          <DialogDescription className="mt-3 text-base leading-6 text-muted-foreground">
            {t(removing ? 'admin.lockers.deleteHint' : 'admin.lockers.boxStatusHint')}
          </DialogDescription>
        </LockerDialogHeader>
        <div className="mt-5 space-y-5">
          <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/20 p-4">
            <ResourceThumbnail
              urls={locker.imageUrls}
              name={locker.name}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary">
                {locker.code}
              </p>
              <p className="mt-1 text-lg font-semibold">
                {locker.name}
              </p>
              {box && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('customer.order.box', { number: box.boxNumber })}
                  {' '}
                  ·
                  {' '}
                  {t(`merchant.lockers.boxStates.${box.status}`)}
                  {' '}
                  →
                  {' '}
                  {t(`merchant.lockers.boxStates.${restoring ? 1 : 4}`)}
                </p>
              )}
            </div>
          </div>
          <label className="flex cursor-pointer items-start gap-3 text-base leading-6">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={pending || uncertain}
              onChange={event => setConfirmed(event.target.checked)}
              className="mt-1 size-5 shrink-0 accent-primary"
            />
            <span>
              {t(removing ? 'admin.lockers.deleteConfirm' : 'admin.lockers.boxConfirm')}
            </span>
          </label>
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 p-4 text-sm leading-6 text-destructive"
            >
              {t(error)}
            </p>
          )}
          <footer className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
            <Button
              variant="secondary"
              disabled={pending}
              className="h-11 px-5 text-base"
              onClick={onClose}
            >
              {t('common.close')}
            </Button>
            <Button
              variant={removing ? 'destructive' : 'default'}
              disabled={!confirmed || pending || uncertain}
              onClick={submit}
              className={`h-11 px-6 text-base ${!removing ? restoring ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-amber-600 text-white hover:bg-amber-700' : ''}`}
            >
              <Icon size={18} />
              {t(pending ? 'admin.lockers.saving' : 'admin.lockers.confirm')}
            </Button>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  )
}
