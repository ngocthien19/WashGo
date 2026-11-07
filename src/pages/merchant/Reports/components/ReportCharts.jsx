import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart3, TrendingUp } from 'lucide-react'
import { formatCurrency, formatNumber } from '~/utils/formats'

function Chart({ title, Icon, points, series, line = false }) {
  const { t, i18n } = useTranslation()
  const [active, setActive] = useState(null)
  const known = points.filter((point) => point.computed)
  const values = known.flatMap((point) => series.map((s) => point[s.key]))
  const min = Math.min(0, ...values), max = Math.max(1, ...values)
  const spread = max - min
  const y = (value) => (max - value) / spread * 208
  const selected = points.find((point) => point.index === active)
  const money = line ? formatCurrency : formatNumber
  const label = (point) => `${point.label}: ${point.computed ? series.map((s) => `${t(s.label)} ${money(point[s.key])}`).join(', ') : t('merchant.reportSync.notComputed')}`
  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Icon
          size={21}
          className="text-primary"
        />
        {t(title)}
      </h2>
      <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
        {series.map((s) => (
          <span
            key={s.key}
            className="flex items-center gap-2"
          >
            <i
              aria-hidden="true"
              className="size-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {t(s.label)}
          </span>
        ))}
      </div>
      <div
        className="mt-5 overflow-x-auto"
        role="group"
        aria-label={t(title)}
        tabIndex={0}
      >
        <div style={{ minWidth: Math.max(520, points.length * 18) }}>
          <div className="relative ml-14 h-52">
            {[0, 1, 2, 3, 4].map((tick) => (
              <div
                key={tick}
                className="pointer-events-none absolute inset-x-0 border-t border-border/60"
                style={{ top: `${tick * 25}%` }}
              >
                <span className="absolute -left-14 -top-2 w-12 text-right text-xs text-muted-foreground">
                  {new Intl.NumberFormat(i18n.resolvedLanguage, { notation: line ? 'compact' : 'standard', maximumFractionDigits: line ? 1 : 0 }).format(max - spread * tick / 4)}
                </span>
              </div>
            ))}
            {line && (
              <svg
                aria-hidden="true"
                viewBox="0 0 1000 208"
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
              >
                {series.map((s) => (
                  <path
                    key={s.key}
                    d={points.map((point, index) => point.computed ? `${index === 0 || !points[index - 1].computed ? 'M' : 'L'}${(index + 0.5) / Math.max(1, points.length) * 1000},${y(point[s.key])}` : '').join(' ')}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="2.5"
                    vectorEffect="non-scaling-stroke"
                    strokeDasharray={s.key === 'previousNetRevenue' ? '5 4' : undefined}
                  />
                ))}
              </svg>
            )}
            <div className="absolute inset-0 flex">
              {points.map((point) => (
                <button
                  key={point.index}
                  type="button"
                  aria-label={label(point)}
                  onMouseEnter={() => setActive(point.index)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(point.index)}
                  onBlur={() => setActive(null)}
                  onClick={() => setActive(point.index)}
                  className="relative min-w-0 flex-1 outline-none hover:bg-primary/5 focus-visible:bg-primary/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                >
                  {point.computed && series.map((s, column) => line ? (
                    <span
                      key={s.key}
                      className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card"
                      style={{ left: '50%', top: y(point[s.key]), backgroundColor: s.color }}
                    />
                  ) : (
                    <span
                      key={s.key}
                      className="absolute w-[30%] rounded-t-sm"
                      style={{ left: `${15 + column * 36}%`, top: Math.min(y(0), y(point[s.key])), height: Math.abs(y(0) - y(point[s.key])), backgroundColor: s.color }}
                    />
                  ))}
                </button>
              ))}
            </div>
          </div>
          <div className="ml-14 mt-2 flex text-center text-xs text-muted-foreground">
            {points.map((point, index) => (
              <span
                key={point.index}
                className="min-w-0 flex-1 whitespace-nowrap"
              >
                {index % Math.max(1, Math.ceil(points.length / 6)) === 0 ? point.label.replace(/\/\d{4}$/, '') : ''}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p
        aria-live="polite"
        className="mt-4 min-h-10 text-sm text-muted-foreground"
      >
        {selected ? label(selected) : t('merchant.reports.chartHint')}
      </p>
      <details className="rounded-xl bg-muted/25 p-3 text-sm">
        <summary className="cursor-pointer font-semibold">
          {t('merchant.reports.viewData')}
        </summary>
        <div className="mt-3 max-h-72 overflow-auto">
          <table className="w-full text-left">
            <caption className="sr-only">
              {t(title)}
            </caption>
            <thead>
              <tr>
                <th className="p-2">
                  {t('merchant.reports.buckets')}
                </th>
                {series.map((s) => (
                  <th
                    key={s.key}
                    className="p-2"
                  >
                    {t(s.label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr
                  key={point.index}
                  className="border-t border-border"
                >
                  <th
                    scope="row"
                    className="p-2 font-medium"
                  >
                    {point.label}
                  </th>
                  {series.map((s) => (
                    <td
                      key={s.key}
                      className="whitespace-nowrap p-2"
                    >
                      {point.computed ? money(point[s.key]) : t('merchant.reportSync.notComputed')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
export default function ReportCharts({ report }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Chart
        title="merchant.reportSync.netChart"
        Icon={TrendingUp}
        points={report.series}
        series={[{ key: 'netRevenue', label: 'merchant.reports.current', color: 'var(--primary)' }, { key: 'previousNetRevenue', label: 'merchant.reports.previous', color: '#a78bfa' }]}
        line
      />
      <Chart
        title="merchant.reports.orderChart"
        Icon={BarChart3}
        points={report.series}
        series={[{ key: 'ordersCreated', label: 'merchant.reportSync.created', color: 'var(--primary)' }, { key: 'ordersCompleted', label: 'merchant.reportSync.completed', color: '#10b981' }]}
      />
    </div>
  )
}
