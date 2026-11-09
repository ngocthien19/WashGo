import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Layers, Trash2, RefreshCw, Info } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { SelectField } from '~/components/ui/select'
import ResourceThumbnail from '~/components/ResourceThumbnail/ResourceThumbnail'
import LockerDialogHeader from './LockerDialogHeader'
import { lockerStateClass } from '../lockerModel'

// No batch capability is exposed by the current BE. Never emulate it with per-locker mutations.
export default function LockerBulkDialog({ lockers, onClose }) {
  const { t } = useTranslation()
  const [action, setAction] = useState('status'), [status, setStatus] = useState('2')
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent
        className="max-w-2xl"
        closeLabel="common.close"
      >
        <LockerDialogHeader tone={action === 'delete' ? 'danger' : status === '1' ? 'success' : 'warning'}>
          <DialogTitle className="flex items-center gap-3 pr-8 text-2xl font-semibold">
            <Layers className="text-primary" />
            {t('admin.lockers.bulkActions')}
          </DialogTitle>
          <DialogDescription className="mt-3 text-base text-muted-foreground">
            {t('admin.lockers.selected', { count: lockers.length })}
          </DialogDescription>
        </LockerDialogHeader>
        <div className="mt-5 space-y-5">
          <div
            role="tablist"
            aria-label={t('admin.lockers.bulkActions')}
            className="flex gap-3 overflow-x-auto border-b border-border"
          >
            {[['status', RefreshCw], ['delete', Trash2]].map(([key, Icon]) => (
              <Button
                key={key}
                role="tab"
                aria-selected={action === key}
                variant="ghost"
                onClick={() => setAction(key)}
                className={`h-auto min-h-12 shrink-0 rounded-none border-x-0 border-t-0 border-b-2 bg-transparent px-3 py-3 text-base font-medium hover:bg-transparent dark:hover:bg-transparent ${action === key ? 'border-b-primary text-primary' : 'border-b-transparent text-muted-foreground'}`}
              >
                <Icon size={18} />
                {t(key === 'status' ? 'admin.lockers.bulkStatus' : 'admin.lockers.bulkDelete')}
              </Button>
            ))}
          </div>
          {action === 'status' ? (
            <label className="workspace-filters grid gap-3 text-sm font-medium">
              <span>
                {t('admin.lockers.newStatus')}
              </span>
              <SelectField
                label={t('admin.lockers.newStatus')}
                value={status}
                onValueChange={setStatus}
                options={[1, 2, 3].map(value => ({ value: String(value), label: t(`merchant.lockers.statuses.${value}`) }))}
              />
            </label>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              {t('admin.lockers.deleteHint')}
            </p>
          )}
          <ul
            className="max-h-72 space-y-3 overflow-y-auto pr-1"
            aria-label={t('admin.lockers.selectedList')}
          >
            {lockers.map(locker => (
              <li
                key={locker.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-3"
              >
                <ResourceThumbnail
                  urls={locker.imageUrls}
                  name={locker.name}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-primary">
                    {locker.code}
                  </p>
                  <p className="mt-1 break-words font-semibold">
                    {locker.name}
                  </p>
                  <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-medium ${lockerStateClass(locker.status)}`}>
                    {t(`merchant.lockers.statuses.${locker.status}`)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <p
            id="locker-bulk-unavailable"
            role="status"
            className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-800 dark:text-amber-200"
          >
            <Info
              size={19}
              className="mt-0.5 shrink-0"
            />
            {t('admin.lockers.bulkUnavailable')}
          </p>
          <footer className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
            <Button
              variant="secondary"
              onClick={onClose}
              className="h-11 px-5 text-base"
            >
              {t('common.close')}
            </Button>
            <Button
              variant={action === 'delete' ? 'destructive' : 'default'}
              disabled
              aria-describedby="locker-bulk-unavailable"
              className="h-11 px-6 text-base"
            >
              {t(action === 'delete' ? 'admin.lockers.bulkDelete' : 'admin.lockers.bulkStatus')}
            </Button>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  )
}
