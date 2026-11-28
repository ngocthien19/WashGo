import { useTranslation } from 'react-i18next'
import { formatCurrency, formatNumber } from '~/utils/format/formats'
import PointsRedemptionRow from './PointsRedemptionRow'
import { checkoutAmounts } from './combinedPaymentModel'

export default function PaymentSummary({ summary, checkout = false, amounts }) {
  const { t } = useTranslation()
  const displayedAmounts = amounts || (checkout ? checkoutAmounts(summary) : null)
  const { pointsToRedeem: points, cashAmount } = displayedAmounts || {}
  const paid = summary.obligations.reduce((total, row) => total + row.paid, 0)
  const due = Math.max(0, summary.obligations.reduce((total, row) => total + row.due, 0) - (points || 0))
  return (
    <div className="min-w-0 space-y-4">
      <dl className="space-y-3">
        {summary.obligations.map(row => (
          <div
            key={row.purpose}
            className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2 rounded-xl border border-border/70 bg-muted/20 p-4"
          >
            <dt className="font-medium">
              {t(`paymentResult.purpose.${row.purpose}`)}
            </dt>
            <dd className="font-semibold tabular-nums">
              {formatCurrency(row.outstanding)}
            </dd>
          </div>
        ))}
        {displayedAmounts && <PointsRedemptionRow points={points} />}
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2 rounded-xl border border-primary/15 bg-primary/5 p-3 font-semibold">
          <dt className="min-w-0 text-sm">
            {t('combined.total')}
          </dt>
          <dd className="shrink-0 text-xl tabular-nums text-primary">
            {formatCurrency(displayedAmounts ? cashAmount : summary.outstanding)}
          </dd>
          <dd className="w-full text-sm font-normal text-muted-foreground">
            {t('combined.paid')}
            {': '}
            <span className="font-semibold tabular-nums text-foreground">
              {formatCurrency(paid)}
              {' / '}
              {formatCurrency(due)}
            </span>
          </dd>
        </div>
      </dl>
      {summary.cancellationBasis != null && (
        <p className="text-sm text-muted-foreground">
          {t('combined.cancellationBasis')}
          :
          {' '}
          {formatCurrency(summary.cancellationBasis)}
          {summary.cancellationRatePercent != null ? ` × ${formatNumber(summary.cancellationRatePercent)}%` : ''}
        </p>
      )}
      {summary.cancellationOffset > 0 && (
        <p className="text-sm">
          {t('combined.offset')}
          :
          {' '}
          {formatCurrency(summary.cancellationOffset)}
        </p>
      )}
      {summary.refunds && (
        <div className="space-y-1 text-sm text-muted-foreground">
          {(summary.refunds.pendingAmount > 0 || summary.refunds.pendingPoints > 0) && (
            <p>
              {t('combined.refundPending')}
              :
              {' '}
              {formatCurrency(summary.refunds.pendingAmount)}
              {' '}
              ·
              {' '}
              {formatNumber(summary.refunds.pendingPoints)}
              {' '}
              {t('combined.points')}
            </p>
          )}
          {(summary.refunds.refundedAmount > 0 || summary.refunds.refundedPoints > 0) && (
            <p>
              {t('combined.refunded')}
              :
              {' '}
              {formatCurrency(summary.refunds.refundedAmount)}
              {' '}
              ·
              {' '}
              {formatNumber(summary.refunds.refundedPoints)}
              {' '}
              {t('combined.points')}
            </p>
          )}
          {summary.cancellationRefundRemaining > 0 && (
            <p>
              {t('combined.refundRemaining')}
              :
              {' '}
              {formatCurrency(summary.cancellationRefundRemaining)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
