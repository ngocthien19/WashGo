import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Wallet, TrendingUp } from 'lucide-react'
import useCatalogResource from '~/hooks/useCatalogResource'
import { merchantInsightsApi } from '~/apis/merchant/merchantInsightsApi'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import AnimatedNumber from '~/components/motion/AnimatedNumber'
import { formatCurrency } from '~/utils/formats'

export default function MonthlyRevenue({ compact = false, revision, range }) {
  const { t } = useTranslation()
  const from = range?.from, to = range?.to
  const load = useCallback((signal) => merchantInsightsApi.monthlyRevenue(signal, from && to ? { from, to } : undefined), [from, to])
  const resource = useCatalogResource(load, revision)
  const report = resource.data
  const missing = report?.kpis.ordersWithoutCommissionSnapshot > 0
  const keys = compact ? ['grossLaundryRevenue'] : ['grossLaundryRevenue', 'refunds', 'netRevenue', 'commission', 'merchantPayout']
  const series = report?.series.filter((item) => item.computed) || []
  const max = Math.max(1, ...series.map((item) => Math.abs(item.netRevenue)))
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
                className="min-w-0 rounded-xl bg-muted/35 px-4 py-3"
              >
                <dt className={compact ? 'sr-only' : 'text-sm text-muted-foreground'}>
                  {t(`merchant.sync.finance.${key}`)}
                </dt>
                <dd className="mt-1 break-words text-lg font-bold tabular-nums">
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
              <div
                role="img"
                aria-label={t(chartTitle)}
                className="relative mt-4 h-56 rounded-xl border border-border/60 bg-background/50 px-3 pt-4"
              >
                <div className="relative flex h-40 items-stretch gap-1">
                  <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-border" />
                  {series.map((item, index) => (
                    <div
                      key={item.index ?? index}
                      className="relative min-w-0 flex-1"
                      title={`${item.label}: ${formatCurrency(item.netRevenue)}`}
                    >
                      <span
                        className={`absolute inset-x-[15%] rounded-sm ${item.netRevenue < 0 ? 'top-1/2 bg-rose-400' : 'bottom-1/2 bg-emerald-500'}`}
                        style={{ height: `${Math.abs(item.netRevenue) / max * 45}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-between gap-3 overflow-hidden text-xs tabular-nums text-muted-foreground">
                  {series.filter((_item, index) => index % Math.max(1, Math.ceil(series.length / 4)) === 0).map((item, index) => (
                    <span
                      key={item.index ?? index}
                      className="hidden whitespace-nowrap first:inline last:inline sm:inline"
                    >
                      {from === to && item.label.includes(' ') ? item.label.split(' ').at(-1) : item.label}
                    </span>
                  ))}
                </div>
              </div>
              <details
                className="mt-3"
              >
                <summary className="flex cursor-pointer items-center gap-2 font-semibold">
                  {t('merchant.sync.viewRevenueData')}
                </summary>
                {series.length ? (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-muted-foreground">
                        <tr>
                          <th className="pb-3 pr-4">
                            {t('merchant.sync.date')}
                          </th>
                          <th className="pb-3">
                            {t('merchant.sync.finance.netRevenue')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {series.map((item, index) => (
                          <tr
                            key={item.index ?? index}
                            className="border-t border-border/50"
                          >
                            <th className="py-2 pr-4 text-left font-medium">
                              {item.label}
                            </th>
                            <td className="py-2">
                              <div className="flex items-center gap-3">
                                <span
                                  aria-hidden="true"
                                  className={`h-2 rounded-full ${item.netRevenue < 0 ? 'bg-red-400' : 'bg-emerald-500'}`}
                                  style={{ width: `${Math.abs(item.netRevenue) / max * 45}%` }}
                                />
                                <span className="whitespace-nowrap font-semibold">
                                  {formatCurrency(item.netRevenue)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    {t('merchant.sync.noRevenue')}
                  </p>
                )}
              </details>
            </div>
          )}
        </>
      )}
    </section>
  )
}
