import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Wallet, TrendingUp } from 'lucide-react'
import useCatalogResource from '~/hooks/useCatalogResource'
import { merchantInsightsApi } from '~/apis/merchant/merchantInsightsApi'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import AnimatedNumber from '~/components/motion/AnimatedNumber'
import MetricChart from '~/components/workspace/MetricChart'

const revenueCardStyles = {
  grossLaundryRevenue: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200',
  refunds: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200',
  netRevenue: 'border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200',
  commission: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
  merchantPayout: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200'
}

export default function MonthlyRevenue({ compact = false, revision, range }) {
  const { t } = useTranslation()
  const from = range?.from, to = range?.to
  const load = useCallback((signal) => merchantInsightsApi.monthlyRevenue(signal, from && to ? { from, to } : undefined), [from, to])
  const resource = useCatalogResource(load, revision)
  const report = resource.data
  const missing = report?.kpis.ordersWithoutCommissionSnapshot > 0
  const keys = compact ? ['grossLaundryRevenue'] : ['grossLaundryRevenue', 'refunds', 'netRevenue', 'commission', 'merchantPayout']
  const chartTitle = from && from === to ? 'merchant.sync.hourlyRevenueChart' : 'merchant.sync.revenueChart'
  return (
    <section className="min-w-0 rounded-2xl border border-border border-l-4 border-l-emerald-500 bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-3 text-base font-bold">
        <Wallet
          className="shrink-0 text-emerald-600 dark:text-emerald-300"
          size={22}
        />
        {t(range ? 'merchant.sync.periodRevenue' : 'merchant.sync.monthlyRevenue')}
      </h2>
      {resource.loading || resource.error || !report ? (
        <ResourceFeedback
          {...resource}
          loadingText="merchant.loading"
        />
      ) : (
        <>
          <dl className={`mt-4 grid gap-3 ${compact ? '' : 'sm:grid-cols-2 xl:grid-cols-5'}`}>
            {keys.map((key) => (
              <div
                key={key}
                className={`min-w-0 rounded-xl border px-4 py-3 ${revenueCardStyles[key]}`}
              >
                <dt className={compact ? 'sr-only' : 'text-sm font-medium text-foreground'}>
                  {t(`merchant.sync.finance.${key}`)}
                </dt>
                <dd className="mt-2 break-words text-xl font-bold tabular-nums">
                  {missing && ['commission', 'merchantPayout'].includes(key) ? '—' : (
                    <>
                      <AnimatedNumber value={report.kpis[key].current} />
                      {' '}
                      <span className="text-sm">₫</span>
                    </>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          {missing && (
            <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">
              {t('merchant.sync.missingCommission', { count: report.kpis.ordersWithoutCommissionSnapshot })}
            </p>
          )}
          {!compact && (
            <div className="mt-5 border-t border-border pt-4">
              <h3 className="flex items-center gap-2 font-semibold">
                <TrendingUp size={19} />
                {t(chartTitle)}
              </h3>
              <div className="mt-4">
                <MetricChart
                  title={chartTitle}
                  points={report.series}
                  series={[{ key: 'netRevenue', label: 'merchant.sync.finance.netRevenue', color: '#10b981' }]}
                  money
                  hourly={report.granularity === 'hour' || from === to}
                  viewData="merchant.sync.viewRevenueData"
                />
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
