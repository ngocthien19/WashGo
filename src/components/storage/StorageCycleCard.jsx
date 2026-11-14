import { useTranslation } from 'react-i18next'
import { Button } from '~/components/ui/button'
import { formatCurrency, formatDateTime } from '~/utils/format/formats'

export default function StorageCycleCard({ row, role, taskId, onAction, disabled, current = true }) {
  const { t } = useTranslation()
  const coordinator = ['Admin', 'Merchant'].includes(role)
  const actions = coordinator
    ? [['assign', row.canAssign], ['cancel-assignment', row.canCancelAssignment], ['exception', current && ![5, 6].includes(row.state)]]
    : role === 'Shipper' && row.taskId === taskId
      ? [['collect', row.canCollect], ['handover', row.canHandover], ['depart', row.canDepart], ['place', row.canPlace]] : []
  return (
    <article className="space-y-4 rounded-xl border border-border p-4">
      <div className="flex flex-wrap justify-between gap-3">
        <strong>
          {t(`storage.states.${row.state}`)}
        </strong>
        {row.isLate && (
          <span className="text-destructive">
            {t('storage.overdue')}
          </span>
        )}
      </div>
      {role !== 'Customer' && (
        <>
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
        </>
      )}
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {['collectedAt', 'intakeAt', 'dispatchedAt', 'transferDeadline', 'returnDeadline'].filter(key => row[key]).map(key => (
          <div key={key}>
            <dt className="text-muted-foreground">
              {t(`storage.${key}`)}
            </dt>
            <dd>
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
      <dl className="flex flex-wrap gap-5">
        {['feeTotal', 'feePaid', 'outstanding'].map(key => (
          <div key={key}>
            <dt className="text-sm text-muted-foreground">
              {t(`storage.${key}`)}
            </dt>
            <dd className="font-semibold">
              {formatCurrency(row[key])}
            </dd>
          </div>
        ))}
      </dl>
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
      <p className="text-xs text-muted-foreground">
        {t('storage.feeBasis')}
      </p>
      {role === 'Shipper' && row.departBlockedReason && row.state === 3 && (
        <p className="text-amber-600">
          {t(`storage.blocked.${row.departBlockedReason}`, { defaultValue: t('storage.departBlocked') })}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {actions.filter(([, enabled]) => enabled).map(([name]) => (
          <Button
            key={name}
            disabled={disabled}
            className="h-11"
            variant={name === 'assign' ? 'default' : 'outline'}
            onClick={() => onAction(name)}
          >
            {t(`storage.actions.${name}`)}
          </Button>
        ))}
      </div>
    </article>
  )
}
