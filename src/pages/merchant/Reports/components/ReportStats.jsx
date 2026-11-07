import { useTranslation } from 'react-i18next'
import { Wallet, ReceiptText, CircleCheck, Clock } from 'lucide-react'
import StatCard from '~/components/merchant/StatCard'
import { formatCurrency } from '~/utils/formats'
import ReportChange from './ReportChange'

export default function ReportStats({ data }) {
  const { t, i18n } = useTranslation()
  const rate = data.kpis.onTimeRate
  const incomeAvailable = data.kpis.ordersWithoutCommissionSnapshot === 0
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { key: 'income', Icon: Wallet, edge: 'border-l-primary', color: 'bg-primary/10 text-primary', value: incomeAvailable ? formatCurrency(data.kpis.merchantPayout.current) : null },
        { key: 'created', Icon: ReceiptText, edge: 'border-l-violet-500', color: 'bg-violet-500/10 text-violet-600 dark:text-violet-300', metric: data.kpis.ordersCreated },
        { key: 'completed', Icon: CircleCheck, edge: 'border-l-emerald-500', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300', metric: data.kpis.ordersCompleted },
        { key: 'onTime', Icon: Clock, edge: 'border-l-amber-500', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-300', value: rate.rate === null ? null : `${new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 1 }).format(rate.rate)}%` }
      ].map(({ key, Icon, edge, color, value, metric }) => (
        <StatCard
          key={key}
          aria-label={t(`merchant.reportSync.${key}`)}
          icon={Icon}
          label={t(`merchant.reportSync.${key}`)}
          value={metric ? metric.current : value}
          className={edge}
          iconClassName={color}
        >
          <div className="mt-1">
            {metric && (
              <ReportChange
                value={metric.changePercent}
                isNew={metric.isNew}
              />
            )}
            {key === 'income' && !incomeAvailable && (
              <p className="text-xs text-muted-foreground">
                {t('merchant.reportSync.reconcile')}
              </p>
            )}
            {key === 'onTime' && (
              <>
                <ReportChange
                  value={rate.changePoints}
                  points
                />
              </>
            )}
          </div>
        </StatCard>
      ))}
    </div>
  )
}
