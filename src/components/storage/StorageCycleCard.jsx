import { useTranslation } from 'react-i18next'
import { MapPin, Store, Hash, CalendarClock, ReceiptText, PackageCheck, Clock3, Wallet, CircleCheck, CircleDollarSign } from 'lucide-react'
import StorageCycleActions from './StorageCycleActions'
import { formatCurrency, formatDateTime } from '~/utils/format/formats'

export default function StorageCycleCard({ row, role, taskId, onAction, disabled, current = true }) {
  const { t } = useTranslation()
  const admin = role === 'Admin'
  return (
    <article className={admin ? 'space-y-5 rounded-2xl border border-teal-500/20 bg-card p-5 shadow-sm sm:p-6' : 'space-y-4 rounded-xl border border-border p-4'}>
      <div className="flex flex-wrap justify-between gap-3">
        <strong className={admin ? 'rounded-full bg-teal-500/10 px-3 py-1.5 text-sm font-semibold text-teal-700 dark:text-teal-300' : undefined}>
          {t(`storage.states.${row.state}`)}
        </strong>
        {row.isLate && (
          <span className="text-destructive">
            {t('storage.overdue')}
          </span>
        )}
      </div>
      {admin && (
        <>
          {(row.isCurrent === false || row.currentLocation && row.currentLocation !== 'AtShop') && (row.shopAddress || row.storageReference) && (
            <p className="text-sm text-muted-foreground">
              {t('storage.historicalSnapshot')}
            </p>
          )}
          <dl className="grid gap-x-8 gap-y-5 rounded-xl bg-muted/25 p-4 text-sm sm:grid-cols-2">
            {[
              ['storage.currentLocationLabel', row.currentLocation && t(`storage.locations.${row.currentLocation}`, { defaultValue: t('storage.locations.Unknown') }), MapPin],
              ['storage.merchantName', row.merchantName, Store],
              ['admin.merchants.fields.address', row.shopAddress, MapPin],
              ['storage.storageReference', row.storageReference, Hash],
              ['storage.referenceIssuedAt', row.referenceIssuedAt && formatDateTime(row.referenceIssuedAt), CalendarClock],
              ['storage.intakeAt', row.intakeAt && formatDateTime(row.intakeAt), PackageCheck],
              ['storage.receipt', row.receiptReference, ReceiptText]
            ].filter(([, value]) => value).map(([label, value, Icon]) => (
              <div
                key={label}
                className="min-w-0 space-y-1.5"
              >
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <Icon
                    aria-hidden="true"
                    className="size-4 shrink-0 text-teal-600 dark:text-teal-400"
                  />
                  {t(label)}
                </dt>
                <dd className="break-words pl-6 font-medium leading-relaxed">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          {row.exceptionNote && (
            <p className="rounded-xl bg-destructive/5 p-3 text-sm text-destructive">
              {row.exceptionNote}
            </p>
          )}
          {row.referenceBasis === 'IssuedForVerifiedExistingCycle' && (
            <p className="text-sm text-muted-foreground">
              {t('storage.verifiedExisting')}
            </p>
          )}
        </>
      )}
      {role !== 'Customer' && !admin && (
        <div className={admin ? 'grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 [&>p]:min-w-0 [&>p]:break-words' : 'space-y-4'}>
          {row.currentLocation && (
            <p className={admin ? 'font-medium sm:col-span-2' : 'font-semibold'}>
              {t('storage.currentLocationLabel')}
              :
              {' '}
              {t(`storage.locations.${row.currentLocation}`, { defaultValue: t('storage.locations.Unknown') })}
            </p>
          )}
          {(row.isCurrent === false || row.currentLocation && row.currentLocation !== 'AtShop') && (row.shopAddress || row.storageReference) && (
            <p className="text-sm text-muted-foreground sm:col-span-2">
              {t('storage.historicalSnapshot')}
            </p>
          )}
          {row.merchantName && (
            <p className="font-medium text-foreground">
              {t('storage.merchantName')}
              :
              {' '}
              {row.merchantName}
            </p>
          )}
          {row.shopAddress && (
            <p>
              {row.shopAddress}
            </p>
          )}
          {row.receiptReference && (
            <p>
              {t('storage.receipt')}
              :
              {' '}
              {row.receiptReference}
            </p>
          )}
          {row.exceptionNote && (
            <p className="text-destructive">
              {row.exceptionNote}
            </p>
          )}
          {row.storageReference && (
            <p className="break-words font-semibold">
              {t('storage.storageReference')}
              :
              {' '}
              {row.storageReference}
            </p>
          )}
          {row.referenceIssuedAt && (
            <p className="text-sm text-muted-foreground">
              {t('storage.referenceIssuedAt')}
              :
              {' '}
              {formatDateTime(row.referenceIssuedAt)}
            </p>
          )}
          {row.referenceBasis === 'IssuedForVerifiedExistingCycle' && (
            <p className="text-sm text-muted-foreground">
              {t('storage.verifiedExisting')}
            </p>
          )}
        </div>
      )}
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {['collectedAt', 'intakeAt', 'dispatchedAt', 'transferDeadline', 'returnDeadline'].filter(key => row[key] && !(admin && key === 'intakeAt')).map(key => (
          <div key={key}>
            <dt className="flex items-center gap-2 text-muted-foreground">
              {admin && (
                <Clock3
                  aria-hidden="true"
                  className="size-4 shrink-0 text-teal-600 dark:text-teal-400"
                />
              )}
              {t(`storage.${key}`)}
            </dt>
            <dd className={admin ? 'mt-1 font-medium' : undefined}>
              {formatDateTime(row[key])}
            </dd>
          </div>
        ))}
      </dl>
      {row.returnState && (
        <p>
          {t(`storage.returnStates.${row.returnState}`)}
        </p>
      )}
      {role !== 'Customer' && (
        <dl className={admin ? 'grid gap-4 sm:grid-cols-3' : 'flex flex-wrap gap-5'}>
          {['feeTotal', 'feePaid', 'outstanding'].map(key => (
            <div
              key={key}
              className={admin ? `min-w-0 rounded-xl border p-4 ${key === 'feePaid' ? 'border-emerald-500/20 bg-emerald-500/5' : key === 'outstanding' ? 'border-amber-500/20 bg-amber-500/5' : 'border-teal-500/20 bg-teal-500/5'}` : undefined}
            >
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                {admin && (() => {
                  const Icon = key === 'feePaid' ? CircleCheck : key === 'outstanding' ? CircleDollarSign : Wallet
                  return (
                    <Icon
                      aria-hidden="true"
                      className="size-4 shrink-0"
                    />
                  )
                })()}
                {t(`storage.${key}`)}
              </dt>
              <dd className={admin ? 'mt-1 text-lg font-semibold tabular-nums' : 'font-semibold'}>
                {formatCurrency(row[key])}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {!admin && role !== 'Customer' && (
        <dl className="grid gap-2 text-sm text-muted-foreground">
          {['frozenLockerFee', 'frozenWarehouseFee'].filter(key => Number.isFinite(row[key])).map(key => (
            <div
              key={key}
              className="flex flex-wrap justify-between gap-3"
            >
              <dt>
                {t(`storage.${key}`)}
              </dt>
              <dd className="font-semibold">
                {formatCurrency(row[key])}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {role !== 'Customer' && !admin && (
        <p className="text-xs text-muted-foreground">
          {t('storage.feeBasis')}
        </p>
      )}
      {role === 'Shipper' && row.departBlockedReason && row.state === 3 && (
        <p className="text-amber-600">
          {t(`storage.blocked.${row.departBlockedReason}`, { defaultValue: t('storage.departBlocked') })}
        </p>
      )}
      <div className={admin ? 'flex flex-wrap gap-3 border-t border-border pt-4' : 'flex flex-wrap gap-3'}>
        <StorageCycleActions
          row={row}
          role={role}
          taskId={taskId}
          onAction={onAction}
          disabled={disabled}
          current={current}
        />
      </div>
    </article>
  )
}
