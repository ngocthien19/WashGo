import { Store, ReceiptText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatCurrency, formatNumber } from '~/utils/format/formats'
export default function FinanceBreakdown({ value, settlement = false }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <header className="-mx-5 -mt-5 space-y-3 rounded-t-2xl border-b border-primary/15 bg-primary/5 p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ReceiptText className="size-5 text-primary" />
          {t('admin.finance.breakdown')}
        </h2>
        <div className="flex min-w-0 items-center gap-3 rounded-xl border border-primary/15 bg-card p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Store className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">
              {t('admin.complaints.merchant')}
            </p>
            <p className="break-words text-base font-semibold text-primary">
              {value.merchantName || '—'}
            </p>
          </div>
        </div>
      </header>
      {value.commissionComplete === false && (
        <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
          {t('admin.sync.coverage', { count: value.ordersWithoutCommissionSnapshot, amount: formatCurrency(value.uncoveredNetAmount) })}
        </p>
      )}
      {Number.isFinite(value.carryForwardAmount) && (
        <dl className="grid gap-3 sm:grid-cols-2">
          {['periodPayoutAmount', 'carryForwardAmount'].map(key => (
            <div
              key={key}
              className="rounded-xl bg-primary/5 p-3"
            >
              <dt className="text-sm text-muted-foreground">
                {t(key === 'carryForwardAmount' ? 'admin.sync.carryForward' : 'admin.sync.periodPayout')}
              </dt>
              <dd className="mt-2 font-semibold">
                {formatCurrency(value[key])}
              </dd>
            </div>
          ))}
        </dl>
      )}
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
              {value.commissionComplete === false && ['commissionAmount', 'payoutAmount'].includes(key) ? '—' : formatCurrency(value[key])}
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
