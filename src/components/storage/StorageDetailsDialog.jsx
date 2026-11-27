import { useTranslation } from 'react-i18next'
import { Warehouse, MapPin, CalendarClock, Wallet, CircleCheck, CircleDollarSign } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { formatCurrency, formatDateTime } from '~/utils/format/formats'
import { storageApi } from '~/apis/storage/storageApi'
import StorageCycleActions from './StorageCycleActions'

export default function StorageDetailsDialog({ row, role, onClose, onAction }) {
  const { t } = useTranslation()
  const pending = storageApi.hasPending(row.orderId)
  const historical = (row.isCurrent === false || row.currentLocation && row.currentLocation !== 'AtShop') && (row.shopAddress || row.storageReference)
  const fields = [
    ['storage.currentLocationLabel', t(`storage.locations.${row.currentLocation || 'Unknown'}`, { defaultValue: t('storage.locations.Unknown') })],
    ['storage.merchantName', row.merchantName],
    ['admin.merchants.fields.address', row.shopAddress],
    ['storage.storageReference', row.storageReference],
    ['storage.receipt', row.receiptReference]
  ]
  const milestones = ['referenceIssuedAt', 'collectedAt', 'intakeAt', 'dispatchedAt', 'transferDeadline', 'returnDeadline'].filter(key => row[key])
  return (
    <Dialog
      open
      onOpenChange={open => !open && onClose()}
    >
      <DialogContent
        className="max-w-4xl"
        data-dialog-fixed
      >
        <DialogHeader tone="success">
          <DialogTitle className="flex items-center gap-3 pr-8 text-2xl font-bold">
            <Warehouse />
            {t('storageList.details')}
          </DialogTitle>
          <DialogDescription className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 font-bold text-primary">
              {row.orderCode}
            </span>
            <span className="rounded-full bg-teal-500/10 px-3 py-1.5 font-medium text-teal-700 dark:text-teal-300">
              {t(`storage.states.${row.state}`)}
            </span>
            {row.isLate && (
              <span className="font-semibold text-destructive">
                {t('storage.overdue')}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div
          data-dialog-body
          className="space-y-5"
        >
          <dl className="grid gap-3 sm:grid-cols-3">
            {[
              ['feeTotal', Wallet, 'border-l-primary', 'bg-primary/10 text-primary'],
              ['feePaid', CircleCheck, 'border-l-emerald-500', 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'],
              ['outstanding', CircleDollarSign, 'border-l-amber-500', 'bg-amber-500/10 text-amber-700 dark:text-amber-300']
            ].map(([key, Icon, border, color]) => (
              <div
                key={key}
                className={`flex items-center gap-3 rounded-xl border border-l-4 border-border bg-muted/15 p-4 ${border}`}
              >
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${color}`}>
                  <Icon size={21} />
                </span>
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">
                    {t(`storage.${key}`)}
                  </dt>
                  <dd className="mt-1 break-words text-lg font-bold tabular-nums">
                    {formatCurrency(row[key])}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
          <section className="overflow-hidden rounded-xl border border-border">
            <h3 className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3 font-semibold">
              <MapPin
                size={18}
                className="text-primary"
              />
              {t('storageList.info')}
            </h3>
            <dl className="grid gap-5 p-4 text-sm sm:grid-cols-2">
              {fields.filter(([, value]) => value).map(([label, value]) => (
                <div
                  key={label}
                  className={label === 'admin.merchants.fields.address' ? 'sm:col-span-2' : undefined}
                >
                  <dt className="text-muted-foreground">
                    {t(label)}
                  </dt>
                  <dd className="mt-1 break-words font-semibold leading-6">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            {historical && (
              <p className="px-4 pb-4 text-xs text-muted-foreground">
                {t('storage.historicalSnapshot')}
              </p>
            )}
            {row.referenceBasis === 'IssuedForVerifiedExistingCycle' && (
              <p className="px-4 pb-4 text-xs text-muted-foreground">
                {t('storage.verifiedExisting')}
              </p>
            )}
          </section>
          {milestones.length > 0 && (
            <section className="overflow-hidden rounded-xl border border-border">
              <h3 className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3 font-semibold">
                <CalendarClock
                  size={18}
                  className="text-primary"
                />
                {t('storageList.milestones')}
              </h3>
              <dl className="grid gap-4 p-4 text-sm sm:grid-cols-2">
                {milestones.map(key => (
                  <div
                    key={key}
                    className="border-l-2 border-primary/30 pl-3"
                  >
                    <dt className="text-muted-foreground">
                      {t(`storage.${key}`)}
                    </dt>
                    <dd className="mt-1 font-medium">
                      {formatDateTime(row[key])}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          {row.returnState && (
            <p className="rounded-xl bg-primary/5 p-3 text-sm font-medium text-primary">
              {t(`storage.returnStates.${row.returnState}`)}
            </p>
          )}
          {row.exceptionNote && (
            <p className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm leading-6 text-destructive">
              {row.exceptionNote}
            </p>
          )}
        </div>
        <footer
          data-dialog-footer
          className="flex flex-wrap items-center justify-end gap-3"
        >
          <StorageCycleActions
            row={row}
            role={role}
            disabled={pending}
            onAction={onAction}
            actionNames={['assign', 'cancel-assignment']}
            className="h-12 min-w-40 px-5 text-base"
          />
          <Button
            variant="secondary"
            className="h-12 min-w-28 rounded-xl px-6 text-base"
            onClick={onClose}
          >
            {t('common.close')}
          </Button>
          <div className="flex flex-wrap justify-end gap-3">
            <StorageCycleActions
              row={row}
              role={role}
              disabled={pending}
              onAction={onAction}
              className="h-12 min-w-40 px-5 text-base"
              actionNames={['exception']}
            />
            {pending && (
              <Button
                variant="outline"
                className="h-12 rounded-xl px-5 text-base"
                onClick={() => onAction('exception')}
              >
                {t('admin.sync.checkResult')}
              </Button>
            )}
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
