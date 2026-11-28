import { useTranslation } from 'react-i18next'
import { formatCurrency } from '~/utils/format/formats'

// The order DTO exposes service value and recorded fees, not a cash balance.
// Never derive points or cash paid from financial/commission allocations.
export default function OrderPaymentOverview({ order }) {
  const { t } = useTranslation()
  const money = value => Number.isFinite(value) && value >= 0 ? formatCurrency(value) : '—'
  return (
    <div className="mt-5 space-y-3">
      <dl className="space-y-3">
        {[
          ['serviceValue', order.finalAmount],
          ['recordedStorageFee', order.overdueFeeTotal],
          ['storagePaid', order.storageFeeTotal],
          ['cancellationFee', order.cancelFeeAmount],
          ['cancellationPaid', order.cancelFeePaidAmount]
        ].map(([key, value]) => (
          <div
            key={key}
            className="flex items-start justify-between gap-4 rounded-xl border border-border bg-muted/15 p-4 text-base"
          >
            <dt className="min-w-0 text-muted-foreground">
              {t(`orderPaymentOverview.${key}`)}
            </dt>
            <dd className="shrink-0 whitespace-nowrap font-semibold tabular-nums">
              {money(value)}
            </dd>
          </div>
        ))}
        <div className="flex items-start justify-between gap-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm">
          <dt>
            {t('orderPaymentOverview.points')}
          </dt>
          <dd className="text-right font-semibold">
            {t('orderPaymentOverview.unknown')}
          </dd>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start justify-between gap-4">
            <dt className="font-semibold">
              {t('combined.total')}
            </dt>
            <dd className="text-right font-semibold text-primary">
              {t('orderPaymentOverview.unknown')}
            </dd>
          </div>
          <div className="mt-3 flex justify-between gap-4 text-sm text-muted-foreground">
            <dt>
              {t('combined.paid')}
            </dt>
            <dd>— / —</dd>
          </div>
        </div>
      </dl>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {t('orderPaymentOverview.incomplete')}
      </p>
    </div>
  )
}
