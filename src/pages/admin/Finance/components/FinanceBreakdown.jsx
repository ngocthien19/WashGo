import { useTranslation } from 'react-i18next'
import { formatCurrency, formatNumber } from '~/utils/formats'
export default function FinanceBreakdown({ value, settlement = false }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <h2 className="border-b border-border pb-3 text-lg font-semibold">
        {t('admin.finance.breakdown')}
      </h2>
      <dl className="space-y-3">
        {['grossRevenue', 'refundedAmount', 'netRevenue', 'commissionAmount', 'payoutAmount'].map(key => (
          <div
            key={key}
            className={`flex flex-wrap items-center justify-between gap-2 ${key === 'payoutAmount' ? 'border-t border-border pt-4 text-lg font-semibold text-primary' : key === 'netRevenue' ? 'border-t border-border pt-3 font-semibold' : 'text-sm'}`}
          >
            <dt>
              {t(`admin.finance.fields.${key}`)}
            </dt>
            <dd className="font-semibold">
              {formatCurrency(value[key])}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted-foreground">
        {t('admin.finance.orderCount', { count: settlement ? value.orderCount : value.paidOrderCount })}
      </p>
      <p className="text-sm text-muted-foreground">
        {t(settlement ? 'admin.finance.snapshotRate' : 'admin.finance.currentRate', { value: formatNumber(value.commissionRate) })}
      </p>
    </div>
  )
}
